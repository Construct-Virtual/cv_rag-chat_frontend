"""Test config loading"""
try:
    from app.config import settings
    print(f"Config loaded successfully!")
    print(f"JWT Secret: {settings.jwt_secret_key[:20]}...")
    print(f"JWT Algorithm: {settings.jwt_algorithm}")
    print(f"Access Token Expire: {settings.jwt_access_token_expire_minutes} minutes")
except Exception as e:
    print(f"Error loading config: {e}")
    import traceback
    traceback.print_exc()
