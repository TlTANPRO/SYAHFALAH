#!/usr/bin/env python3
"""
Seed KPI Targets, Tasks, and KPI Actuals for Syahfalah Dashboard
"""
import os
import json
import httpx
import uuid
from datetime import datetime, timedelta, date
import random

# Supabase config
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wzwyiasnjzgnlmphqgkj.supabase.co")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

client = httpx.Client(base_url=f"{SUPABASE_URL}/rest/v1", headers=headers, timeout=30.0)

# ============================================================
# FETCH EXISTING DATA
# ============================================================
print("Fetching existing data...")
divisions = client.get("/divisions?select=id,code,name").json()
users = client.get("/users?select=id,full_name,role,division_id").json()
kpi_defs = client.get("/kpi_definitions?select=id,code,name,level,division_id,target_value,target_period").json()
sow_tasks = client.get("/sow_tasks?select=id,code,title,division_id,pic_user_id").json()

print(f"  Divisions: {len(divisions)}")
print(f"  Users: {len(users)}")
print(f"  KPI Definitions: {len(kpi_defs)}")
print(f"  SOW Tasks: {len(sow_tasks)}")

# Map for quick lookup
div_by_code = {d['code']: d for d in divisions}
div_by_id = {d['id']: d for d in divisions}
user_by_id = {u['id']: u for u in users}
kpi_by_id = {k['id']: k for k in kpi_defs}
kpi_by_code = {k['code']: k for k in kpi_defs}
sow_by_id = {s['id']: s for s in sow_tasks}

# ============================================================
# SEED KPI_TARGETS - Monthly targets for 2025-01 to 2025-12
# ============================================================
print("\n=== SEEDING KPI_TARGETS ===")

periods = [f"2025-{m:02d}" for m in range(1, 13)]
kpi_targets_to_insert = []

for kpi in kpi_defs:
    kpi_id = kpi['id']
    base_target = float(kpi['target_value'])
    level = kpi['level']
    division_id = kpi['division_id']
    
    for period in periods:
        # Add some monthly variation (±10%)
        variation = random.uniform(0.9, 1.1)
        target_value = round(base_target * variation, 2)
        
        kpi_targets_to_insert.append({
            "id": str(uuid.uuid4()),
            "kpi_definition_id": kpi_id,
            "period": period,
            "target_value": target_value,
            "division_id": division_id,
            "user_id": None,  # Personal KPIs handled separately
            "status": "active",
            "approved_by": None,
            "approved_at": None
        })

# Personal KPIs - assign to specific users
personal_kpis = [k for k in kpi_defs if k['level'] == 'personal']
for kpi in personal_kpis:
    # Find the user this personal KPI belongs to
    for user in users:
        if user['division_id'] == kpi['division_id'] and user['role'] == 'staff':
            # Check if user name matches KPI code pattern
            kpi_name = kpi['code'].replace('KPI-PER-', '').upper()
            user_name = user['full_name'].upper()
            if kpi_name in user_name or user_name in kpi_name:
                for period in periods:
                    variation = random.uniform(0.9, 1.1)
                    target_value = round(float(kpi['target_value']) * variation, 2)
                    kpi_targets_to_insert.append({
                        "id": str(uuid.uuid4()),
                        "kpi_definition_id": kpi['id'],
                        "period": period,
                        "target_value": target_value,
                        "division_id": kpi['division_id'],
                        "user_id": user['id'],
                        "status": "active",
                        "approved_by": None,
                        "approved_at": None
                    })
                break

print(f"Inserting {len(kpi_targets_to_insert)} KPI targets...")
# Insert in batches
batch_size = 100
for i in range(0, len(kpi_targets_to_insert), batch_size):
    batch = kpi_targets_to_insert[i:i+batch_size]
    resp = client.post("/kpi_targets", json=batch)
    if resp.status_code not in (200, 201):
        print(f"  Error batch {i//batch_size}: {resp.status_code} - {resp.text}")
    else:
        print(f"  Batch {i//batch_size + 1}/{(len(kpi_targets_to_insert)-1)//batch_size + 1} inserted")

# ============================================================
# FETCH CREATED KPI_TARGETS
# ============================================================
kpi_targets = client.get("/kpi_targets?select=id,kpi_definition_id,period,division_id,user_id").json()
print(f"Total KPI Targets in DB: {len(kpi_targets)}")
kpi_target_by_def_period = {}
for kt in kpi_targets:
    key = (kt['kpi_definition_id'], kt['period'], kt['division_id'], kt['user_id'])
    kpi_target_by_def_period[key] = kt['id']

# ============================================================
# SEED TASKS - Personal daily/weekly/monthly tasks for 13 users
# ============================================================
print("\n=== SEEDING TASKS ===")

# Task templates per role/division
task_templates = {
    'owner': [
        {"title": "Strategic Review Meeting", "type": "weekly_target", "priority": "high", "est_hours": 2},
        {"title": "Financial Performance Review", "type": "monthly_target", "priority": "high", "est_hours": 3},
        {"title": "Board Communication", "type": "weekly_target", "priority": "medium", "est_hours": 1},
        {"title": "Company Vision Alignment", "type": "monthly_target", "priority": "high", "est_hours": 2},
    ],
    'kepala_kantor': [
        {"title": "Daily Operations Standup", "type": "daily_routine", "priority": "high", "est_hours": 1},
        {"title": "Weekly Division Coordination", "type": "weekly_target", "priority": "high", "est_hours": 2},
        {"title": "Monthly Report Compilation", "type": "monthly_target", "priority": "high", "est_hours": 4},
        {"title": "Staff Performance Check-ins", "type": "weekly_target", "priority": "medium", "est_hours": 2},
        {"title": "Resource Allocation Review", "type": "monthly_target", "priority": "medium", "est_hours": 2},
    ],
    'pic_divisi': [
        {"title": "Daily Team Sync", "type": "daily_routine", "priority": "high", "est_hours": 1},
        {"title": "SOW Progress Tracking", "type": "weekly_target", "priority": "high", "est_hours": 2},
        {"title": "KPI Target Review", "type": "weekly_target", "priority": "high", "est_hours": 1},
        {"title": "Monthly Division Report", "type": "monthly_target", "priority": "high", "est_hours": 3},
        {"title": "Cross-division Coordination", "type": "weekly_target", "priority": "medium", "est_hours": 2},
    ],
    'staff': [
        {"title": "Daily Task Execution", "type": "daily_routine", "priority": "high", "est_hours": 4},
        {"title": "Weekly Progress Update", "type": "weekly_target", "priority": "medium", "est_hours": 1},
        {"title": "Skill Development", "type": "weekly_target", "priority": "low", "est_hours": 2},
        {"title": "Monthly Self-assessment", "type": "monthly_target", "priority": "medium", "est_hours": 1},
    ]
}

# Division-specific task additions
division_tasks = {
    'MARKETING': [
        {"title": "Social Media Content Creation", "type": "daily_routine", "priority": "high", "est_hours": 2},
        {"title": "Campaign Performance Analysis", "type": "weekly_target", "priority": "high", "est_hours": 2},
        {"title": "Lead Generation Activities", "type": "daily_routine", "priority": "high", "est_hours": 3},
    ],
    'FINANCE': [
        {"title": "Transaction Processing", "type": "daily_routine", "priority": "high", "est_hours": 3},
        {"title": "Reconciliation Review", "type": "weekly_target", "priority": "high", "est_hours": 2},
        {"title": "Budget Monitoring", "type": "weekly_target", "priority": "medium", "est_hours": 1},
    ],
    'CONSTRUCTION': [
        {"title": "Site Inspection", "type": "daily_routine", "priority": "high", "est_hours": 3},
        {"title": "Progress Documentation", "type": "daily_routine", "priority": "high", "est_hours": 1},
        {"title": "Safety Compliance Check", "type": "weekly_target", "priority": "critical", "est_hours": 2},
    ],
    'MAINTENANCE': [
        {"title": "Preventive Maintenance Checks", "type": "daily_routine", "priority": "high", "est_hours": 3},
        {"title": "Emergency Response Readiness", "type": "daily_routine", "priority": "critical", "est_hours": 1},
        {"title": "Equipment Log Updates", "type": "weekly_target", "priority": "medium", "est_hours": 1},
    ],
    'MEDIA': [
        {"title": "Content Production", "type": "daily_routine", "priority": "high", "est_hours": 4},
        {"title": "Design Review & Iteration", "type": "weekly_target", "priority": "high", "est_hours": 2},
        {"title": "Asset Library Management", "type": "weekly_target", "priority": "medium", "est_hours": 1},
    ],
    'PURCHASING': [
        {"title": "Vendor Communication", "type": "daily_routine", "priority": "high", "est_hours": 2},
        {"title": "Purchase Order Processing", "type": "daily_routine", "priority": "high", "est_hours": 2},
        {"title": "Cost Analysis Report", "type": "weekly_target", "priority": "medium", "est_hours": 2},
    ],
}

tasks_to_insert = []
start_date = date(2025, 1, 1)
end_date = date(2025, 12, 31)

for user in users:
    user_id = user['id']
    role = user['role']
    division_id = user['division_id']
    division_name = div_by_id.get(division_id, {}).get('code', 'UNKNOWN') if division_id else 'COMPANY'
    
    # Get SOW tasks for this user's division
    user_sow_tasks = [s for s in sow_tasks if s['division_id'] == division_id] if division_id else []
    
    # Base templates for role
    templates = task_templates.get(role, task_templates['staff'])
    # Add division-specific
    if division_name in division_tasks:
        templates = templates + division_tasks[division_name]
    
    # Generate tasks for each month
    current_date = start_date
    while current_date <= end_date:
        month_start = date(current_date.year, current_date.month, 1)
        if current_date.month == 12:
            month_end = date(current_date.year, 12, 31)
        else:
            month_end = date(current_date.year, current_date.month + 1, 1) - timedelta(days=1)
        
        # Daily routines - every weekday
        for day_offset in range((month_end - month_start).days + 1):
            task_date = month_start + timedelta(days=day_offset)
            if task_date.weekday() < 5:  # Mon-Fri
                for template in [t for t in templates if t['type'] == 'daily_routine']:
                    # 80% chance to create daily task
                    if random.random() < 0.8:
                        tasks_to_insert.append({
                            "id": str(uuid.uuid4()),
                            "title": template['title'],
                            "description": f"Daily routine: {template['title']}",
                            "type": "daily_routine",
                            "status": random.choice(['pending', 'in_progress', 'completed']) if task_date < date.today() else 'pending',
                            "priority": template['priority'],
                            "user_id": user_id,
                            "division_id": division_id,
                            "sow_task_id": random.choice(user_sow_tasks)['id'] if user_sow_tasks and random.random() < 0.3 else None,
                            "kpi_target_id": None,
                            "scheduled_date": task_date.isoformat(),
                            "due_date": f"{task_date.isoformat()} 17:00:00+00",
                            "completed_at": f"{task_date.isoformat()} 16:00:00+00" if task_date < date.today() and random.random() < 0.7 else None,
                            "estimated_hours": template['est_hours'],
                            "actual_hours": round(template['est_hours'] * random.uniform(0.8, 1.2), 1) if task_date < date.today() else None,
                            "is_carry_over": False,
                            "carry_over_from": None,
                            "parent_task_id": None,
                            "sort_order": 0
                        })
        
        # Weekly targets - once per week
        week_starts = []
        d = month_start
        while d <= month_end:
            if d.weekday() == 0:  # Monday
                week_starts.append(d)
            d += timedelta(days=1)
        
        for week_start in week_starts:
            for template in [t for t in templates if t['type'] == 'weekly_target']:
                if random.random() < 0.9:
                    due_date = week_start + timedelta(days=4)  # Friday
                    tasks_to_insert.append({
                        "id": str(uuid.uuid4()),
                        "title": template['title'],
                        "description": f"Weekly target: {template['title']}",
                        "type": "weekly_target",
                        "status": random.choice(['pending', 'in_progress', 'completed']) if due_date < date.today() else 'pending',
                        "priority": template['priority'],
                        "user_id": user_id,
                        "division_id": division_id,
                        "sow_task_id": random.choice(user_sow_tasks)['id'] if user_sow_tasks and random.random() < 0.4 else None,
                        "kpi_target_id": None,
                        "scheduled_date": week_start.isoformat(),
                        "due_date": f"{due_date.isoformat()} 17:00:00+00",
                        "completed_at": f"{due_date.isoformat()} 15:00:00+00" if due_date < date.today() and random.random() < 0.7 else None,
                        "estimated_hours": template['est_hours'],
                        "actual_hours": round(template['est_hours'] * random.uniform(0.8, 1.2), 1) if due_date < date.today() else None,
                        "is_carry_over": False,
                        "carry_over_from": None,
                        "parent_task_id": None,
                        "sort_order": 0
                    })
        
        # Monthly targets - once per month
        for template in [t for t in templates if t['type'] == 'monthly_target']:
            if random.random() < 0.9:
                due_date = month_end
                tasks_to_insert.append({
                    "id": str(uuid.uuid4()),
                    "title": template['title'],
                    "description": f"Monthly target: {template['title']}",
                    "type": "monthly_target",
                    "status": random.choice(['pending', 'in_progress', 'completed']) if due_date < date.today() else 'pending',
                    "priority": template['priority'],
                    "user_id": user_id,
                    "division_id": division_id,
                    "sow_task_id": random.choice(user_sow_tasks)['id'] if user_sow_tasks and random.random() < 0.3 else None,
                    "kpi_target_id": None,
                    "scheduled_date": month_start.isoformat(),
                    "due_date": f"{due_date.isoformat()} 17:00:00+00",
                    "completed_at": f"{due_date.isoformat()} 14:00:00+00" if due_date < date.today() and random.random() < 0.6 else None,
                    "estimated_hours": template['est_hours'],
                    "actual_hours": round(template['est_hours'] * random.uniform(0.8, 1.2), 1) if due_date < date.today() else None,
                    "is_carry_over": False,
                    "carry_over_from": None,
                    "parent_task_id": None,
                    "sort_order": 0
                })
        
        # Move to next month
        if current_date.month == 12:
            break
        current_date = date(current_date.year, current_date.month + 1, 1)

print(f"Generated {len(tasks_to_insert)} tasks. Inserting...")
# Insert in batches
batch_size = 200
for i in range(0, len(tasks_to_insert), batch_size):
    batch = tasks_to_insert[i:i+batch_size]
    resp = client.post("/tasks", json=batch)
    if resp.status_code not in (200, 201):
        print(f"  Error batch {i//batch_size}: {resp.status_code} - {resp.text[:200]}")
    else:
        print(f"  Batch {i//batch_size + 1}/{(len(tasks_to_insert)-1)//batch_size + 1} inserted")

# ============================================================
# SEED KPI_ACTUALS - Sample actual values
# ============================================================
print("\n=== SEEDING KPI_ACTUALS ===")

kpi_targets = client.get("/kpi_targets?select=id,kpi_definition_id,period,target_value,division_id,user_id").json()
print(f"KPI Targets to create actuals for: {len(kpi_targets)}")

kpi_actuals_to_insert = []
for kt in kpi_targets:
    # Only create actuals for past/current months (up to current month)
    period = kt['period']
    try:
        period_date = datetime.strptime(period + "-01", "%Y-%m-%d").date()
        if period_date <= date.today().replace(day=1):
            # Generate actual value with some variance from target
            target_val = float(kt['target_value'])
            # Achievement rate: 70-120%
            achievement = random.uniform(0.7, 1.2)
            actual_val = round(target_val * achievement, 2)
            
            # Find a user in the same division to record
            recorder_id = None
            if kt['user_id']:
                recorder_id = kt['user_id']
            elif kt['division_id']:
                div_users = [u for u in users if u['division_id'] == kt['division_id']]
                if div_users:
                    recorder_id = random.choice(div_users)['id']
            
            if recorder_id:
                kpi_actuals_to_insert.append({
                    "id": str(uuid.uuid4()),
                    "kpi_target_id": kt['id'],
                    "actual_value": actual_val,
                    "recorded_by": recorder_id,
                    "recorded_at": f"{period}-{random.randint(1,28):02d} 10:00:00+00",
                    "evidence_urls": [],
                    "notes": f"Actual recorded for {period}",
                    "is_verified": random.random() < 0.6,
                    "verified_by": None,
                    "verified_at": None
                })
    except Exception as e:
        print(f"  Skipping period {period}: {e}")

print(f"Generated {len(kpi_actuals_to_insert)} KPI actuals. Inserting...")
batch_size = 100
for i in range(0, len(kpi_actuals_to_insert), batch_size):
    batch = kpi_actuals_to_insert[i:i+batch_size]
    resp = client.post("/kpi_actuals", json=batch)
    if resp.status_code not in (200, 201):
        print(f"  Error batch {i//batch_size}: {resp.status_code} - {resp.text[:200]}")
    else:
        print(f"  Batch {i//batch_size + 1}/{(len(kpi_actuals_to_insert)-1)//batch_size + 1} inserted")

# ============================================================
# VERIFICATION
# ============================================================
print("\n=== VERIFICATION ===")
for table in ['kpi_targets', 'tasks', 'kpi_actuals']:
    resp = client.get(f"/{table}?select=count", headers={"Prefer": "count=exact"})
    count = resp.headers.get('content-range', '0').split('/')[-1] if 'content-range' in resp.headers else 'unknown'
    print(f"  {table}: {count} records")

print("\n✅ Seeding complete!")