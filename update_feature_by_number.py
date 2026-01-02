#!/usr/bin/env python3
"""Update feature_list.json to mark a specific feature as passing"""
import json
import sys

if len(sys.argv) < 2:
    print("Usage: python update_feature_by_number.py <feature_number>")
    sys.exit(1)

feature_num = int(sys.argv[1])

# Read the feature list
with open('feature_list.json', 'r') as f:
    data = json.load(f)
    features = data if isinstance(data, list) else data.get('features', [])

# Find and update the feature by number (1-indexed as displayed to users)
feature_index = feature_num - 1

if 0 <= feature_index < len(features):
    features[feature_index]['passes'] = True
    
    # Write back to file
    output = features if isinstance(data, list) else data
    with open('feature_list.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Updated feature #{feature_num} to passing!")
    print(f"Feature: {features[feature_index]['description']}")
else:
    print(f"Feature #{feature_num} not found. Valid range: 1-{len(features)}")
    sys.exit(1)
