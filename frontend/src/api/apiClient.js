// src/api/apiClient.js

// Base URL for API Gateway. It runs on port 5005 by default.
export const API_GATEWAY_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5005/api';

// Helper function to make fetch requests with Authorization header if available
export async function request(endpoint, options = {}) {
  const user = localStorage.getItem('user');
  const userToken = user ? JSON.parse(user).token : null;
  const userEmail = user ? JSON.parse(user).email : null;

  const headers = {
    'Content-Type': 'application/json',
    'peko-key': 'BO_CHIKA',
    ...(options.headers || {}),
  };

  // Add Authorization header if token exists
  if (userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
  }
  // Add X-User-Email header if email exists
  if (userEmail) {
    headers['X-User-Email'] = userEmail;
  }

  const url = `${API_GATEWAY_URL}/${endpoint}`;

  try {
    const response = await fetch(url, { ...options, headers });

    // Handle 401 Unauthorized (Token invalid or expired)
    if (response.status === 401) {
      console.warn('Session expired or invalid token. Logging out...');
      localStorage.removeItem('user');
      window.location.href = '/login'; 
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      // Handle other HTTP errors
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { error: 'Unknown server error' };
      }
      
      const errorMessage = errorData.error || `Error ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null;
    }
    return await response.json();

  } catch (error) {
    console.error('API request failed:', error);
    
    // Distinguish Network Error from Server Error
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to Server (Gateway is down or Network error)');
    }
    
    throw error;
  }
}

// Helper function for login
export async function loginUser(credentials) {
  // credentials: { username (or email), password }
  return request('auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

// Register new account
export async function registerUser(credentials) {
  // credentials: { email, password }
  return request('auth/register', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function getUserProfile() {
  return request('users/me', { method: 'GET' });
}

// --- Movies & Showtimes APIs ---

// Get list of movies
export async function getMovies(query = '') {
  const endpoint = query ? `movies?query=${encodeURIComponent(query)}` : 'movies';
  return request(endpoint, { method: 'GET' });
}

// Get details of a movie
export async function getMovieById(id) {
  return request(`movies/${id}`, { method: 'GET' });
}

// Get showtimes for a movie (or all if movieId is null)
export async function getShowtimes(movieId = null) {
  const endpoint = movieId ? `showtimes?movie_id=${encodeURIComponent(movieId)}` : 'showtimes';
  return request(endpoint, { method: 'GET' });
}

// Get details of a showtime
export async function getShowtimeDetail(id) {
  return request(`showtimes/${id}`, { method: 'GET' });
}

// Get seats of a showtime
export async function getShowtimeSeats(showtimeId) {
  return request(`showtimes/${showtimeId}/seats`, { method: 'GET' });
}

// Get list of rooms
export async function getRooms() {
  return request('rooms', { method: 'GET' });
}

export async function getRoomById(id) {
  return request(`rooms/${id}`, { method: 'GET' });
}

// --- Booking APIs ---

// Book ticket
export async function bookTicket(bookingData) {
  // bookingData: { showtime_id, seat_number }
  // User email is automatically added by request function (via X-User-Email header)
  return request('bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}

// Get my bookings
export async function getMyBookings() {
  return request('bookings/my', { method: 'GET' });
}

export async function getBookingById(id) {
  return request(`bookings/${id}`, { method: 'GET' });
}

// Get all bookings (Admin)
export async function getAllBookings() {
  return request('bookings', { method: 'GET' });
}

// Get all users (Admin)
export async function getAllUsers() {
  return request('users', { method: 'GET' });
}

export async function updateUser(id, userData) {
  return request(`users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
}

// Process payment
export async function processPayment(paymentData) {
  // paymentData: { booking_id }
  return request('payments', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
}

// Delete booking
export async function deleteBooking(id) {
  return request(`bookings/${id}`, { method: 'DELETE' });
}

// Get saved payment methods
export async function getPaymentMethods() {
  return request('payment-methods', { method: 'GET' });
}

// Save new card
export async function savePaymentMethod(cardData) {
  // cardData: { card_number, card_holder }
  return request('payment-methods', {
    method: 'POST',
    body: JSON.stringify(cardData),
  });
}

// Delete card
export async function deletePaymentMethod(id) {
  return request(`payment-methods/${id}`, { method: 'DELETE' });
}

// Update card
export async function updatePaymentMethod(id, data) {
  return request(`payment-methods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// --- Admin APIs (Movies) ---

export async function uploadMoviePoster(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  // Custom fetch since request helper forces application/json
  const user = localStorage.getItem('user');
  const userToken = user ? JSON.parse(user).token : null;

  const headers = {
    'peko-key': 'BO_CHIKA',
  };
  if (userToken) headers['Authorization'] = `Bearer ${userToken}`;

  const response = await fetch(`${API_GATEWAY_URL}/movies/upload`, {
    method: 'POST',
    body: formData,
    headers
  });

  if (!response.ok) throw new Error('Failed to upload image');
  return await response.json();
}

export async function createMovie(movieData) {
  return request('movies', {
    method: 'POST',
    body: JSON.stringify(movieData),
  });
}

export async function updateMovie(id, movieData) {
  return request(`movies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(movieData),
  });
}

export async function deleteMovie(id) {
  return request(`movies/${id}`, {
    method: 'DELETE',
  });
}

// --- Admin APIs (Showtimes) ---

export async function createShowtime(showtimeData) {
  return request('showtimes', {
    method: 'POST',
    body: JSON.stringify(showtimeData),
  });
}

export async function updateShowtime(id, showtimeData) {
  return request(`showtimes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(showtimeData),
  });
}

export async function deleteShowtime(id) {
  return request(`showtimes/${id}`, {
    method: 'DELETE',
  });
}