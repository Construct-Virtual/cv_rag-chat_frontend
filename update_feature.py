#!/usr/bin/env python3
"""Update feature_list.json to mark feature #1 as passing"""
import json

# Read the feature list
with open('feature_list.json', 'r') as f:
    features = json.load(f)

# Update the first feature (index 0) to mark it as passing
features[0]['passes'] = True

# Write back to file
with open('feature_list.json', 'w') as f:
    json.dump(features, f, indent=2)

print("Updated feature #1 to passing!")
print(f"Feature: {features[0]['description']}")
