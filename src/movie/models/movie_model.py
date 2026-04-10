class Movie:
    def __init__(self, id, title, genre, duration, release_date, image_url=None, description=None):
        self.id = id
        self.title = title
        self.genre = genre
        self.duration = duration
        self.release_date = release_date
        self.image_url = image_url
        self.description = description

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "genre": self.genre,
            "duration": self.duration,
            "release_date": self.release_date,
            "image_url": self.image_url,
            "description": self.description
        }

class Showtime:
    def __init__(self, id, movie_id, start_time, end_time, price, room_id=None):
        self.id = id
        self.movie_id = movie_id
        self.room_id = room_id
        self.start_time = start_time
        self.end_time = end_time
        self.price = price 

    def to_dict(self):
        return {
            "id": self.id,
            "movie_id": self.movie_id,
            "room_id": self.room_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "price": self.price 
        }