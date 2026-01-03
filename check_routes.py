import sys
sys.path.insert(0, 'backend')
from app.routers import chat
routes = [r.path for r in chat.router.routes]
for route in routes:
    if 'message' in route:
        print(route)
