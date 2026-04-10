import sys
import os
import pika
import json
import time
from dotenv import load_dotenv

load_dotenv()
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
RABBITMQ_URL = os.getenv('RABBITMQ_URL')

def connect_rabbitmq():
    while True:
        try:
            print(f"[INFO] Connecting to RabbitMQ at {RABBITMQ_HOST}...")
            
            if RABBITMQ_URL:
                 params = pika.URLParameters(RABBITMQ_URL)
            else:
                 # admin:admin credentials match the new docker-compose config
                 url = f"amqp://admin:admin@{RABBITMQ_HOST}:5672/%2F"
                 params = pika.URLParameters(url)
            
            connection = pika.BlockingConnection(params)
            print("[INFO] Successfully connected to RabbitMQ!")
            return connection
        except Exception as e:
            print(f"[ERROR] Connection failed: {e}. Retrying in 5 seconds...")
            time.sleep(5)

def callback(ch, method, properties, body):
    try:
        data = json.loads(body)
        event_type = data.get('type', 'UNKNOWN')

        if event_type == 'OrderPlacedEvent':
            print("\n----------------------------------------")
            print("[EMAIL SERVICE] Sending Ticket Confirmation")
            print(f"   Subject: Booking Confirmed!")
            print(f"   To:      {data.get('email')}")
            print(f"   Ticket:  #{data.get('ticket_id')}")
            print(f"   Seat:    {data.get('seat')}")
            print(f"   Movie:   {data.get('movie_name')}")
            print("   Status:  SENT")
            print("----------------------------------------\n")

        elif event_type == 'INVOICE_PRINT':
            print("\n----------------------------------------")
            print("[PRINTER SERVICE] INVOICE GENERATED")
            print(f"   Customer: {data.get('customer')}")
            print(f"   Booking:  #{data.get('booking_id')}")
            print(f"   Amount:   {data.get('amount')} VND")
            print(f"   Date:     {data.get('date')}")
            print("   Status:   SENT TO PRINTER")
            print("----------------------------------------\n")

        elif event_type == 'SHOWTIME_CHANGED':
            print("\n----------------------------------------")
            print("[ALERT] SCHEDULE CHANGE NOTIFICATION")
            print(f"   To:       {data.get('email')}")
            print(f"   Message:  Your showtime for '{data.get('movie_title')}' has changed.")
            print(f"   Old Time: {data.get('old_time')}")
            print(f"   New Time: {data.get('new_time')}")
            print("   -> Apology email sent.")
            print("----------------------------------------\n")

        elif event_type == 'REFUND_NOTIFICATION':
            print("\n----------------------------------------")
            print("[ALERT] REFUND & APOLOGY EMAIL")
            print(f"   To:       {data.get('email')}")
            print(f"   Reason:   {data.get('reason')}")
            print(f"   Seat:     {data.get('seat')}")
            print(f"   Action:   REFUNDING {data.get('amount')} VND")
            print("   Status:   Money has been returned to customer wallet.")
            print("----------------------------------------\n")
        
        else:
            print(f"[INFO] Ignored unknown event type: {event_type}")

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"[ERROR] Error processing message: {e}")

def start_consumer():
    connection = connect_rabbitmq()
    channel = connection.channel()

    channel.queue_declare(queue='ticket_events', durable=True)      
    channel.queue_declare(queue='invoice_events', durable=True)      
    channel.queue_declare(queue='notification_events', durable=True) 
    channel.basic_consume(queue='ticket_events', on_message_callback=callback)
    channel.basic_consume(queue='invoice_events', on_message_callback=callback)
    channel.basic_consume(queue='notification_events', on_message_callback=callback)

    print("[INFO] Notification Service is running & listening on ALL queues...")
    channel.start_consuming()

if __name__ == '__main__':
    try:
        start_consumer()
    except KeyboardInterrupt:
        print("Stopping Notification Service...")
        try:
            sys.exit(0)
        except SystemExit:
            os._exit(0)
