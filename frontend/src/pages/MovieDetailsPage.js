import { getMovieById, getShowtimes, getRooms, API_GATEWAY_URL } from '../api/apiClient.js';

const MovieDetailsPage = {
  render: async () => {
    return `
      <div class="container py-4">
        <nav aria-label="breadcrumb" class="mb-4">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="/movies">Movies</a></li>
            <li class="breadcrumb-item active" aria-current="page">Details</li>
          </ol>
        </nav>
        <div id="movie-detail-container">
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  afterRender: async () => {
    const container = document.getElementById('movie-detail-container');
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[2];

    if (!id) {
        container.innerHTML = '<div class="alert alert-warning">Movie ID not found.</div>';
        return;
    }

    try {
        const [movie, showtimes, allRooms] = await Promise.all([
            getMovieById(id),
            getShowtimes(id),
            getRooms()
        ]);

        if (!movie) {
             container.innerHTML = '<div class="alert alert-danger">Movie not found.</div>';
             return;
        }

        const roomMap = {};
        allRooms.forEach(r => roomMap[r.id] = r.name);

        // --- Logic: Group Showtimes by Date ---
        const groupedShowtimes = {};
        showtimes.forEach(st => {
            // st.start_time is "YYYY-MM-DD HH:MM"
            const [dateStr, timeStr] = st.start_time.split(' ');
            if (!groupedShowtimes[dateStr]) {
                groupedShowtimes[dateStr] = [];
            }
            groupedShowtimes[dateStr].push({ ...st, time: timeStr });
        });

        // Sort dates
        const dates = Object.keys(groupedShowtimes).sort();
        
        // Helper to format date label
        const getDayLabel = (dateStr) => {
            const date = new Date(dateStr);
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return {
                day: days[date.getDay()],
                date: `${date.getDate()}/${date.getMonth() + 1}`
            };
        };

        // Render Structure
        container.innerHTML = `
            <div class="row g-5">
              <div class="col-md-4">
                <div class="card border-0 shadow-lg sticky-top" style="top: 2rem; z-index: 1; border-radius: 12px; overflow: hidden;">
                  ${movie.image_url ? `
                    <img src="${API_GATEWAY_URL}/movies/posters/${movie.image_url}" 
                         class="img-fluid movie-poster" 
                         style="aspect-ratio: 2/3; width: 100%; height: auto; object-fit: cover;"
                         alt="${movie.title}"
                         onerror="this.parentElement.innerHTML='<div class=\\'movie-poster d-flex align-items-center justify-content-center bg-dark text-white\\' style=\\'aspect-ratio: 2/3; width: 100%; height: auto;\\'><h1 class=\\'display-1\\'>🎬</h1></div>'">
                  ` : `
                    <div class="movie-poster d-flex align-items-center justify-content-center bg-dark text-white" style="aspect-ratio: 2/3; width: 100%; height: auto;">
                      <h1 class="display-1">🎬</h1>
                    </div>
                  `}
                </div>
              </div>
              <div class="col-md-8">
                <h1 class="fw-bold mb-2">${movie.title}</h1>
                <div class="mb-4">
                  <span class="badge bg-primary me-2">${movie.genre}</span>
                  <span class="badge bg-secondary me-2">${movie.duration} minutes</span>
                  <span class="text-muted small">Release Date: ${new Date(movie.release_date).toLocaleDateString()}</span>
                </div>
                
                <p class="lead text-muted mb-5">${movie.description || 'No description available for this movie.'}</p>
                
                <h4 class="fw-bold mb-4">Showtimes Schedule</h4>
                
                <div id="schedule-container">
                    <!-- Calendar View -->
                    <div class="calendar-container mb-4">
                        <div class="calendar-header">
                            <button id="prev-month-btn" class="btn btn-outline-secondary btn-sm">
                                <i class="bi bi-chevron-left"></i> Previous
                            </button>
                            <h5 id="current-month-label" class="mb-0 fw-bold">Month Year</h5>
                            <button id="next-month-btn" class="btn btn-outline-secondary btn-sm">
                                Next <i class="bi bi-chevron-right"></i>
                            </button>
                        </div>
                        <div class="calendar-grid">
                            <div class="calendar-day-label">Sun</div>
                            <div class="calendar-day-label">Mon</div>
                            <div class="calendar-day-label">Tue</div>
                            <div class="calendar-day-label">Wed</div>
                            <div class="calendar-day-label">Thu</div>
                            <div class="calendar-day-label">Fri</div>
                            <div class="calendar-day-label">Sat</div>
                        </div>
                        <div id="calendar-body" class="calendar-grid border-top">
                            <!-- Days will be injected here -->
                        </div>
                    </div>

                    <!-- Selected Day Info -->
                    <div id="selected-day-header" class="mb-3 d-none">
                        <h5 class="fw-bold">Showtimes for <span id="display-date">...</span></h5>
                    </div>

                    <!-- Times Grid -->
                    <div id="showtimes-grid"></div>
                </div>
              </div>
            </div>
        `;

        // --- Calendar Logic ---
        const calendarBody = document.getElementById('calendar-body');
        const monthLabel = document.getElementById('current-month-label');
        const prevMonthBtn = document.getElementById('prev-month-btn');
        const nextMonthBtn = document.getElementById('next-month-btn');
        const timesGrid = document.getElementById('showtimes-grid');
        const selectedDayHeader = document.getElementById('selected-day-header');
        const displayDateSpan = document.getElementById('display-date');

        if (showtimes.length === 0) {
            timesGrid.innerHTML = '<div class="alert alert-info">No showtimes available for this movie.</div>';
            return;
        }

        // Initialize to current month or month of first showtime
        let currentViewDate = new Date();
        if (dates.length > 0) {
            const firstShowDate = new Date(dates[0]);
            // If first show is in the future, start there
            if (firstShowDate > currentViewDate) {
                currentViewDate = new Date(firstShowDate.getFullYear(), firstShowDate.getMonth(), 1);
            }
        }

        const renderTimes = (dateStr) => {
            const shows = groupedShowtimes[dateStr];
            selectedDayHeader.classList.remove('d-none');
            const d = new Date(dateStr);
            displayDateSpan.textContent = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            if (!shows) {
                timesGrid.innerHTML = '<div class="alert alert-warning">No shows found for this date.</div>';
                return;
            }
            shows.sort((a,b) => a.time.localeCompare(b.time));

            timesGrid.innerHTML = `
                <div class="row g-3">
                    ${shows.map(st => {
                        const roomName = roomMap[st.room_id] || 'Room';
                        return `
                        <div class="col-6 col-sm-4 col-md-3 col-lg-2">
                            <a href="/book/${st.id}" class="btn btn-outline-primary w-100 h-100 d-flex flex-column justify-content-center align-items-center p-3 shadow-sm">
                                <span class="fw-bold mb-1 fs-5">${st.time}</span>
                                <div class="small text-muted" style="font-size: 0.75rem;">
                                    <div class="border-top pt-1 mt-1">${roomName}</div>
                                    <div class="fw-bold text-dark">${st.price.toLocaleString()} VND</div>
                                </div>
                            </a>
                        </div>
                        `;
                    }).join('')}
                </div>
            `;
        };

        const renderCalendar = (baseDate, activeDateStr = null) => {
            const year = baseDate.getFullYear();
            const month = baseDate.getMonth();
            
            monthLabel.textContent = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            // Get first day of month and last day of month
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // Fill start of week with prev month days
            const days = [];
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            for (let i = firstDay.getDay(); i > 0; i--) {
                days.push({ 
                    day: prevMonthLastDay - i + 1, 
                    currentMonth: false,
                    dateStr: null // Don't allow selecting other month days for now
                });
            }

            // Current month days
            for (let i = 1; i <= lastDay.getDate(); i++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                days.push({
                    day: i,
                    currentMonth: true,
                    dateStr: dateStr,
                    hasShows: !!groupedShowtimes[dateStr],
                    showCount: groupedShowtimes[dateStr]?.length || 0
                });
            }

            // Fill end of week
            const remaining = 42 - days.length; // 6 rows of 7
            for (let i = 1; i <= remaining; i++) {
                days.push({
                    day: i,
                    currentMonth: false,
                    dateStr: null
                });
            }

            calendarBody.innerHTML = days.map(d => {
                const isCurrentMonth = d.currentMonth ? '' : 'not-current-month';
                const hasShows = d.hasShows ? 'has-shows' : '';
                const isActive = d.dateStr === activeDateStr ? 'active' : '';
                
                return `
                    <div class="calendar-day ${isCurrentMonth} ${isActive}" data-date="${d.dateStr || ''}">
                        <span class="calendar-day-num">${d.day}</span>
                        <div class="calendar-day-indicator">
                            ${d.showCount > 0 ? `<span class="showtime-count">${d.showCount} shows</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // Add Events
            calendarBody.querySelectorAll('.calendar-day').forEach(el => {
                const ds = el.dataset.date;
                if (!ds) return;
                
                el.addEventListener('click', () => {
                    // Remove active from all
                    calendarBody.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('active'));
                    el.classList.add('active');
                    renderTimes(ds);
                });
            });
        };

        // Navigation
        prevMonthBtn.addEventListener('click', () => {
            currentViewDate.setMonth(currentViewDate.getMonth() - 1);
            renderCalendar(currentViewDate);
        });

        nextMonthBtn.addEventListener('click', () => {
            currentViewDate.setMonth(currentViewDate.getMonth() + 1);
            renderCalendar(currentViewDate);
        });

        // Initial Render
        // Find first available date to show
        const firstAvailableDate = dates.length > 0 ? dates[0] : null;
        renderCalendar(currentViewDate, firstAvailableDate);
        if (firstAvailableDate) {
            renderTimes(firstAvailableDate);
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
  }
};

export default MovieDetailsPage;
