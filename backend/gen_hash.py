"""Generate password hash"""
from app.utils.auth import hash_password

password = "password123"
hashed = hash_password(password)
print(f"Password: {password}")
print(f"Hash: {hashed}")
