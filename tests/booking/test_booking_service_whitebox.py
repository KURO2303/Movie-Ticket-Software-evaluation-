import unittest
from unittest.mock import MagicMock, patch
import requests
from booking.business_logic.booking_service import BookingService

class TestBookingServiceWhitebox(unittest.TestCase):
    
    def setUp(self):
        # Thiết lập BookingService và mock BookingRepository
        self.booking_service = BookingService()
        self.booking_service.booking_repo = MagicMock()
        
        # Mock hàm send_ticket_email để không gửi RabbitMQ thực tế
        self.booking_service.send_ticket_email = MagicMock()

    def test_book_ticket_no_seats_selected(self):
        """Path 1: Không chọn ghế nào (seat_numbers trống) -> Phải ném lỗi ValueError"""
        with self.assertRaises(ValueError) as context:
            self.booking_service.book_ticket(showtime_id=1, seat_numbers=[], email="test@example.com")
        self.assertEqual("No seats selected", str(context.exception))

    def test_book_ticket_seat_not_available(self):
        """Path 2: Có ghế đã được đặt trước đó -> Phải ném lỗi ValueError"""
        # Giả lập ghế A1 trống, nhưng ghế A2 đã có người đặt
        self.booking_service.booking_repo.is_seat_available.side_effect = lambda st_id, seat: seat == "A1"
        
        with self.assertRaises(ValueError) as context:
            self.booking_service.book_ticket(showtime_id=1, seat_numbers=["A1", "A2"], email="test@example.com")
        self.assertEqual("Seat A2 is not available", str(context.exception))

    @patch('requests.get')
    def test_book_ticket_showtime_not_found(self, mock_get):
        """Path 3: Showtime không tồn tại bên Movie Service (trả về 404) -> Phải ném lỗi ValueError"""
        # Giả lập tất cả ghế đều trống
        self.booking_service.booking_repo.is_seat_available.return_value = True
        
        # Giả lập requests.get trả về 404 cho showtime
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        with self.assertRaises(ValueError) as context:
            self.booking_service.book_ticket(showtime_id=999, seat_numbers=["A1"], email="test@example.com")
        self.assertEqual("Showtime not found", str(context.exception))

    @patch('requests.get')
    def test_book_ticket_connection_error_uses_defaults(self, mock_get):
        """Path 4: Gặp lỗi kết nối với Movie Service -> Sử dụng giá trị mặc định và đặt vé thành công"""
        # Giả lập ghế trống
        self.booking_service.booking_repo.is_seat_available.return_value = True
        self.booking_service.booking_repo.get_seat_details.return_value = {"price_surcharge": 0}
        self.booking_service.booking_repo.create_booking.return_value = "booking-123"
        
        # Giả lập ConnectionError khi gọi API
        mock_get.side_effect = requests.exceptions.ConnectionError()
        
        result = self.booking_service.book_ticket(showtime_id=1, seat_numbers="A1", email="test@example.com")
        
        # Đảm bảo dùng giá vé mặc định 50000 và tên phim "Unknown"
        self.assertEqual(result["booking_id"], "booking-123")
        self.assertEqual(result["total_price"], 50000)
        self.assertEqual(result["movie"], "Unknown")
        self.booking_service.booking_repo.create_booking.assert_called_once_with(1, ["A1"], "test@example.com", 50000)

    @patch('requests.get')
    def test_book_ticket_success_with_surcharge(self, mock_get):
        """Path 5: Đặt vé thành công với ghế có phụ phí (surcharge)"""
        # Giả lập ghế trống
        self.booking_service.booking_repo.is_seat_available.return_value = True
        
        # Giả lập thông tin phụ phí cho từng ghế (ghế A1 phụ phí 10k, ghế A2 phụ phí 20k)
        surcharges = {"A1": 10000, "A2": 20000}
        self.booking_service.booking_repo.get_seat_details.side_effect = lambda st_id, seat: {"price_surcharge": surcharges.get(seat, 0)}
        self.booking_service.booking_repo.create_booking.return_value = "booking-456"
        
        # Giả lập cuộc gọi API thành công lấy thông tin showtime (giá vé gốc là 80k) và thông tin phim
        mock_resp_showtime = MagicMock()
        mock_resp_showtime.status_code = 200
        mock_resp_showtime.json.return_value = {"price": 80000, "movie_id": "movie-abc"}
        
        mock_resp_movie = MagicMock()
        mock_resp_movie.status_code = 200
        mock_resp_movie.json.return_value = {"title": "Avengers: Endgame"}
        
        mock_get.side_effect = [mock_resp_showtime, mock_resp_movie]
        
        # Đặt 2 ghế A1 và A2
        result = self.booking_service.book_ticket(showtime_id=1, seat_numbers=["A1", "A2"], email="test@example.com")
        
        # Tính toán tổng giá vé:
        # Ghế A1: 80k + 10k = 90k
        # Ghế A2: 80k + 20k = 100k
        # Tổng cộng = 190k
        self.assertEqual(result["booking_id"], "booking-456")
        self.assertEqual(result["total_price"], 190000)
        self.assertEqual(result["movie"], "Avengers: Endgame")
        self.assertEqual(result["seats"], "A1, A2")
        
        self.booking_service.booking_repo.create_booking.assert_called_once_with(1, ["A1", "A2"], "test@example.com", 190000)
        self.booking_service.send_ticket_email.assert_called_once_with("booking-456", "test@example.com", "A1, A2", "Avengers: Endgame")

if __name__ == "__main__":
    unittest.main()
