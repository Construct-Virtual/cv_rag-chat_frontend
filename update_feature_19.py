import json

with open('feature_list.json', 'r') as f:
    features = json.load(f)

# Feature #19 is at index 18 (0-based)
features[18]['passes'] = True

with open('feature_list.json', 'w') as f:
    json.dump(features, f, indent=2)

print("Feature #19 marked as passing")
