import json

with open('feature_list.json', 'r') as f:
    features = json.load(f)

print("PASSING FEATURES:")
passing = [f for f in features if f.get('passes', False)]
for i, f in enumerate(passing, 1):
    desc = f.get('description', 'No description')
    print(f"  {i}. {desc}")

print(f"\nTotal Passing: {len(passing)}")
print(f"Total Failing: {len([f for f in features if not f.get('passes', False)])}")

print("\n\nNEXT 10 FAILING FEATURES:")
failing = [f for f in features if not f.get('passes', False)]
for i, f in enumerate(failing[:10], 1):
    desc = f.get('description', 'No description')
    print(f"  {i}. {desc}")
