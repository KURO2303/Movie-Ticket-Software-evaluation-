# Changelog

## 6/12/2025, 14:05

- Create README.md, changelog.md
- Create folder 'src', 'Design' and 'Documents'

## 16/12/2025, 15:38

- Add folders
- Add placeholder for each
- Add .gitignore
- Add requirements

## 20/12/2025

- Create booking_service.py in business_logic
- Create models.py in business_logic
- Create booking_repository.py in persistence
- Create app.py

## 1/1/2026

- Implement database (`movies.db` & `booking.db`)
- Refactor project structure into Microservices: `movie` (Admin) & `booking` (Customer)
- Implement `MovieService`: Add logic to auto-generate seats when creating showtimes
- Implement `BookingService`: Add logic to view available seats and book tickets

## 2/1/2026

- Add search functionality (filter by title & genre) for movies
- Update Movie & Showtime models to support manual ID input
- Complete CRUD operations for Movie Service

## 3/1/2026

- Add Api gateway
- Add run_app.py

## 9/1/2026

- Implement security api-key
- Refactor architecture: Decouple `MovieService` and `BookingService` using Internal APIs (replaced direct Repository access).
- Implement `PaymentService`: Handle payments and invoice generation with SQLite.
- Implement `NotificationService`: Consumer service to listen for RabbitMQ events (Mock Email/Print logs).
- Integrate RabbitMQ (Docker): Enable Event-Driven communication for `OrderPlacedEvent` and `InvoiceGenerated` events.
- Update `run_app.py`: Register Payment and Notification services to the orchestration script.

## 11/1/2026

- Update gateway and notification
- Patch some code errors in movie, booking and payment

## 13/1/2026

- Add User folder
- Implement admin/user login logic
- Implement user register logic
- Update Notification

## 14/1/2026, 16:48

- Create issue report file
- Fix issue related to how process stop in Linux
- Modify database path resolution
- Update test file to match with new code

## 14/1/2026, 17:40

- Add more tests

## 28/1/2026

- Fix frontend login bug (mismatched 'email' vs 'username' keys)
- Fix missing Admin management routes in frontend router
- Create AdminMoviesPage and AdminShowtimesPage for movie/showtime management

## 2/2/2026

- Refactored Gateway to use `flask-cors` properly; allowed custom headers `peko-key`, `Authorization`, `X-User-Email` to fix "Missing or Invalid Header" errors.
- Enabled CORS for all individual microservices (`user`, `movie`, `booking`, `payment`) for easier testing and isolation.
- Implemented atomic seat locking (SQL `UPDATE ... WHERE status='available'`) in `BookingRepository` to prevent double-booking (ASR 2 compliance).
- Added backend endpoints (`GET /api/showtimes/<id>/seats`) to support visual seat selection.
- Connected Frontend to Payment Service; updated booking flow to "Reserve (Pending) -> Pay -> Confirm".
- Replaced manual seat text input with a 10x10 interactive visual seat map; added "My Bookings" page with real API data.
- Big UI changes.
- Add '.db' to .gitignore

## 4/2/2026

- Language to English
- Redesign booking UI with tabbed Date Ribbon and Time Grid
- Implement tiered seat system (Standard, VIP, Couple) with dynamic price surcharges
- Support multi-seat booking and visual seat selection
- Implement Payment Method management (CRUD for credit cards) in Payment Service
- Auto-update booking status to 'confirmed' upon successful payment
- Implement Profile and User Management endpoints in User Service
- Redesign Admin Dashboard with new sidebar navigation
- Enable Docker hot-reload
- Create `reset_db.py` and update `seed_db.py`
- Various bug fixes and clean-up
- Add '.db' to .gitignore
- Update admin panel

## 6/2/2026

- Major overhaul of the test suite structure
- Added comprehensive unit and integration tests for User, Movie, Booking, and Payment services
- Refactored `test_api.py` and implemented a new `base.py` for shared test logic
- Included `test_case.pdf` in the documentation

## 7/2/2026

- Update C4 Model (Level 4) diagrams
- Enhanced test orchestration in `test_api.py` with automated log redirection to prevent process hanging.
- Updated `.gitignore` to ignore the `/logs` directory and all database variations (`*.db*`).
- Modified `docker-compose.yml` to support running integration tests within Docker containers.
- Integrated `tests/` and `logs/` volumes into backend containers for streamlined debugging and persistence.

## 17/2/2026

- Modify schedule selector to a paginated type in booking page and movie's detail
- Fix seats visual bug, due to a logic fault which only show booked seats while skip rendering the rest

## 24/2/2026

- Replace the paginated date scroller with a comprehensive 1-month calendar grid in `MovieDetailsPage`.
- Implement a 7-column layout for the calendar view with month navigation.
- Add showtime count indicators on calendar days to highlight available dates.
- Enhanced calendar styling with responsive design for improved mobile user experience.

## 2/3/2026

- Relocated API Gateway to port `5005` to resolve port conflicts with Docker
- Implemented **Grouped Bookings**: Multiple seats are now processed under a single Booking ID per transaction (ASR 2 improvement).
- Refactored `BookingRepository` and `BookingService` to store and manage comma-separated seat strings for unified orders.
- Implement movie posters both front and back end.
- Improved Movie Management UX: Added cross-clearing logic for File Upload and Image URL inputs.
- Updated `seed_db.py` to simulate grouped seat bookings in the test dataset.
- More tests.
- Update `README.md`.

## 3/3/2026

- Fixed `TypeError` in `BookingService.create_seats` by making `seats_per_row` optional.
- Added missing `BOOKING_SERVICE_URL` to `movie_service` in `docker-compose.yml`.
- Corrected inverted showtime duration validation logic in `MovieService`.
- Updated `add_payment_method` API to return the newly created card's `id`.
- Implemented `movie.description` field across database, model, service, and frontend (`MovieDetailsPage`).
- Updated `seed_db.py` with actual movie descriptions.
- Removed duplicate `import os` in `gateway/app.py`.
- Removed redundant `COPY seed_db.py` in `Dockerfile.backend`.
- Refactored RabbitMQ connection logic across all services to eliminate unreachable code.
- Implemented centralized frontend route protection for `/admin/*` pages in `main.js`.
- RabbitMQ's connecting issue

## 5/3/2026

- Added C4 model (All 4 level) and Use case (Customer and Admin).

## 6/3/2026

- Documentation for test suite
- Fixed RabbitMQ integration test
- Re-numbering the test cases
- Remove logs/ from '.gitignore'
