import os
import signal
import time

# Kill both backend processes
pids = [38352, 14000]

for pid in pids:
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"Killed process {pid}")
    except ProcessLookupError:
        print(f"Process {pid} not found")
    except Exception as e:
        print(f"Error killing {pid}: {e}")

time.sleep(2)
print("Done")
