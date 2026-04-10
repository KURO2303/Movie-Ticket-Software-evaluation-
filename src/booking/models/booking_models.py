class Seat:
    def __init__(self, id, showtime_id, seat_number, status="available"):
        self.id = id
        self.showtime_id = showtime_id
        self.seat_number = seat_number
        self.status = status

    def to_dict(self):
        return {
            "seat_number": self.seat_number,
            "status": self.status
        }