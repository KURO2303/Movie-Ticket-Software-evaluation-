import { getMyBookings, deleteBooking } from '../api/apiClient.js';

const MyBookingsPage = {
  render: async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        return `
          <div class="container py-5 text-center">
            <div class="alert alert-warning d-inline-block">
              Please <a href="/login" class="alert-link">login</a> to view booked tickets.
            </div>
          </div>
        `;
    }

    return `
      <div class="container py-4">
        <h2 class="fw-bold mb-4">My Booked Tickets</h2>
        <div id="bookings-list-container">
            <div class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
            </div>
        </div>
      </div>
    `;
  },
  afterRender: async () => {
    const container = document.getElementById('bookings-list-container');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) return;

    const loadBookings = async () => {
        try {
            const bookings = await getMyBookings();
            
            if (!bookings || bookings.length === 0) {
                container.innerHTML = `
                  <div class="card border-0 shadow-sm text-center p-5">
                    <p class="text-muted mb-0">You haven't booked any tickets yet. <a href="/movies">Explore movies now!</a></p>
                  </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="table-responsive bg-white rounded shadow-sm">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th class="ps-4">Booking ID</th>
                        <th>Showtime</th>
                        <th>Seats</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th class="text-end pe-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${bookings.map(booking => {
                        const isPending = booking.status === 'PENDING_PAYMENT';
                        return `
                        <tr>
                          <td class="ps-4 fw-bold text-secondary">#${booking.id}</td>
                          <td>ID: ${booking.showtime_id}</td>
                          <td><span class="badge bg-light text-dark border">${booking.seat_number}</span></td>
                          <td>${booking.amount ? booking.amount.toLocaleString() : '0'} VND</td>
                          <td>
                            <span class="badge ${booking.status === 'confirmed' ? 'bg-success' : 'bg-warning text-dark'}">
                              ${booking.status === 'confirmed' ? 'Paid' : 'Pending Payment'}
                            </span>
                          </td>
                          <td class="text-end pe-4">
                             ${isPending ? `
                                <a href="/payment?booking_id=${booking.id}&amount=${booking.amount}" class="btn btn-sm btn-primary me-2">
                                    Pay
                                </a>
                             ` : ''}
                             <button class="btn btn-sm btn-outline-danger cancel-btn" data-id="${booking.id}">
                                Cancel Ticket
                             </button>
                          </td>
                        </tr>
                      `}).join('')}
                    </tbody>
                  </table>
                </div>
            `;

            // Attach Event Listeners
            document.querySelectorAll('.cancel-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    if (confirm(`Are you sure you want to cancel ticket #${id}?`)) {
                        try {
                            await deleteBooking(id);
                            alert('Ticket cancelled successfully.');
                            loadBookings(); // Reload list
                        } catch (err) {
                            alert('Error cancelling ticket: ' + err.message);
                        }
                    }
                });
            });

        } catch (err) {
            console.error('Failed to fetch bookings:', err);
            container.innerHTML = `<div class="alert alert-danger">Could not load booked tickets: ${err.message}</div>`;
        }
    };

    await loadBookings();
  }
};

export default MyBookingsPage;
