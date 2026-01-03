import json

with open('feature_list.json', 'r') as f:
    features = json.load(f)

# Feature #20 is at index 19
features[19]['passes'] = True

with open('feature_list.json', 'w') as f:
    json.dump(features, f, indent=2)

print("Feature #20 marked as passing")
