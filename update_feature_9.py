import json

with open('feature_list.json', 'r') as f:
    features = json.load(f)

# Find and update the token refresh feature
for i, feature in enumerate(features):
    if 'Access token automatically refreshes' in feature['description']:
        features[i]['passes'] = True
        print(f"Updated feature #{i+1}: {feature['description']}")
        break

with open('feature_list.json', 'w') as f:
    json.dump(features, f, indent=2)
