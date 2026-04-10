import { getShowtimes, getMovies, createShowtime, updateShowtime, deleteShowtime, getRooms, getAllBookings } from '../api/apiClient.js';
import AdminSidebar from '../components/AdminSidebar.js';

const AdminShowtimesPage = {
  render: async () => {
    return `
      <div class="admin-layout">
        ${AdminSidebar.render('showtimes')}
        <div class="admin-content">
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="fw-bold mb-0">Manage Showtimes</h2>
                    <div class="d-flex align-items-center">
                        <input type="date" id="showtime-date-filter" class="form-control me-2 shadow-sm" style="width: auto;">
                        <button id="add-showtime-btn" class="btn btn-primary shadow-sm text-nowrap">
                            <i class="bi bi-plus-lg"></i> Add Showtime
                        </button>
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th class="ps-4">Movie</th>
                                        <th>Start</th>
                                        <th>End</th>
                                        <th>Ticket Price (VND)</th>
                                        <th>Revenue (VND)</th>
                                        <th class="text-end pe-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="admin-showtimes-list">
                                     <tr><td colspan="5" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                 <!-- Bootstrap Modal -->
                <div class="modal fade" id="showtimeModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-light">
                                <h5 class="modal-title fw-bold" id="modal-title">Add Showtime</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body p-4">
                                <form id="showtime-form">
                                    <input type="hidden" id="showtime-id">
                                    <div class="mb-3">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Movie</label>
                                        <select id="showtime-movie" class="form-select" required>
                                            <option value="">-- Select movie --</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Room</label>
                                        <select id="showtime-room" class="form-select" required>
                                            <option value="">-- Select room --</option>
                                        </select>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label text-muted small fw-bold text-uppercase">Date</label>
                                            <input type="date" id="showtime-date" class="form-control" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label text-muted small fw-bold text-uppercase">Time</label>
                                            <input type="time" id="showtime-time" class="form-control" required>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Price</label>
                                        <input type="number" id="showtime-price" class="form-control" required min="0">
                                    </div>
                                    <div class="text-end mt-4">
                                        <button type="button" class="btn btn-light me-2" data-bs-dismiss="modal">Cancel</button>
                                        <button type="submit" class="btn btn-primary px-4">Save</button>
                                    </div>
                                </form>
                            </div>
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

    const list = document.getElementById('admin-showtimes-list');
    const addBtn = document.getElementById('add-showtime-btn');
    const form = document.getElementById('showtime-form');
    const modalTitle = document.getElementById('modal-title');
    const dateFilter = document.getElementById('showtime-date-filter');
    
    // Initialize Bootstrap Modal
    const showtimeModal = new bootstrap.Modal(document.getElementById('showtimeModal'));

    // Inputs
    const idInput = document.getElementById('showtime-id');
    const movieSelect = document.getElementById('showtime-movie');
    const roomSelect = document.getElementById('showtime-room');
    const dateInput = document.getElementById('showtime-date');
    const timeInput = document.getElementById('showtime-time');
    const priceInput = document.getElementById('showtime-price');

    let showtimesData = [];
    let moviesData = [];
    let roomsData = [];
    let bookingsData = [];

    // Set Default Date Filter (Today)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    dateFilter.value = todayStr;

    const toLocalISO = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return ''; // Invalid date check
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    const formatDateForDB = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    const renderList = (showtimes = null) => {
        // Use showtimes argument or fallback to showtimesData
        const dataToRender = showtimes || showtimesData;
        
        // Filter by Date
        const selectedDate = dateFilter.value;
        const filtered = dataToRender.filter(st => {
            if (!st.start_time) return false;
            return st.start_time.startsWith(selectedDate);
        });

        // Sort by Time
        filtered.sort((a,b) => a.start_time.localeCompare(b.start_time));

        if (filtered.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">No showtimes found for this date.</td></tr>';
            return;
        }

        list.innerHTML = filtered.map(st => {
            const movie = moviesData.find(m => m.id === st.movie_id);
            const room = roomsData.find(r => r.id === st.room_id);
            const movieTitle = movie ? movie.title : `<span class="text-muted">Movie ID ${st.movie_id} (Deleted)</span>`;
            const roomName = room ? room.name : `<span class="text-muted">N/A</span>`;
            
            // Calculate Revenue
            const revenue = bookingsData
                .filter(b => b.showtime_id === st.id)
                .reduce((sum, b) => sum + (b.amount || 0), 0);
            
            // Format Time Display
            const timeStr = st.start_time.split(' ')[1];
            const endTimeStr = st.end_time.split(' ')[1];

            return `
              <tr>
                <td class="ps-4 fw-bold text-primary">
                  ${movieTitle}<br>
                  <small class="text-muted">${roomName}</small>
                </td>
                <td>${timeStr}</td>
                <td>${endTimeStr}</td>
                <td>${st.price ? st.price.toLocaleString() : '0'}</td>
                <td class="fw-bold text-success">${revenue.toLocaleString()}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary me-2 edit-btn" data-id="${st.id}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${st.id}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
              </tr>
            `;
        }).join('');

        // Attach events
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openEditModal(e.currentTarget.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => handleDelete(e.currentTarget.dataset.id));
        });
    };
    
    // Filter Event
    dateFilter.addEventListener('change', () => {
        renderList();
    });

    const loadData = async () => {
        try {
            const [movies, showtimes, rooms, bookings] = await Promise.all([
                getMovies(), 
                getShowtimes(),
                getRooms(),
                getAllBookings()
            ]);
            moviesData = movies;
            showtimesData = showtimes; // Store all data
            roomsData = rooms;
            bookingsData = bookings;
            
            // Populate Movie Select
            movieSelect.innerHTML = '<option value="">-- Select movie --</option>' + 
                movies.map(m => `<option value="${m.id}">${m.title}</option>`).join('');

            // Populate Room Select
            roomSelect.innerHTML = '<option value="">-- Select room --</option>' + 
                rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

            renderList(); // Initial Render
        } catch (err) {
            list.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error loading data: ${err.message}</td></tr>`;
        }
    };

    const openEditModal = (id) => {
        const showtime = showtimesData.find(s => s.id == id);
        if (showtime) {
            idInput.value = showtime.id;
            movieSelect.value = showtime.movie_id;
            roomSelect.value = showtime.room_id || '';
            
            // Split Start Time
            // format: YYYY-MM-DD HH:MM
            const parts = showtime.start_time.split(' ');
            dateInput.value = parts[0];
            timeInput.value = parts[1];

            priceInput.value = showtime.price;
            
            modalTitle.innerText = 'Edit Showtime';
            showtimeModal.show();
        }
    };

    addBtn.addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        modalTitle.innerText = 'Add Showtime';
        
        // Pre-fill Date from Filter
        dateInput.value = dateFilter.value;
        timeInput.value = '';
        
        showtimeModal.show();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = idInput.value;
        
        const movieId = parseInt(movieSelect.value);
        const roomId = parseInt(roomSelect.value);
        const selectedMovie = moviesData.find(m => m.id === movieId);
        
        if (!selectedMovie) {
            alert("Please select a valid movie");
            return;
        }

        // Combine Date and Time
        const startDateStr = `${dateInput.value}T${timeInput.value}`;
        const startDate = new Date(startDateStr);
        
        if (isNaN(startDate.getTime())) {
             alert("Invalid date/time");
             return;
        }

        const endDate = new Date(startDate.getTime() + selectedMovie.duration * 60000);

        const data = {
            movie_id: movieId,
            room_id: roomId,
            start_time: formatDateForDB(startDate),
            end_time: formatDateForDB(endDate),
            price: parseFloat(priceInput.value)
        };

        try {
            if (id) {
                await updateShowtime(id, data);
            } else {
                await createShowtime(data);
            }
            showtimeModal.hide();
            loadData();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this showtime?')) {
            try {
                await deleteShowtime(id);
                loadData();
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }
    };

    await loadData();
  }
};

export default AdminShowtimesPage;