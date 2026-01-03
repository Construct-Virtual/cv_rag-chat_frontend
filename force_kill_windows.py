import subprocess

# Force kill using Windows taskkill
pid = 14000

try:
    result = subprocess.run(['taskkill', '/F', '/PID', str(pid)],
                          capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
except Exception as e:
    print(f"Error: {e}")
