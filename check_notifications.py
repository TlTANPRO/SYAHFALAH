import httpx
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

headers = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
}

client = httpx.Client(base_url=f'{SUPABASE_URL}/rest/v1', headers=headers, timeout=30.0)
resp = client.get('/notifications?select=id,user_id,type,title,created_at&type=eq.morning_briefing&order=created_at.desc&limit=20')
print(f'Status: {resp.status_code}')
data = resp.json()
print(f'Count: {len(data)}')
for n in data:
    print(f'  {n["user_id"]} - {n["title"]} - {n["created_at"]}')