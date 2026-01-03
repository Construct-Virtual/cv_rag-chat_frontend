import subprocess
import time

# Force kill using taskkill
pid = 14000

try:
    result = subprocess.run(['taskkill', '/F', '/T', '/PID', str(pid)],
                          capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    time.sleep(3)
except Exception as e:
    print(f"Error: {e}")
