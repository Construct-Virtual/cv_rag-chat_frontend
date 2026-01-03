import json

with open('openapi_8002.json') as f:
    data = json.load(f)

print("All registered API paths with methods:")
print("=" * 60)
count = 0
for path in sorted(data['paths'].keys()):
    path_data = data['paths'][path]
    for method in path_data.keys():
        if method in ['get', 'post', 'put', 'patch', 'delete']:
            count += 1
            print(f"{method.upper():7} {path}")

print("=" * 60)
print(f"Total endpoints: {count}")
