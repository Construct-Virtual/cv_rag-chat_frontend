import json
import sys

feature_num = int(sys.argv[1]) if len(sys.argv) > 1 else 19

with open('feature_list.json', 'r') as f:
    data = json.load(f)
    
if 0 < feature_num <= len(data):
    feat = data[feature_num - 1]
    print(f"Feature #{feature_num}: {feat['description']}")
    print(f"Category: {feat['category']}")
    print(f"Passes: {feat['passes']}")
    print("\nSteps:")
    for i, step in enumerate(feat['steps'], 1):
        print(f"  {i}. {step}")
else:
    print(f"Feature #{feature_num} not found")
