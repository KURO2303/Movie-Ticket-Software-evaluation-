import os
import requests
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
app = Flask(__name__)
# Explicitly allow the custom headers we use
CORS(app, resources={r"/api/*": {"origins": "*"}}, 
     allow_headers=["Content-Type", "Authorization", "peko-key", "X-User-Email", "X-User-Role"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

MOVIE_SERVICE_URL = os.getenv('MOVIE_SERVICE_URL', 'http://movie_service:5001')
BOOKING_SERVICE_URL = os.getenv('BOOKING_SERVICE_URL', 'http://booking_service:5002')
PAYMENT_SERVICE_URL = os.getenv('PAYMENT_SERVICE_URL', 'http://payment_service:5003')
USER_SERVICE_URL = os.getenv('USER_SERVICE_URL', 'http://user_service:5004')
VALID_API_KEY = os.getenv('API_KEY_VALUE', 'BO_CHIKA')
API_KEY_NAME = os.getenv('API_KEY_NAME', 'peko-key')

# ---------- API KEY CHECK ----------
@app.before_request
def check_api_key():
    if request.method == 'OPTIONS':
        return
    # Publicly allow movie posters (browsers won't send the API key header for <img> tags)
    if request.path.startswith('/api/movies/posters/'):
        return
        
    client_key = request.headers.get(API_KEY_NAME)
    if client_key != VALID_API_KEY:
        return jsonify({"error": f"Missing or Invalid Header: {API_KEY_NAME}"}), 401

# ---------- FORWARD HELPERS ----------
def public_forward(service_url, path):
    url = f"{service_url}{path}"
    resp = requests.request(
        method=request.method,
        url=url,
        headers={k: v for k, v in request.headers if k != 'Host'},
        data=request.get_data(),
        params=request.args
    )
    return Response(resp.content, resp.status_code, dict(resp.headers))

def validate_and_forward(service_url, path, required_role=None):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "Missing Authorization Token"}), 401

    token_parts = auth_header.split(" ")
    if len(token_parts) != 2 or token_parts[0] != "Bearer":
        return jsonify({"error": "Invalid Token Format"}), 401

    token = token_parts[1]
    verify_resp = requests.get(f"{USER_SERVICE_URL}/api/auth/verify", params={'token': token})
    if verify_resp.status_code != 200:
        return jsonify({"error": "Invalid or Expired Token"}), 401

    user_info = verify_resp.json()
    user_email = user_info['email']
    user_role = user_info['role']

    if required_role and user_role != required_role:
        return jsonify({"error": "Forbidden"}), 403

    new_headers = {k: v for k, v in request.headers if k != 'Host'}
    new_headers['X-User-Email'] = user_email
    new_headers['X-User-Role'] = user_role

    url = f"{service_url}{path}"
    resp = requests.request(
        method=request.method,
        url=url,
        headers=new_headers,
        data=request.get_data(),
        params=request.args
    )
    return Response(resp.content, resp.status_code, dict(resp.headers))

# ---------- ROUTES ----------
@app.route('/api/auth/<path:path>', methods=['POST'])
def auth_proxy(path):
    url = f"{USER_SERVICE_URL}/api/auth/{path}"
    resp = requests.post(url, json=request.json)
    return Response(resp.content, resp.status_code, dict(resp.headers))

@app.route('/api/users/me', methods=['GET'])
def get_me():
    return public_forward(USER_SERVICE_URL, request.path)

@app.route('/api/users', methods=['GET'])
def get_users():
    return validate_and_forward(USER_SERVICE_URL, request.path, 'admin')

@app.route('/api/users/<path:path>', methods=['GET','PUT'])
def user_detail(path):
    return validate_and_forward(USER_SERVICE_URL, request.path, 'admin')

@app.route('/api/movies', methods=['GET','POST'])
def movies_list():
    if request.method == 'POST':
        return validate_and_forward(MOVIE_SERVICE_URL, request.path, 'admin')
    return public_forward(MOVIE_SERVICE_URL, request.path)

@app.route('/api/movies/posters/<path:filename>')
def movie_posters(filename):
    url = f"{MOVIE_SERVICE_URL}/static/{filename}"
    resp = requests.get(
        url,
        headers={k: v for k, v in request.headers if k.lower() not in ['host', 'content-type']},
        stream=True
    )
    
    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
    headers = [(name, value) for (name, value) in resp.headers.items()
               if name.lower() not in excluded_headers]

    return Response(resp.iter_content(chunk_size=1024), resp.status_code, headers)

@app.route('/api/movies/upload', methods=['POST'])
def movie_upload():
    # Check admin token first
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "Missing Authorization Token"}), 401

    token_parts = auth_header.split(" ")
    if len(token_parts) != 2 or token_parts[0] != "Bearer":
        return jsonify({"error": "Invalid Token Format"}), 401

    token = token_parts[1]
    verify_resp = requests.get(f"{USER_SERVICE_URL}/api/auth/verify", params={'token': token})
    if verify_resp.status_code != 200:
        return jsonify({"error": "Invalid or Expired Token"}), 401

    user_info = verify_resp.json()
    if user_info['role'] != 'admin':
        return jsonify({"error": "Forbidden"}), 403

    # Forward the file
    url = f"{MOVIE_SERVICE_URL}/api/movies/upload"
    
    # Extract files for requests library
    files = {}
    for key, file in request.files.items():
        files[key] = (file.filename, file.stream, file.content_type)

    # Forward headers, excluding Host and Content-Type (requests will set it)
    forward_headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host', 'content-type']}
    forward_headers['X-User-Email'] = user_info['email']
    forward_headers['X-User-Role'] = user_info['role']
    
    resp = requests.post(
        url,
        headers=forward_headers,
        files=files,
        params=request.args
    )
    return Response(resp.content, resp.status_code, dict(resp.headers))

@app.route('/api/movies/<path:path>', methods=['GET','PUT','DELETE'])
def movie_detail(path):
    if request.method in ['PUT','DELETE']:
        return validate_and_forward(MOVIE_SERVICE_URL, request.path, 'admin')
    return public_forward(MOVIE_SERVICE_URL, request.path)

@app.route('/api/showtimes', methods=['GET','POST'])
def showtimes_list():
    if request.method == 'POST':
        return validate_and_forward(MOVIE_SERVICE_URL, request.path, 'admin')
    return public_forward(MOVIE_SERVICE_URL, request.path)

@app.route('/api/showtimes/<path:path>', methods=['GET','PUT','DELETE'])
def showtime_detail(path):
    # Route for /api/showtimes/<id>/seats
    if path.endswith('/seats'):
        return public_forward(BOOKING_SERVICE_URL, request.path)
    
    if request.method in ['PUT','DELETE']:
        return validate_and_forward(MOVIE_SERVICE_URL, request.path, 'admin')
    return public_forward(MOVIE_SERVICE_URL, request.path)

@app.route('/api/rooms', methods=['GET'])
def rooms_list():
    return public_forward(MOVIE_SERVICE_URL, request.path)

@app.route('/api/rooms/<path:path>', methods=['GET'])
def room_detail(path):
    return public_forward(MOVIE_SERVICE_URL, request.path)

@app.route('/api/bookings', methods=['GET','POST'])
def bookings():
    return validate_and_forward(BOOKING_SERVICE_URL, request.path)

@app.route('/api/bookings/<path:path>', methods=['GET','DELETE'])
def booking_detail(path):
    return validate_and_forward(BOOKING_SERVICE_URL, request.path)

@app.route('/api/payments', methods=['POST'])
def payments():
    return validate_and_forward(PAYMENT_SERVICE_URL, request.path)

@app.route('/api/payment-methods', methods=['GET', 'POST'])
def payment_methods():
    return validate_and_forward(PAYMENT_SERVICE_URL, request.path)

@app.route('/api/payment-methods/<path:path>', methods=['DELETE', 'PUT'])
def payment_methods_detail(path):
    return validate_and_forward(PAYMENT_SERVICE_URL, request.path)

# ---------- RUN ----------
if __name__ == '__main__':
    print("API Gateway running on port 5005...")
    app.run(host='0.0.0.0', port=5005, debug=True)
