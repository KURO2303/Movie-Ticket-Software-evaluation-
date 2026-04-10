# Test Suite

This documentation provides a deep dive into the integration and end-to-end (E2E) testing framework. The suite is designed to validate the entire microservices ecosystem, focusing on security, cross-service communication, and business logic atomicity.

---

## Core Architecture

### `tests/test_api.py`

Using Python's `subprocess` module to spawn each microservice as a background process.

- **Port Polling**: Before starting tests, the orchestrator uses `socket.connect_ex` to poll ports `5001-5005`. It ensures every service is "healthy" and listening before the first test case is executed.
- **Log Redirection**: Every service's `STDOUT` and `STDERR` are piped into `logs/` files. This is critical for debugging "silent" failures in background services.

### `tests/base.py`

The `TestBase` class provides the "Client" abstraction:

- **Smart Requests (`_req`)**: Automatically attaches the required `peko-key` (Gateway Security). It also includes a **retry mechanism** specifically for SQLite's "Database is locked" error, which can occur during rapid integration tests.
- **State Management**: A shared `state` dictionary persists data between test classes (e.g., a Movie created in `TestMovie` is used for a Booking in `TestBooking`).

---

## Test List

The suite validates the system through 33 specific test cases, organized below in their actual global execution order:

### Gateway & Security (`tests/gateway/`)

- **`test_01_api_key_missing`**: Verifies the "Shield" logic.
  - **Expectation**: 401 Unauthorized if the `peko-key` header is missing.
- **`test_02_poster_exemption`**: Validates static asset access.
  - **Expectation**: 200 OK when fetching images *without* an API key.
- **`test_03_admin_route_unauthorized`**: Ensures Admin routes are protected by JWT.
  - **Expectation**: 401 Unauthorized if no Bearer token is provided.
- **`test_04_rbac_forbidden`**: Validates Role-Based Access Control.
  - **Expectation**: 403 Forbidden when a "Customer" tries to access Admin routes.
- **`test_05_header_forwarding`**: Verifies Gateway appends `X-User` headers to internal requests.
  - **Expectation**: Downstream services correctly identify the user.

### Messaging (`tests/notification/`)

- **`test_06_rabbitmq_event_processing`**: End-to-end RabbitMQ check.
  - **Action**: Publishes `OrderPlacedEvent` to RabbitMQ.
  - **Expectation**: Notification service processes event and logs "SENT" (verified by log reading).

### Identity & Access (`tests/user/`)

- **`test_07_user_register`**: Creates a new user account through the Gateway.
  - **Expectation**: 201 Created and user record persists in `users.db`.
- **`test_08_user_login`**: Authenticates the new user.
  - **Expectation**: 200 OK and returns a valid JWT token.
- **`test_09_get_profile`**: Fetches the profile of the authenticated user.
  - **Expectation**: 200 OK and returns the correct email from the JWT payload.
- **`test_10_admin_list_users`**: Administrative check for the user directory.
  - **Expectation**: 200 OK and returns a full list of registered users.

### Inventory & Scheduling (`tests/movie/`)

- **`test_11_movie_create`**: Admin adds a new movie to the catalog.
  - **Expectation**: 201 Created and returned movie ID.
- **`test_12_movie_get_all` / `test_13_movie_get_detail`**: Public catalog access.
  - **Expectation**: 200 OK and returns correct movie metadata.
- **`test_14_movie_search`**: Tests the search indexing logic.
  - **Expectation**: Returns matches based on title/genre queries.
- **`test_15_room_list`**: Lists physical cinema halls.
  - **Expectation**: Returns the pre-seeded room data.
- **`test_16_showtime_create`**: Links a movie to a room/time/price.
  - **Expectation**: 201 Created and seat map is generated.
- **`test_17_showtime_list`**: Public viewing of movie schedules.
  - **Expectation**: Returns available slots for the given movie ID.

### 🎫 Booking & Transactions (`tests/booking/`)

- **`test_18_booking_grouped_seats`**: Validates multi-seat reservations in one transaction.
  - **Expectation**: One Booking ID represents all selected seats.
- **`test_19_booking_atomicity`**: The "Double Booking" safety check.
  - **Expectation**: 400 Bad Request if any seat in the group is already taken.
- **`test_20_booking_no_auth`**: Ensures bookings require a logged-in user.
  - **Expectation**: 401 Unauthorized.
- **`test_21_booking_my_list` / `test_22_booking_detail`**: User reservation history.
  - **Expectation**: Returns only the bookings belonging to the current user.
- **`test_23_booking_cascade_release`**: Tests the cleanup logic.
  - **Expectation**: Deleting a booking releases all associated seats immediately.

### Payments (`tests/payment/`)

- **`test_24_add_payment_method`**: Saves a card for the user.
  - **Expectation**: 201 Created.
- **`test_25_get_payment_methods`**: Lists the user's saved cards.
  - **Expectation**: Returns correctly masked card data.
- **`test_26_process_payment_success`**: The full checkout flow.
  - **Expectation**: 201 Created and Booking status updates to `confirmed`.
- **`test_27_payment_not_found`**: Handles invalid payment requests.
  - **Expectation**: 404 Not Found.
- **`test_28_delete_card`**: Removes sensitive payment data.
  - **Expectation**: 200 OK.

### Error Handling (`tests/test_errors/`)

- **`test_29_not_found_movie`**: Standard 404 test.
- **`test_30_bad_request_movie_creation`**: Validates field requirements.
  - **Expectation**: 400 Bad Request if fields are missing.
- **`test_31_duplicate_user`**: Prevents email collisions.
  - **Expectation**: 400 Bad Request if email exists.
- **`test_32_invalid_login`**: Tests password validation.
  - **Expectation**: 401 Unauthorized for wrong credentials.
- **`test_33_gateway_resilience`**: Simulated downstream failure.
  - **Expectation**: Gateway handles service timeouts without crashing.

---

## Execution Guide

### Docker (Recommended)

Just run the following command:

```bash
docker compose run --rm gateway python tests/test_api.py
```

### Manual

If a specific test fails, you can run it with increased verbosity:

```bash
# Set PYTHONPATH to include the src directory
$env:PYTHONPATH = "src" 

# Run a specific test with verbose output
python -m unittest -v tests.booking.test_booking
```

---

## Coverage & Validation Metrics

| Module | Test Count | Primary Scenario |
| :---: | :---: | :---: |
| **Gateway** | 5 | Security Proxy, Header Forwarding, Poster Access |
| **Messaging** | 1 | RabbitMQ E2E Integration |
| **User** | 4 | JWT Lifecycle, Admin RBAC |
| **Movie** | 7 | Search, Showtime Scheduling, Room Data |
| **Booking** | 6 | **Atomic Grouped Booking**, Seat Release |
| **Payment** | 5 | Transaction Flow, Saved Payment Methods |
| **Errors** | 5 | 404 Resilience, 400 Validation, Duplicate Handling |
| **Total** | **33** | **Full System Integrity Verified** |

---

## Troubleshooting

### "Database is locked"

This happens if multiple services write to the same SQLite file simultaneously. The `base.py` handles this with retries, but if it persists, ensure you aren't running the services manually while also running the test suite.

### Notification Test Skipping

If you see `Skipped: RabbitMQ connection failed`, check if the RabbitMQ container is healthy:
`docker ps` should show the rabbitmq container as `(healthy)`.

### Inspecting Logs

If a test hangs, check the logs directory:

- `logs/gateway_err.log`: Best place to see if a service is down or returning 500s.
- `logs/notification_out.log`: Verify RabbitMQ message processing.
