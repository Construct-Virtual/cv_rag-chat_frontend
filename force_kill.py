import os
import signal

# Force kill remaining process
pid = 14000

try:
    os.kill(pid, signal.SIGKILL)  # SIGKILL instead of SIGTERM
    print(f"Force killed process {pid}")
except ProcessLookupError:
    print(f"Process {pid} not found")
except Exception as e:
    print(f"Error: {e}")
