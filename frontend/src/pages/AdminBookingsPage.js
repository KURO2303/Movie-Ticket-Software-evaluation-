import { getAllBookings, deleteBooking, getShowtimeDetail } from '../api/apiClient.js';
import AdminSidebar from '../components/AdminSidebar.js';

const AdminBookingsPage = {
  render: async () => {
    return `
      <div class="admin-layout">
        ${AdminSidebar.render('bookings')}
        <div class="admin-content">
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="fw-bold mb-0">Manage Bookings</h2>
                    <div>
                        <input type="text" id="booking-search" class="form-control" placeholder="Search by email..." style="width: 250px;">
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th class="ps-4">ID</th>
                                        <th>User Email</th>
                                        <th>Showtime</th>
                                        <th>Seats</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th class="text-end pe-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="admin-bookings-list">
                                    <tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    `;
  },
  afterRender: async () => {
    AdminSidebar.afterRender();

    const list = document.getElementById('admin-bookings-list');
    const searchInput = document.getElementById('booking-search');

    let allBookings = [];
    let displayLimit = 50; // Performance: Don't render everything at once

    const renderList = (bookings) => {
        if (!bookings || bookings.length === 0) {
            list.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">No bookings found.</td></tr>';
            return;
        }

        // Sort by ID desc
        const sorted = [...bookings].sort((a,b) => b.id - a.id);
        const limited = sorted.slice(0, displayLimit);

        list.innerHTML = limited.map(b => `
          <tr id="booking-row-${b.id}">
            <td class="ps-4 fw-bold text-primary">#${b.id}</td>
            <td>
                <div class="fw-bold">${b.customer_email || b.email || 'N/A'}</div>
                <small class="text-muted" style="font-size: 0.7rem;">User ID: ${b.user_id || 'N/A'}</small>
            </td>
            <td>
                <div class="small">Showtime: <span class="fw-bold">#${b.showtime_id}</span></div>
            </td>
            <td><span class="badge bg-light text-dark border">${b.seat_number}</span></td>
            <td><span class="fw-bold text-success">${b.amount ? b.amount.toLocaleString() : 0}</span> <small>VND</small></td>
            <td>
                <span class="badge ${b.status === 'confirmed' ? 'bg-success' : 'bg-warning text-dark'} text-uppercase" style="font-size: 0.65rem;">
                    ${b.status}
                </span>
            </td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${b.id}" id="cancel-btn-${b.id}">
                    <i class="bi bi-trash"></i> Cancel
                </button>
            </td>
          </tr>
        `).join('');

        if (sorted.length > displayLimit) {
            list.innerHTML += `
                <tr>
                    <td colspan="7" class="text-center py-3 bg-light">
                        <button id="load-more-bookings" class="btn btn-sm btn-link text-decoration-none">
                            Showing ${displayLimit} of ${sorted.length} bookings. Load 50 more...
                        </button>
                    </td>
                </tr>
            `;
            document.getElementById('load-more-bookings')?.addEventListener('click', () => {
                displayLimit += 50;
                renderList(bookings);
            });
        }

        // Attach events
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => handleDelete(e.currentTarget.dataset.id));
        });
    };

    const loadData = async (silent = false) => {
        try {
            if (!silent) list.innerHTML = '<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></td></tr>';
            allBookings = await getAllBookings();
            renderList(allBookings);
        } catch (err) {
            list.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error loading data: ${err.message}</td></tr>`;
        }
    };

    const handleDelete = async (id) => {
        const btn = document.getElementById(`cancel-btn-${id}`);
        if (!confirm(`Are you sure you want to cancel booking #${id}? This will free up the seat.`)) return;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            
            await deleteBooking(id);
            
            // Remove row from UI immediately for "snappy" feel
            const row = document.getElementById(`booking-row-${id}`);
            if (row) row.style.opacity = '0.3';
            
            await loadData(true); // Silent reload in background
        } catch (err) {
            alert('Error: ' + err.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-trash"></i> Cancel';
        }
    };

    // Search Logic
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allBookings.filter(b => 
            (b.customer_email && b.customer_email.toLowerCase().includes(query)) ||
            (b.email && b.email.toLowerCase().includes(query)) ||
            (b.id.toString().includes(query))
        );
        renderList(filtered);
    });

    await loadData();
  }
};

export default AdminBookingsPage;
