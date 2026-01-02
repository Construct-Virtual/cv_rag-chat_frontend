import requests
import json

# Test 1: Login as employee (limited access)
print("=== TEST 1: Employee Role (Limited Access) ===")
login_response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"username": "employee", "password": "password123"}
)
employee_data = login_response.json()
employee_token = employee_data["access_token"]
print(f"Logged in as {employee_data['user']['username']} (role: {employee_data['user']['role']})")

# Create conversation
conv_response = requests.post(
    "http://localhost:8000/api/chat/conversations",
    headers={"Authorization": f"Bearer {employee_token}"},
    json={"title": "Employee Query"}
)
conv_id = conv_response.json()["id"]

# Query for compensation info (HR-restricted)
print("\nQuerying for salary compensation information (HR-restricted)...")
query_response = requests.post(
    "http://localhost:8000/api/chat/query",
    headers={"Authorization": f"Bearer {employee_token}"},
    json={"conversation_id": conv_id, "message": "What is the salary compensation policy?"},
    stream=True
)

sources_employee = []
for line in query_response.iter_lines():
    if line and line.startswith(b'data: '):
        data = json.loads(line[6:])
        if data['type'] == 'complete':
            sources_employee = data.get('sources', [])
            break

print(f"Sources returned for employee: {len(sources_employee)}")
for src in sources_employee:
    print(f"  - {src['display_name']} ({src['category']})")

# Test 2: Login as HR (full access)
print("\n=== TEST 2: HR Role (Full Access) ===")
login_response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"username": "hr_manager", "password": "password123"}
)
hr_data = login_response.json()
hr_token = hr_data["access_token"]
print(f"Logged in as {hr_data['user']['username']} (role: {hr_data['user']['role']})")

# Create conversation
conv_response = requests.post(
    "http://localhost:8000/api/chat/conversations",
    headers={"Authorization": f"Bearer {hr_token}"},
    json={"title": "HR Query"}
)
conv_id = conv_response.json()["id"]

# Query for compensation info
print("\nQuerying for salary compensation information (HR should see it)...")
query_response = requests.post(
    "http://localhost:8000/api/chat/query",
    headers={"Authorization": f"Bearer {hr_token}"},
    json={"conversation_id": conv_id, "message": "What is the salary compensation policy?"},
    stream=True
)

sources_hr = []
for line in query_response.iter_lines():
    if line and line.startswith(b'data: '):
        data = json.loads(line[6:])
        if data['type'] == 'complete':
            sources_hr = data.get('sources', [])
            break

print(f"Sources returned for HR: {len(sources_hr)}")
for src in sources_hr:
    print(f"  - {src['display_name']} ({src['category']})")

# Verify role-based filtering
print("\n=== VERIFICATION ===")
hr_confidential = [s for s in sources_hr if 'Confidential' in s['category']]
employee_confidential = [s for s in sources_employee if 'Confidential' in s['category']]

if len(hr_confidential) > 0 and len(employee_confidential) == 0:
    print("✓ PASS: HR can access confidential docs, employee cannot")
else:
    print(f"✗ FAIL: HR confidential={len(hr_confidential)}, Employee confidential={len(employee_confidential)}")
