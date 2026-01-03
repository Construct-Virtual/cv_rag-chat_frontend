import json

with open('feature_list.json') as f:
    data = json.load(f)

print("Feature 22:")
print(json.dumps(data[21], indent=2))
print("\nFeature 23:")
print(json.dumps(data[22], indent=2))
