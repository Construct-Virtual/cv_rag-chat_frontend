import json

with open('openapi_temp.json') as f:
    data = json.load(f)

paths = sorted(data['paths'].keys())
for path in paths:
    print(path)
