import os
import signal

# Kill specific PIDs that are holding port 8000
pids = [70268, 14000]

for pid in pids:
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"Killed process {pid}")
    except ProcessLookupError:
        print(f"Process {pid} not found")
    except PermissionError:
        print(f"Permission denied for process {pid}")
    except Exception as e:
        print(f"Error killing {pid}: {e}")
