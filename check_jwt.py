import jwt
print("PyJWT version:", jwt.__version__)
print("\nAvailable exceptions:")
for attr in dir(jwt):
    if 'Error' in attr or 'Exception' in attr:
        print(f"  - jwt.{attr}")
