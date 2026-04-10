import os
import requests
import json
import pika
from booking.persistence.booking_repository import BookingRepository
from dotenv import load_dotenv

load_dotenv()

class BookingService:
    def __init__(self):
        self.booking_repo = BookingRepository()
        self.MOVIE_SERVICE_URL = os.getenv("MOVIE_SERVICE_URL", "http://127.0.0.1:5001")
        self.RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
        self.RABBITMQ_URL = os.getenv("RABBITMQ_URL")

    def send_ticket_email(self, booking_id, email, seat_number, movie_title):
        try:
            if self.RABBITMQ_URL:
                 params = pika.URLParameters(self.RABBITMQ_URL)
            else:
                 url = f"amqp://admin:admin@{self.RABBITMQ_HOST}:5672/%2F"
                 params = pika.URLParameters(url)
            
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            channel.queue_declare(queue='ticket_events', durable=True)
            
            message = {
                "type": "OrderPlacedEvent",
                "ticket_id": booking_id,
                "email": email,
                "seat": seat_number,
                "movie_name": movie_title  
            }
            
            channel.basic_publish(
                exchange='',
                routing_key='ticket_events',
                body=json.dumps(message),
                properties=pika.BasicProperties(delivery_mode=2)
            )
            connection.close()
            print(f"[RabbitMQ] Sent ticket event for Booking #{booking_id}")
        except Exception as e:
            print(f"[ERROR] RabbitMQ Error: {e}")

    def book_ticket(self, showtime_id, seat_numbers, email):
        if not isinstance(seat_numbers, list):
            seat_numbers = [seat_numbers]

        if not seat_numbers:
             raise ValueError("No seats selected")

        # 1. Check availability for ALL seats first
        for seat in seat_numbers:
            if not self.booking_repo.is_seat_available(showtime_id, seat):
                raise ValueError(f"Seat {seat} is not available")

        base_price = 50000             
        movie_title = "Unknown"   
        
        try:
            resp = requests.get(f"{self.MOVIE_SERVICE_URL}/api/showtimes/{showtime_id}")
            if resp.status_code != 200:
                raise ValueError("Showtime not found")
            
            showtime_info = resp.json()
            base_price = showtime_info.get('price', 50000)
            movie_id = showtime_info.get('movie_id')

            if movie_id:
                movie_resp = requests.get(f"{self.MOVIE_SERVICE_URL}/api/movies/{movie_id}")
                if movie_resp.status_code == 200:
                    movie_title = movie_resp.json().get('title', "Unknown Movie")

        except requests.exceptions.ConnectionError:
            print("Warning: Cannot connect to Movie Service to verify details. Using defaults.")

        total_booking_amount = 0
        for seat_num in seat_numbers:
            seat_info = self.booking_repo.get_seat_details(showtime_id, seat_num)
            surcharge = seat_info['price_surcharge'] if seat_info else 0
            total_booking_amount += (base_price + surcharge)

        try:
            # Create a single booking for all seats
            bk_id = self.booking_repo.create_booking(showtime_id, seat_numbers, email, total_booking_amount)
            
            # Send ONE notification for the entire booking
            seats_str = ", ".join(seat_numbers)
            self.send_ticket_email(bk_id, email, seats_str, movie_title)

            return {
                "message": "Booking successful", 
                "booking_id": bk_id,
                "booking_ids": [bk_id], # Keep for backward compatibility if needed
                "total_price": total_booking_amount,
                "movie": movie_title,
                "seats": seats_str
            }
        except Exception as e:
            print(f"Booking failed. Error: {e}")
            raise e

    
    def cancel_all_bookings_for_showtime(self, showtime_id):
        return self.booking_repo.delete_all_bookings_by_showtime(showtime_id)

    def create_seats(self, showtime_id, rows_count, seats_per_row=None):
        if seats_per_row is None:
            self.booking_repo.create_seats(showtime_id, rows_count)
        else:
            self.booking_repo.create_seats_realistic(showtime_id, rows_count, seats_per_row)

    def get_seats(self, showtime_id):
        # We need to get room info from Movie Service to initialize if needed
        try:
            resp = requests.get(f"{self.MOVIE_SERVICE_URL}/api/showtimes/{showtime_id}")
            if resp.status_code == 200:
                showtime = resp.json()
                room_id = showtime.get('room_id')
                if room_id:
                    room_resp = requests.get(f"{self.MOVIE_SERVICE_URL}/api/rooms/{room_id}")
                    if room_resp.status_code == 200:
                        room = room_resp.json()
                        # Call get_seats_by_showtime with room info for lazy init
                        return self.booking_repo.get_seats_by_showtime_realistic(
                            showtime_id, 
                            room['rows'], 
                            room['seats_per_row']
                        )
        except Exception as e:
            print(f"Error fetching room info for seats: {e}")

        return self.booking_repo.get_seats_by_showtime(showtime_id)

    def get_all_bookings(self):
        return self.booking_repo.get_all_bookings()

    def get_my_bookings(self, email):
        return self.booking_repo.get_bookings_by_customer(email)

    def get_booking_details(self, booking_id):
        return self.booking_repo.get_booking(booking_id)

    def update_booking_status(self, booking_id, status):
        return self.booking_repo.update_booking_status(booking_id, status)

    def delete_booking(self, booking_id):
        return self.booking_repo.delete_booking(booking_id)

    def get_affected_customers(self, showtime_id):
        return self.booking_repo.get_affected_customers(showtime_id)