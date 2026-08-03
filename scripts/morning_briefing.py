#!/usr/bin/env python3
"""
Morning Briefing Cron Job for Syahfalah Dashboard
Runs daily at 07:00 to send notifications via Web Push / WhatsApp
"""
import os
import sys
import json
import httpx
from datetime import datetime, date, timedelta
from collections import defaultdict

# Add project to path
sys.path.insert(0, '/data/data/com.termux/files/home/syahfalah-dashboard')

# Load environment
from dotenv import load_dotenv
load_dotenv('/data/data/com.termux/files/home/syahfalah-dashboard/.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY')
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY')
VAPID_SUBJECT = os.getenv('VAPID_SUBJECT')

if not all([SUPABASE_URL, SERVICE_ROLE_KEY]):
    print("Missing required Supabase credentials")
    sys.exit(1)

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

client = httpx.Client(base_url=f"{SUPABASE_URL}/rest/v1", headers=headers, timeout=30.0)

def get_today_date():
    return date.today().isoformat()

def get_week_range():
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday
    week_end = week_start + timedelta(days=6)  # Sunday
    return week_start, week_end

def fetch_users():
    resp = client.get("/users?select=id,full_name,role,division_id,vapid_subscription,phone&is_active=eq.true")
    return resp.json() if resp.status_code == 200 else []

def fetch_divisions():
    resp = client.get("/divisions?select=id,code,name&is_active=eq.true")
    return resp.json() if resp.status_code == 200 else []

def fetch_today_tasks(user_id):
    today = get_today_date()
    resp = client.get(f"/tasks?select=id,title,type,priority,status,sow_task_id&user_id=eq.{user_id}&scheduled_date=eq.{today}")
    return resp.json() if resp.status_code == 200 else []

def fetch_week_tasks(user_id):
    week_start, week_end = get_week_range()
    resp = client.get(f"/tasks?select=id,title,type,priority,status,scheduled_date&user_id=eq.{user_id}&scheduled_date=gte.{week_start}&scheduled_date=lte.{week_end}")
    return resp.json() if resp.status_code == 200 else []

def fetch_kpi_targets_for_user(user_id, division_id):
    today = get_today_date()
    period = today[:7]  # YYYY-MM
    # Get user's personal KPI targets
    resp = client.get(f"/kpi_targets?select=id,kpi_definition_id,target_value&user_id=eq.{user_id}&period=eq.{period}&status=eq.active")
    user_targets = resp.json() if resp.status_code == 200 else []
    
    # Get division KPI targets (for PIC/division heads)
    div_targets = []
    if division_id:
        resp = client.get(f"/kpi_targets?select=id,kpi_definition_id,target_value&division_id=eq.{division_id}&period=eq.{period}&status=eq.active")
        div_targets = resp.json() if resp.status_code == 200 else []
    
    return user_targets + div_targets

def fetch_kpi_actuals(target_ids):
    if not target_ids:
        return []
    ids_str = ",".join(f"'{tid}'" for tid in target_ids)
    resp = client.get(f"/kpi_actuals?select=kpi_target_id,actual_value,is_verified&in=kpi_target_id.({ids_str})")
    return resp.json() if resp.status_code == 200 else []

def fetch_sow_tasks(division_id):
    if not division_id:
        return []
    resp = client.get(f"/sow_tasks?select=id,code,title,status,progress&division_id=eq.{division_id}&status=in.(planned,in_progress)")
    return resp.json() if resp.status_code == 200 else []

def fetch_notifications(user_id):
    resp = client.get(f"/notifications?select=id,type,title,message,priority,is_read,created_at&user_id=eq.{user_id}&is_read=eq.false&order=created_at.desc&limit=10")
    return resp.json() if resp.status_code == 200 else []

def generate_briefing(user, divisions_map, all_users_map):
    user_id = user['id']
    full_name = user['full_name']
    role = user['role']
    division_id = user['division_id']
    
    today = get_today_date()
    today_tasks = fetch_today_tasks(user_id)
    week_tasks = fetch_week_tasks(user_id)
    kpi_targets = fetch_kpi_targets_for_user(user_id, division_id)
    target_ids = [kt['id'] for kt in kpi_targets]
    kpi_actuals = fetch_kpi_actuals(target_ids)
    sow_tasks = fetch_sow_tasks(division_id)
    notifications = fetch_notifications(user_id)
    
    # Build KPI summary
    kpi_summary = []
    for kt in kpi_targets:
        actual = next((a for a in kpi_actuals if a['kpi_target_id'] == kt['id']), None)
        if actual:
            target_val = float(kt['target_value'])
            actual_val = float(actual['actual_value'])
            pct = round((actual_val / target_val * 100), 1) if target_val > 0 else 0
            status = "🟢" if pct >= 80 else "🟡" if pct >= 60 else "🔴"
            kpi_summary.append({
                "status": status,
                "target": target_val,
                "actual": actual_val,
                "pct": pct,
                "verified": actual['is_verified']
            })
    
    # Count tasks by status
    task_stats = defaultdict(int)
    for t in today_tasks:
        task_stats[t['status']] += 1
    for t in week_tasks:
        task_stats[f"week_{t['status']}"] += 1
    
    # Unread notifications
    unread_count = len(notifications)
    urgent_notifs = [n for n in notifications if n['priority'] in ('high', 'urgent')]
    
    # Division name
    div_name = divisions_map.get(division_id, {}).get('name', 'N/A') if division_id else 'Company Level'
    
    briefing = {
        "user_id": user_id,
        "full_name": full_name,
        "role": role,
        "division": div_name,
        "date": today,
        "tasks": {
            "today_total": len(today_tasks),
            "today_pending": task_stats.get('pending', 0),
            "today_in_progress": task_stats.get('in_progress', 0),
            "today_completed": task_stats.get('completed', 0),
            "week_total": len(week_tasks),
            "week_pending": task_stats.get('week_pending', 0),
            "week_completed": task_stats.get('week_completed', 0),
        },
        "kpis": kpi_summary,
        "sow_progress": [
            {"code": s['code'], "title": s['title'], "status": s['status'], "progress": s['progress']}
            for s in sow_tasks[:5]
        ],
        "notifications": {
            "unread": unread_count,
            "urgent": len(urgent_notifs),
            "latest": notifications[:3]
        }
    }
    
    return briefing

def format_briefing_message(briefing):
    """Format briefing for display"""
    lines = []
    lines.append(f"🌅 **MORNING BRIEFING - {briefing['date']}**")
    lines.append(f"👤 {briefing['full_name']} ({briefing['role'].replace('_', ' ').title()})")
    lines.append(f"🏢 {briefing['division']}")
    lines.append("")
    
    # Tasks
    t = briefing['tasks']
    lines.append("📋 **TASKS**")
    lines.append(f"  Today: {t['today_total']} total | ✅ {t['today_completed']} done | 🔄 {t['today_in_progress']} in progress | ⏳ {t['today_pending']} pending")
    lines.append(f"  This Week: {t['week_total']} total | ✅ {t['week_completed']} done | ⏳ {t['week_pending']} pending")
    lines.append("")
    
    # KPIs
    if briefing['kpis']:
        lines.append("📊 **KPI PROGRESS**")
        for kpi in briefing['kpis']:
            lines.append(f"  {kpi['status']} Target: {kpi['target']:,.0f} | Actual: {kpi['actual']:,.0f} | {kpi['pct']}% {'✓' if kpi['verified'] else '⏳'}")
    else:
        lines.append("📊 **KPI PROGRESS** - No targets for this period")
    lines.append("")
    
    # SOW Progress
    if briefing['sow_progress']:
        lines.append("🎯 **SOW PROGRESS**")
        for s in briefing['sow_progress']:
            lines.append(f"  {s['code']}: {s['title'][:40]}... [{s['progress']}%] ({s['status']})")
    lines.append("")
    
    # Notifications
    n = briefing['notifications']
    if n['unread'] > 0:
        lines.append(f"🔔 **NOTIFICATIONS** - {n['unread']} unread ({n['urgent']} urgent)")
        for notif in n['latest']:
            lines.append(f"  • {notif['title']}")
    else:
        lines.append("🔔 **NOTIFICATIONS** - All caught up!")
    
    return "\n".join(lines)

def send_web_push(subscription, message):
    """Send web push notification using VAPID"""
    if not subscription:
        return False, "No subscription"
    
    try:
        from pywebpush import webpush, WebPushException
        
        webpush(
            subscription_info=subscription,
            data=json.dumps({"title": "Syahfalah Dashboard", "body": message[:200]}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT}
        )
        return True, "Sent"
    except ImportError:
        return False, "pywebpush not installed"
    except Exception as e:
        return False, str(e)

def create_notification_record(user_id, briefing):
    """Create in-app notification record"""
    today = briefing['date']
    payload = {
        "user_id": user_id,
        "type": "morning_briefing",
        "title": f"Morning Briefing - {today}",
        "message": format_briefing_message(briefing),
        "priority": "normal",
        "channels": ["in_app"],
        "action_url": "/dashboard"
    }
    resp = client.post("/notifications", json=payload)
    return resp.status_code in (200, 201)

def main():
    print(f"=== MORNING BRIEFING - {datetime.now().isoformat()} ===")
    
    users = fetch_users()
    divisions = fetch_divisions()
    divisions_map = {d['id']: d for d in divisions}
    
    print(f"Processing {len(users)} active users...")
    
    for user in users:
        try:
            briefing = generate_briefing(user, divisions_map, {})
            message = format_briefing_message(briefing)
            
            # Create in-app notification
            create_notification_record(user['id'], briefing)
            
            # Send web push if subscribed
            vapid_sub = user.get('vapid_subscription')
            if vapid_sub:
                success, msg = send_web_push(vapid_sub, message)
                print(f"  {user['full_name']}: Push - {msg}")
            else:
                print(f"  {user['full_name']}: In-app notification created")
                
        except Exception as e:
            print(f"  Error for {user['full_name']}: {e}")
    
    print("=== MORNING BRIEFING COMPLETE ===")

if __name__ == "__main__":
    main()