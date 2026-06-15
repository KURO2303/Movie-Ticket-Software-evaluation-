import unittest
from unittest.mock import MagicMock
from movie.business_logic.movie_service import MovieService

class TestMovieServiceWhitebox(unittest.TestCase):
    
    def setUp(self):
        # Thiết lập MovieService và mock MovieRepository để cô lập logic nghiệp vụ (pure unit test)
        self.movie_service = MovieService()
        self.movie_service.movie_repo = MagicMock()

    def test_validate_showtime_duration_movie_not_found(self):
        """Path 1: Movie không tồn tại trong cơ sở dữ liệu -> Phải ném lỗi ValueError"""
        # Giả lập movie_repo trả về None (không tìm thấy phim)
        self.movie_service.movie_repo.get_movie.return_value = None
        
        with self.assertRaises(ValueError) as context:
            self.movie_service.validate_showtime_duration(
                movie_id="non-existent-id", 
                start_time_str="2026-12-01 10:00", 
                end_time_str="2026-12-01 12:00"
            )
        self.assertIn("not found", str(context.exception))

    def test_validate_showtime_duration_invalid_date_format(self):
        """Path 2: Định dạng thời gian truyền vào không hợp lệ -> Phải ném lỗi ValueError"""
        # Giả lập movie tồn tại
        mock_movie = MagicMock()
        self.movie_service.movie_repo.get_movie.return_value = mock_movie
        
        # Truyền sai định dạng ngày (thiếu giờ:phút)
        with self.assertRaises(ValueError) as context:
            self.movie_service.validate_showtime_duration(
                movie_id="movie-1", 
                start_time_str="2026-12-01", 
                end_time_str="2026-12-01 12:00"
            )
        self.assertIn("Invalid date format", str(context.exception))

    def test_validate_showtime_duration_end_before_start(self):
        """Path 3: Thời gian kết thúc trước hoặc bằng thời gian bắt đầu -> Phải ném lỗi ValueError"""
        mock_movie = MagicMock()
        self.movie_service.movie_repo.get_movie.return_value = mock_movie
        
        # Bắt đầu lúc 12:00, kết thúc lúc 10:00 (vô lý)
        with self.assertRaises(ValueError) as context:
            self.movie_service.validate_showtime_duration(
                movie_id="movie-1", 
                start_time_str="2026-12-01 12:00", 
                end_time_str="2026-12-01 10:00"
            )
        self.assertIn("End time must be after start time", str(context.exception))

    def test_validate_showtime_duration_shorter_than_movie_length(self):
        """Path 4: Thời lượng suất chiếu ngắn hơn thời lượng thực tế của phim -> Phải ném lỗi ValueError"""
        # Giả lập phim có thời lượng là 120 phút
        mock_movie = MagicMock()
        mock_movie.duration = 120
        self.movie_service.movie_repo.get_movie.return_value = mock_movie
        
        # Suất chiếu chỉ kéo dài 60 phút (từ 10:00 đến 11:00)
        with self.assertRaises(ValueError) as context:
            self.movie_service.validate_showtime_duration(
                movie_id="movie-1", 
                start_time_str="2026-12-01 10:00", 
                end_time_str="2026-12-01 11:00"
            )
        self.assertIn("is shorter than movie duration", str(context.exception))

    def test_validate_showtime_duration_success(self):
        """Path 5: Tất cả các điều kiện đều thỏa mãn -> Trả về đối tượng movie hợp lệ"""
        mock_movie = MagicMock()
        mock_movie.duration = 120
        self.movie_service.movie_repo.get_movie.return_value = mock_movie
        
        # Suất chiếu dài 180 phút (đủ cho phim 120 phút)
        result = self.movie_service.validate_showtime_duration(
            movie_id="movie-1", 
            start_time_str="2026-12-01 10:00", 
            end_time_str="2026-12-01 13:00"
        )
        
        # Đảm bảo trả về đúng đối tượng movie đã được mock
        self.assertEqual(result, mock_movie)
        self.movie_service.movie_repo.get_movie.assert_called_once_with("movie-1")

if __name__ == "__main__":
    unittest.main()
