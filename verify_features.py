#!/usr/bin/env python3
"""Verify feature_list.json status"""
import json

with open('feature_list.json', 'r') as f:
    features = json.load(f)

total = len(features)
passing = sum(1 for f in features if f['passes'])
remaining = sum(1 for f in features if not f['passes'])

print(f"Total features: {total}")
print(f"Passing: {passing}")
print(f"Remaining: {remaining}")
print(f"\nCategories:")
categories = {}
for f in features:
    cat = f['category']
    categories[cat] = categories.get(cat, 0) + 1

for cat, count in sorted(categories.items()):
    print(f"  {cat}: {count}")
