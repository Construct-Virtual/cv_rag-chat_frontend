"""List all routes in the running FastAPI app"""
import sys
sys.path.insert(0, 'backend')

# Set minimal env vars to allow import
import os
os.environ.setdefault('SUPABASE_URL', 'http://localhost')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'dummy')
os.environ.setdefault('OPENAI_API_KEY', 'dummy')
os.environ.setdefault('JWT_SECRET_KEY', 'dummy')

from app.main import app

print("\n===== All routes in FastAPI app =====")
print(f"Total routes: {len(app.routes)}")
print("\nChat routes:")
for route in app.routes:
    if hasattr(route, 'path') and '/chat/' in route.path:
        if hasattr(route, 'methods'):
            methods = ','.join(route.methods) if route.methods else 'N/A'
            print(f"  {methods:10} {route.path}")
print("=====================================\n")
