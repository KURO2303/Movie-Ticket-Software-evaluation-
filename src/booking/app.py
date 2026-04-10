import sys
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from booking.business_logic.booking_service import BookingService

app = Flask(__name__)
CORS(app)
booking_service = BookingService()


@app.route('/api/bookings', methods=['POST'])
def book_ticket():
    data = request.json
    user_email = request.headers.get('X-User-Email')
    if not user_email:
        return jsonify({"error": "Unauthorized: Access via Gateway"}), 401

    try:
        # Support both 'seat_numbers' (list) and legacy 'seat_number' (string)
        seats = data.get('seat_numbers')
        if not seats:
            if 'seat_number' in data:
                seats = [data['seat_number']]
            else:
                return jsonify({"error": "No seats provided"}), 400

        res = booking_service.book_ticket(data['showtime_id'], seats, user_email)
        return jsonify(res), 201
    except Exception as e: return jsonify({"error": str(e)}), 400

@app.route('/api/bookings', methods=['GET'])
def get_bookings():
    return jsonify(booking_service.get_all_bookings())

@app.route('/api/bookings/my', methods=['GET'])
def get_my_bookings():
    user_email = request.headers.get('X-User-Email')
    if not user_email:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(booking_service.get_my_bookings(user_email))

@app.route('/api/bookings/<booking_id>', methods=['GET'])
def get_detail(booking_id):
    res = booking_service.get_booking_details(booking_id)
    if res: return jsonify(res)
    return jsonify({"error": "Not found"}), 404

@app.route('/api/bookings/<booking_id>/status', methods=['PUT'])
def update_status(booking_id):
    data = request.json
    status = data.get('status')
    if not status:
        return jsonify({"error": "Missing status"}), 400
    
    booking_service.update_booking_status(booking_id, status)
    return jsonify({"message": "Status updated"}), 200

@app.route('/api/bookings/<booking_id>', methods=['DELETE'])
def delete_booking(booking_id):
    try:
        booking_service.delete_booking(booking_id)
        return jsonify({"message": "Deleted"}), 200
    except Exception as e: return jsonify({"error": str(e)}), 400


@app.route('/api/internal/seats', methods=['POST'])
def create_seats():
    data = request.json
    booking_service.create_seats(data['showtime_id'], data['total_seats'])
    return jsonify({"msg": "Seats created"}), 201

@app.route('/api/internal/bookings/cancel_by_showtime/<showtime_id>', methods=['DELETE'])
def cancel_internal(showtime_id):
    return jsonify(booking_service.cancel_all_bookings_for_showtime(showtime_id)), 200

@app.route('/api/bookings/showtime/<showtime_id>/customers', methods=['GET'])
def get_customers_by_showtime(showtime_id):
    try:
        customers = booking_service.get_affected_customers(showtime_id)
        return jsonify(customers), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/showtimes/<showtime_id>/seats', methods=['GET'])
def get_seats(showtime_id):
    return jsonify(booking_service.get_seats(showtime_id))

if __name__ == '__main__':
    print("Booking Service running on port 5002...")
    app.run(debug=True, port=5002, host='0.0.0.0')