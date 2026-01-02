#!/usr/bin/env python3
import json

# Read the feature list
with open('feature_list.json', 'r') as f:
    features = json.load(f)

# Find and update the delete conversation feature
for i, feature in enumerate(features):
    if 'delete a conversation with confirmation' in feature['description'].lower():
        feature['passes'] = True
        print(f"Updated feature #{i+1}: {feature['description']}")
        break

# Write back to file
with open('feature_list.json', 'w') as f:
    json.dump(features, f, indent=2)

print("Feature list updated!")
