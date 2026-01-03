import json

with open('openapi_new.json') as f:
    data = json.load(f)

print("All registered API paths:")
print("=" * 60)
for path in sorted(data['paths'].keys()):
    methods = list(data['paths'][path].keys())
    for method in methods:
        if method != 'parameters':
            print(f"{method.upper():7} {path}")
