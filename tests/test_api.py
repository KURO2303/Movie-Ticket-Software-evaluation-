import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import unittest
import subprocess
import time
import socket
import glob
from tests.base import Colors, SERVICES_CONFIG

def clean_databases():
    print(f"{Colors.YELLOW}[SETUP] Cleaning old database files...{Colors.RESET}")
    root_dir = os.getcwd()
    patterns = [
        os.path.join(root_dir, '*.db*'), 
        os.path.join(root_dir, 'instance', '*.db*'),
        os.path.join(root_dir, 'src', '**', '*.db*')
    ]
    for pattern in patterns:
        for db_file in glob.glob(pattern, recursive=True):
            try:
                os.remove(db_file)
                print(f" -> Deleted: {os.path.basename(db_file)}")
            except: pass

def wait_for_services(timeout=30):
    start = time.time()
    for name, config in SERVICES_CONFIG.items():
        if 'port' not in config:
            continue # Skip services without port (e.g. notification)
            
        print(f" -> Waiting for {name} on port {config['port']}...")
        while True:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                if sock.connect_ex(('127.0.0.1', config['port'])) == 0: 
                    sock.close()
                    break
            except: pass
            if time.time() - start > timeout:
                print(f"{Colors.RED}[ERROR] Service {name} timed out!{Colors.RESET}")
                return False
            time.sleep(0.5)
    return True

def run_suite():
    # 0. Create logs folder
    if not os.path.exists('logs'):
        os.makedirs('logs')

    # 1. Dọn dẹp
    clean_databases()
    
    # 2. Khởi động Services
    print(f"\n{Colors.BOLD}{Colors.HEADER}>>> STARTING ALL MICROSERVICES <<<{Colors.RESET}")
    processes = []
    log_files = []
    env = os.environ.copy()
    env['PYTHONPATH'] = os.path.join(os.getcwd(), 'src')
    env['PYTHONUNBUFFERED'] = '1'
    python_exec = sys.executable

    for name, config in SERVICES_CONFIG.items():
        full_path = os.path.join(*config['path'].split('/'))
        print(f" -> Launching {name.upper()}...")
        
        out_log = open(f"logs/{name}_out.log", "w")
        err_log = open(f"logs/{name}_err.log", "w")
        log_files.extend([out_log, err_log])

        p = subprocess.Popen([python_exec, full_path], env=env, stdout=out_log, stderr=err_log)
        processes.append(p)

    # 3. Chờ Services
    print(f" -> {Colors.YELLOW}Waiting for services to be healthy...{Colors.RESET}")
    if not wait_for_services(timeout=45):
        print(f"{Colors.RED}System failed to start. Terminating.{Colors.RESET}")
        for p in processes: p.terminate()
        sys.exit(1)
    
    print(f"{Colors.GREEN}[READY] All services are listening.{Colors.RESET}\n")

    # 4. Chạy Test (Theo thứ tự logic)
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Phase 1 & 5: Security & Gateway
    if os.path.exists('tests/gateway/test_gateway.py'):
        suite.addTests(loader.loadTestsFromName('tests.gateway.test_gateway'))
    
    # Notification integration
    if os.path.exists('tests/notification/test_notification.py'):
        suite.addTests(loader.loadTestsFromName('tests.notification.test_notification'))
    
    # Core Services (Going through Gateway)
    suite.addTests(loader.loadTestsFromName('tests.user.test_user'))
    suite.addTests(loader.loadTestsFromName('tests.movie.test_movie'))
    suite.addTests(loader.loadTestsFromName('tests.booking.test_booking'))
    suite.addTests(loader.loadTestsFromName('tests.payment.test_payment'))
    suite.addTests(loader.loadTestsFromName('tests.test_errors'))

    runner = unittest.TextTestRunner(verbosity=2, failfast=False)
    result = runner.run(suite)

    # 5. Dọn dẹp
    print(f"\n{Colors.BOLD}{Colors.HEADER}>>> STOPPING SERVICES <<<{Colors.RESET}")
    for p in processes: p.terminate()
    for f in log_files: f.close()
    
    if not result.wasSuccessful():
        sys.exit(1)

if __name__ == '__main__':
    run_suite()
