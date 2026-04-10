import subprocess
import time
import os
import sys

services = [
    {"name": "User Service",         "cmd": ["python", "user/app.py"],         "port": 5004},
    {"name": "Movie Service",        "cmd": ["python", "movie/app.py"],        "port": 5001},
    {"name": "Booking Service",      "cmd": ["python", "booking/app.py"],      "port": 5002},
    {"name": "Payment Service",      "cmd": ["python", "payment/app.py"],      "port": 5003},
    {"name": "Notification Service", "cmd": ["python", "notification/app.py"], "port": "N/A"},
    {"name": "API Gateway",          "cmd": ["python", "gateway/app.py"],      "port": 5005},
]

processes = []

def start_services():
    print("Starting the entire system...")
    print("---------------------------------------")
    
    cwd = os.path.dirname(os.path.abspath(__file__))

    for service in services:
        print(f"   - Starting {service['name']}...")
        cmd = service["cmd"][:]
        if cmd[0] == "python":
            cmd[0] = sys.executable
        p = subprocess.Popen(cmd, cwd=cwd)
        processes.append(p)
        time.sleep(1) 

    print("---------------------------------------")
    print("System ready!")
    print("Access: http://127.0.0.1:5005")
    print("Ctrl + C to stop all.")

def stop_services():
    print("\n\nStopping the system...")
    for p in processes:
        try:
            p.terminate()
            p.wait()
        except Exception:
            pass
    print("Exiting...")

if __name__ == "__main__":
    try:
        start_services()
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        stop_services()