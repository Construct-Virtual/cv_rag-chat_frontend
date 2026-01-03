import sys
sys.path.insert(0, 'backend')

try:
    from app.routers import chat

    print(f"Router object: {chat.router}")
    print(f"\nNumber of routes: {len(chat.router.routes)}")
    print("\nAll routes:")
    for route in chat.router.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = ','.join(route.methods) if route.methods else 'N/A'
            print(f"  {methods:10} {route.path}")
except Exception as e:
    print(f"Error importing: {e}")
    import traceback
    traceback.print_exc()
