import { getMovies, createMovie, updateMovie, deleteMovie, getAllBookings, getShowtimes, uploadMoviePoster, API_GATEWAY_URL } from '../api/apiClient.js';
import AdminSidebar from '../components/AdminSidebar.js';

const AdminMoviesPage = {
  render: async () => {
    return `
      <div class="admin-layout">
        ${AdminSidebar.render('movies')}
        <div class="admin-content">
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="fw-bold mb-0">Manage Movies</h2>
                    <button id="add-movie-btn" class="btn btn-primary shadow-sm">
                        <i class="bi bi-plus-lg"></i> Add New Movie
                    </button>
                </div>

                <div class="card border-0 shadow-sm overflow-hidden">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-4" style="width: 80px;">Poster</th>
                                    <th>Title</th>
                                    <th>Genre</th>
                                    <th>Duration</th>
                                    <th>Release Date</th>
                                    <th>Revenue (VND)</th>
                                    <th class="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="admin-movies-list">
                                <!-- Movies injected here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div class="modal fade" id="movieModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="modal-title">Add Movie</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="movie-form">
                <input type="hidden" id="movie-id">
                <div class="row g-3">
                  <div class="col-md-8">
                    <div class="mb-3">
                      <label class="form-label">Title</label>
                      <input type="text" id="movie-title" class="form-control" required>
                    </div>
                    <div class="row">
                      <div class="col-md-6 mb-3">
                        <label class="form-label">Genre</label>
                        <input type="text" id="movie-genre" class="form-control" placeholder="Action, Drama..." required>
                      </div>
                      <div class="col-md-6 mb-3">
                        <label class="form-label">Duration (mins)</label>
                        <input type="number" id="movie-duration" class="form-control" required>
                      </div>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Release Date</label>
                      <input type="date" id="movie-release-date" class="form-control" required>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Image URL (Optional)</label>
                      <input type="text" id="movie-image-url" class="form-control" placeholder="image.jpg">
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Upload Poster File</label>
                      <input type="file" id="movie-file" class="form-control" accept="image/*">
                      <div class="form-text">Choose a file to upload or enter a URL above.</div>
                    </div>
                  </div>
                  <div class="col-md-4">
                     <label class="form-label d-block">Poster Preview</label>
                     <div id="poster-preview" class="border rounded bg-light d-flex align-items-center justify-content-center text-muted overflow-hidden" style="height: 300px;">
                        🎬
                     </div>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" form="movie-form" class="btn btn-primary">Save Movie</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  afterRender: async () => {
    AdminSidebar.afterRender();
    const list = document.getElementById('admin-movies-list');
    const addBtn = document.getElementById('add-movie-btn');
    const form = document.getElementById('movie-form');
    const modalTitle = document.getElementById('modal-title');
    
    // Initialize Bootstrap Modal
    const movieModal = new bootstrap.Modal(document.getElementById('movieModal'));

    // Inputs
    const idInput = document.getElementById('movie-id');
    const titleInput = document.getElementById('movie-title');
    const genreInput = document.getElementById('movie-genre');
    const durationInput = document.getElementById('movie-duration');
    const releaseDateInput = document.getElementById('movie-release-date');
    const imageUrlInput = document.getElementById('movie-image-url');
    const fileInput = document.getElementById('movie-file');
    const posterPreview = document.getElementById('poster-preview');

    let moviesData = [];
    let bookingsData = [];
    let showtimesData = [];

    // Preview image on selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            imageUrlInput.value = ''; // Clear the text input when a file is selected
            const reader = new FileReader();
            reader.onload = (e) => {
                posterPreview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
            };
            reader.readAsDataURL(file);
        }
    });

    const updatePreview = (url) => {
        if (url) {
            posterPreview.innerHTML = `<img src="${API_GATEWAY_URL}/movies/posters/${url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerHTML='🎬'">`;
        } else {
            posterPreview.innerHTML = '<span class="text-muted">🎬</span>';
        }
    };

    const renderList = (movies) => {
        moviesData = movies;
        if (movies.length === 0) {
            list.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">No movies yet.</td></tr>';
            return;
        }
        list.innerHTML = movies.map(movie => {
            // Find showtimes for this movie
            const movieShowtimes = showtimesData.filter(st => st.movie_id === movie.id);
            const showtimeIds = movieShowtimes.map(st => st.id);
            
            // Sum revenue of bookings for these showtimes
            const revenue = bookingsData
                .filter(b => showtimeIds.includes(b.showtime_id))
                .reduce((sum, b) => sum + (b.amount || 0), 0);

            return `
              <tr>
                <td class="ps-4">
                    ${movie.image_url ? `
                        <img src="${API_GATEWAY_URL}/movies/posters/${movie.image_url}" 
                             class="rounded shadow-sm" 
                             style="width: 45px; height: 60px; object-fit: cover;"
                             alt="${movie.title}"
                             onerror="this.parentElement.innerHTML='<div class=\\'rounded shadow-sm bg-dark text-white d-flex align-items-center justify-content-center\\' style=\\'width: 45px; height: 60px;\\'>🎬</div>'">
                    ` : `
                        <div class="rounded shadow-sm bg-dark text-white d-flex align-items-center justify-content-center" style="width: 45px; height: 60px;">
                            🎬
                        </div>
                    `}
                </td>
                <td class="fw-bold text-primary">${movie.title}</td>
                <td><span class="badge bg-light text-dark border">${movie.genre}</span></td>
                <td>${movie.duration} minutes</td>
                <td>${new Date(movie.release_date).toLocaleDateString()}</td>
                <td class="fw-bold text-success">${revenue.toLocaleString()}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary me-2 edit-btn" data-id="${movie.id}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${movie.id}">
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

    const fetchMovies = async () => {
        try {
            const [movies, bookings, showtimes] = await Promise.all([
                getMovies(),
                getAllBookings(),
                getShowtimes()
            ]);
            bookingsData = bookings;
            showtimesData = showtimes;
            renderList(movies);
        } catch (err) {
            list.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-5">Error: ${err.message}</td></tr>`;
        }
    };

    const openEditModal = (id) => {
        const movie = moviesData.find(m => m.id == id);
        if (!movie) return;
        
        modalTitle.innerText = 'Edit Movie';
        idInput.value = movie.id;
        titleInput.value = movie.title;
        genreInput.value = movie.genre;
        durationInput.value = movie.duration;
        releaseDateInput.value = movie.release_date;
        imageUrlInput.value = movie.image_url || '';
        fileInput.value = ''; // Reset file input
        updatePreview(movie.image_url);
        movieModal.show();
    };

    addBtn.addEventListener('click', () => {
        modalTitle.innerText = 'Add Movie';
        form.reset();
        idInput.value = '';
        updatePreview('');
        movieModal.show();
    });

    imageUrlInput.addEventListener('input', (e) => {
        if (e.target.value) {
            fileInput.value = ''; // Clear file selection if typing a URL
        }
        updatePreview(e.target.value);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = idInput.value;

        let finalImageUrl = imageUrlInput.value;

        // 1. Handle File Upload if new file selected
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

            if (!allowedTypes.includes(file.type)) {
                alert('Please upload a valid image file (JPG, PNG, GIF, or WEBP).');
                return;
            }

            try {
                const uploadRes = await uploadMoviePoster(file);
                finalImageUrl = uploadRes.filename;
            } catch (err) {
                alert('Upload failed: ' + err.message);
                return;
            }
        }

        const data = {
            title: titleInput.value,
            genre: genreInput.value,
            duration: parseInt(durationInput.value),
            release_date: releaseDateInput.value,
            image_url: finalImageUrl
        };

        try {
            if (id) {
                await updateMovie(id, data);
            } else {
                await createMovie(data);
            }
            movieModal.hide();
            fetchMovies();
        } catch (err) {
            alert('Failed to save movie: ' + err.message);
        }
    });

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this movie? This will also cancel all associated showtimes and refund customers!')) return;
        try {
            await deleteMovie(id);
            fetchMovies();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    await fetchMovies();
  }
};

export default AdminMoviesPage;
