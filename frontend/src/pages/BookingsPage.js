import { bookTicket, getShowtimeSeats, processPayment, getShowtimeDetail, getShowtimes, getRoomById, getRooms } from '../api/apiClient.js';

const BookingsPage = {
  render: async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        return `
          <div class="container py-5 text-center">
            <div class="alert alert-warning d-inline-block">
              You need to <a href="/login" class="alert-link">login</a> to book tickets.
            </div>
          </div>
        `;
    }

    return `
      <div class="container py-4">
        <div class="row g-4">
            
            <!-- Sidebar -->
            <div class="col-lg-3 order-lg-2">
                
                <!-- Booking Summary Card -->
                <div class="card shadow-sm border-0 mb-3 sticky-top" style="top: 2rem; z-index: 20;">
                    <div class="card-header bg-primary text-white border-bottom-0 py-3">
                        <h5 class="fw-bold text-uppercase mb-0 text-center"><i class="bi bi-ticket-perforated"></i> Book Ticket</h5>
                        <div id="room-name-display" class="text-center small text-white-50 mt-1"></div>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <small class="text-muted d-block">Selected seats:</small>
                            <div id="selected-seat-display" class="fw-bold text-break text-primary">None selected</div>
                        </div>
                        <div class="mb-4">
                            <small class="text-muted d-block">Subtotal:</small>
                            <h4 id="total-price-display" class="fw-bold text-success mb-0">0 VND</h4>
                        </div>
                        <div class="d-grid">
                            <button id="confirm-booking-btn" class="btn btn-primary fw-bold py-2" disabled>
                                Book Now
                            </button>
                        </div>
                        <div id="booking-error" class="text-danger mt-2 text-center small"></div>
                    </div>
                </div>

                <!-- Schedule Picker -->
                <div class="card shadow-sm border-0">
                    <div class="card-header bg-white border-bottom-0 pt-3">
                        <h6 class="fw-bold text-uppercase mb-0 text-center text-muted">Other Showtimes</h6>
                    </div>
                    <div class="card-body p-2" id="schedule-picker-container">
                         <div class="text-center py-3"><div class="spinner-border spinner-border-sm text-secondary" role="status"></div></div>
                    </div>
                </div>
            </div>

            <!-- Main Content: Seat Selection -->
            <div class="col-lg-9 order-lg-1">
                <div id="booking-container" class="card shadow-sm border-0 bg-white">
                    <div class="card-body p-4">
                        <div class="text-center mb-4">
                            <h2 class="fw-bold">Seat Map</h2>
                            <p class="text-muted small">Screen at the front - Please select seats</p>
                        </div>

                        <!-- Cinema Screen -->
                        <div class="cinema-screen shadow-sm">SCREEN</div>
                        
                        <!-- Seat Map (Scrollable for IMAX) -->
                        <div class="table-responsive mb-5" style="overflow-x: auto;">
                            <div id="seat-map" class="d-flex flex-column align-items-center" style="min-width: max-content; margin: 0 auto; padding-bottom: 20px;">
                                <div class="spinner-border text-primary" role="status"></div>
                            </div>
                        </div>

                        <!-- Legend -->
                        <div class="d-flex justify-content-center gap-4 mb-3 text-muted small flex-wrap">
                            <div class="d-flex align-items-center">
                                <span class="seat-legend-item" style="background-color: #fff;"></span> Available
                            </div>
                            <div class="d-flex align-items-center">
                                <span class="seat-legend-item" style="background-color: var(--primary-color); border-color: var(--primary-color);"></span> Selected
                            </div>
                            <div class="d-flex align-items-center">
                                <span class="seat-legend-item booked"></span> Booked
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4 text-center">
                    <a href="/movies" class="text-decoration-none text-muted small">&larr; Back to movie list</a>
                </div>
            </div>
        </div>
      </div>
    `;
  },
  afterRender: async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const pathParts = window.location.pathname.split('/');
    const showtimeId = pathParts[2];
    
    const seatMap = document.getElementById('seat-map');
    const selectedDisplay = document.getElementById('selected-seat-display');
    const totalPriceDisplay = document.getElementById('total-price-display');
    const confirmBtn = document.getElementById('confirm-booking-btn');
    const errorMsg = document.getElementById('booking-error');
    const bookingContainer = document.getElementById('booking-container');
    const schedulePickerContainer = document.getElementById('schedule-picker-container');
    const roomNameDisplay = document.getElementById('room-name-display');

    let selectedSeats = [];
    let currentBookingIds = [];
    let ticketPrice = 50000; // Default fallback
    let allSeatsData = []; // Store seat data for price calc

    // --- Schedule Picker & Price Fetch Logic ---
    const initPageData = async () => {
        try {
            const currentShowtime = await getShowtimeDetail(showtimeId);
            
            if (currentShowtime) {
                ticketPrice = currentShowtime.price || 50000;
                
                // Fetch Room Name
                if (currentShowtime.room_id) {
                    try {
                        const room = await getRoomById(currentShowtime.room_id);
                        if (room && room.name) {
                            roomNameDisplay.innerText = room.name;
                        }
                    } catch (err) {
                        console.log("Could not fetch room details");
                    }
                }

                // Load Schedule Picker if movie_id exists
                if (currentShowtime.movie_id) {
                     loadSchedulePicker(currentShowtime.movie_id, currentShowtime.start_time);
                }
            } else {
                 schedulePickerContainer.innerHTML = '<p class="text-center text-muted small">Could not load information.</p>';
            }
        } catch (e) {
            console.error("Error loading page data:", e);
        }
    };

    const loadSchedulePicker = async (movieId, currentStartTime) => {
        try {
            const [allShowtimes, allRooms] = await Promise.all([
                getShowtimes(movieId),
                getRooms()
            ]);

            const roomMap = {};
            allRooms.forEach(r => roomMap[r.id] = r.name);

            const groupedShowtimes = {};
            
            allShowtimes.forEach(st => {
                const [dateStr, timeStr] = st.start_time.split(' ');
                if (!groupedShowtimes[dateStr]) groupedShowtimes[dateStr] = [];
                groupedShowtimes[dateStr].push({ ...st, time: timeStr });
            });
            const dates = Object.keys(groupedShowtimes).sort();
            
            // Current showtime date
            const currentDateStr = currentStartTime.split(' ')[0];
            const datesPerPage = 8;
            
            // Find page index for current date
            const currentIndex = dates.indexOf(currentDateStr);
            let currentPage = currentIndex !== -1 ? Math.floor(currentIndex / datesPerPage) : 0;
            const totalPages = Math.ceil(dates.length / datesPerPage);

            if (dates.length === 0) {
                 schedulePickerContainer.innerHTML = '<p class="text-center text-muted small">No other showtimes</p>';
                 return;
            }

            // Helper to format date for display
            const getDayDisplay = (dStr) => {
                const date = new Date(dStr);
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                return {
                    day: days[date.getDay()],
                    date: `${date.getDate()}/${date.getMonth() + 1}`
                };
            };

            const pickerHtml = `
                <div class="mb-2">
                    <label class="form-label small text-muted mb-0">Select Date</label>
                </div>
                <div class="d-flex align-items-stretch gap-2 mb-3">
                    <button id="prev-dates-btn" class="btn btn-outline-secondary btn-sm px-1" title="Previous dates">
                        <i class="bi bi-chevron-left"></i>
                    </button>
                    
                    <div class="date-scroller flex-grow-1" id="date-scroller">
                        <!-- Date items will be injected here -->
                    </div>

                    <button id="next-dates-btn" class="btn btn-outline-secondary btn-sm px-1" title="Next dates">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
                <div id="sidebar-times-container"></div>
            `;
            
            schedulePickerContainer.innerHTML = pickerHtml;

            const prevBtn = document.getElementById('prev-dates-btn');
            const nextBtn = document.getElementById('next-dates-btn');
            const scroller = document.getElementById('date-scroller');

            const renderDatePage = (activeDate) => {
                // Calculate slice
                const start = currentPage * datesPerPage;
                const end = start + datesPerPage;
                const pageDates = dates.slice(start, end);

                // Update Button States
                prevBtn.disabled = currentPage === 0;
                nextBtn.disabled = currentPage >= totalPages - 1;

                scroller.innerHTML = pageDates.map(dStr => {
                    const { day, date } = getDayDisplay(dStr);
                    const isActive = dStr === activeDate ? 'active' : '';
                    return `
                        <div class="date-scroller-item ${isActive}" data-date="${dStr}">
                            <span class="date-scroller-day">${day}</span>
                            <span class="date-scroller-date">${date}</span>
                        </div>
                    `;
                }).join('');

                // Add click events
                scroller.querySelectorAll('.date-scroller-item').forEach(el => {
                    el.addEventListener('click', () => {
                        const newDate = el.dataset.date;
                        // If selected date is NOT on current page (e.g. edge case), we might need to jump
                        // But here we are clicking ON the current page, so just re-render selection
                        renderDatePage(newDate); 
                        renderTimes(newDate); 
                    });
                });
            };

            // Pagination Controls
            prevBtn.addEventListener('click', () => {
                if (currentPage > 0) {
                    currentPage--;
                    renderDatePage(currentDateStr); // Maintain selection visualization if on page
                }
            });

            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages - 1) {
                    currentPage++;
                    renderDatePage(currentDateStr);
                }
            });

            const renderTimes = (selectedDate) => {
                const container = document.getElementById('sidebar-times-container');
                const shows = groupedShowtimes[selectedDate];

                if (!shows || shows.length === 0) {
                    container.innerHTML = '<p class="text-muted small text-center fst-italic">No showtimes for this date.</p>';
                    return;
                }
                
                shows.sort((a,b) => a.time.localeCompare(b.time));

                const html = `
                    <div class="d-grid gap-2">
                       ${shows.map(st => {
                           const isCurrent = st.id == showtimeId;
                           const btnClass = isCurrent 
                            ? 'btn-primary text-white' 
                            : 'btn-outline-secondary';
                           const href = isCurrent ? '#' : `/book/${st.id}`;
                           // Disable link if it's current
                           const pointerEvents = isCurrent ? 'pointer-events: none;' : '';
                           const roomName = roomMap[st.room_id] || 'Room';
                           
                           return `
                               <a href="${href}" class="btn btn-sm ${btnClass} d-flex flex-column align-items-center py-2" style="${pointerEvents}">
                                   <span class="fw-bold"><i class="bi bi-clock"></i> ${st.time}</span>
                                   <div class="small opacity-75 mt-1">
                                      <span class="me-1 border-end pe-1">${roomName}</span>
                                      <span>${st.price.toLocaleString()} VND</span>
                                   </div>
                               </a>
                           `;
                       }).join('')}
                   </div>
                `;
                container.innerHTML = html;
            };

            // Initial render
            renderDatePage(currentDateStr);
            renderTimes(currentDateStr);
            
        } catch (e) {
            console.error(e);
            schedulePickerContainer.innerHTML = '<p class="text-center text-danger small">Error loading schedule.</p>';
        }
    };

    initPageData();

    // --- Visual Update Logic ---

    const updateVisualSelection = () => {
        // Update Seat Styles
        document.querySelectorAll('.seat-item.available').forEach(el => {
            if (selectedSeats.includes(el.dataset.seat)) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
        
        // Update Sidebar Info
        if (selectedSeats.length > 0) {
            selectedDisplay.innerText = selectedSeats.join(', ');
            
            // Calculate Total
            let total = 0;
            selectedSeats.forEach(seatNum => {
                const seatObj = allSeatsData.find(s => s.seat_number === seatNum);
                const surcharge = seatObj ? (seatObj.price_surcharge || 0) : 0;
                total += (ticketPrice + surcharge);
            });
            
            totalPriceDisplay.innerText = total.toLocaleString() + ' VND';
            confirmBtn.disabled = false;
        } else {
            selectedDisplay.innerText = 'None selected';
            totalPriceDisplay.innerText = '0 VND';
            confirmBtn.disabled = true;
        }
    };

    const fetchSeats = async () => {
        try {
            const seats = await getShowtimeSeats(showtimeId);
            allSeatsData = seats; // Store for price calc
            
            // Group seats by row letter
            const rows = {};
            seats.forEach(seat => {
              const rowLetter = seat.seat_number.match(/[A-Z]+/)[0];
              if (!rows[rowLetter]) rows[rowLetter] = [];
              rows[rowLetter].push(seat);
            });

            seatMap.innerHTML = Object.keys(rows).sort().map(rowLetter => `
                <div class="seat-row">
                  <div class="seat-row-label">${rowLetter}</div>
                  ${rows[rowLetter].sort((a, b) => {
                    // Sort I1-2 before I3-4 etc.
                    const numA = parseInt(a.seat_number.match(/\d+/)[0]);
                    const numB = parseInt(b.seat_number.match(/\d+/)[0]);
                    return numA - numB;
                  }).map(seat => {
                      const isAvailable = seat.status === 'available';
                      const match = seat.seat_number.match(/\d+(-?\d+)?/);
                      const displayNum = match ? match[0] : '';
                      const startNum = parseInt(displayNum.split('-')[0]);
                      
                      // Determine Layout Classes
                      let typeClass = '';
                      if (seat.seat_type === 'VIP') typeClass = 'vip';
                      if (seat.seat_type === 'COUPLE') typeClass = 'couple';
                      
                      let aisleClass = '';
                      // Apply aisle to seats 3 and 8 in standard rows
                      if (rowLetter !== 'I' && (startNum === 3 || startNum === 8)) {
                          aisleClass = 'seat-aisle-right';
                      }

                      return `
                          <div class="seat-item ${isAvailable ? 'available' : 'booked'} ${typeClass} ${aisleClass}" 
                               data-seat="${seat.seat_number}" 
                               title="${seat.seat_number} (${seat.seat_type})">
                              ${displayNum}
                          </div>
                      `;
                  }).join('')}
                  <div class="seat-row-label">${rowLetter}</div>
                </div>
            `).join('');

            // Add Legend Items for new types
            const legendContainer = document.querySelector('.d-flex.justify-content-center.gap-4.mb-3');
            if (legendContainer && !legendContainer.querySelector('.vip')) {
                 legendContainer.innerHTML += `
                    <div class="d-flex align-items-center">
                        <span class="seat-legend-item vip"></span> VIP (+20k)
                    </div>
                    <div class="d-flex align-items-center">
                        <span class="seat-legend-item couple"></span> Couple (+50k)
                    </div>
                 `;
            }

            document.querySelectorAll('.seat-item.available').forEach(el => {
                el.addEventListener('click', () => {
                    const seat = el.dataset.seat;
                    if (selectedSeats.includes(seat)) {
                        selectedSeats = selectedSeats.filter(s => s !== seat);
                    } else {
                        selectedSeats.push(seat);
                    }
                    updateVisualSelection();
                });
            });
        } catch (err) {
            seatMap.innerHTML = `<div class="alert alert-danger">Error loading seat map: ${err.message}</div>`;
        }
    };

    confirmBtn.addEventListener('click', async () => {
        if (selectedSeats.length === 0) return;

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';
        errorMsg.innerText = '';

        try {
            // Send selectedSeats as array to bookTicket
            const response = await bookTicket({
                showtime_id: parseInt(showtimeId),
                seat_numbers: selectedSeats
            });

            // The backend now returns a single booking_id for multiple seats
            const bkId = response.booking_id || (response.booking_ids ? response.booking_ids[0] : null);
            const totalPrice = response.total_price || response.price;

            if (!bkId) throw new Error("Booking failed: No ID returned");

            // Redirect to Payment Page with single booking_id
            window.location.href = `/payment?booking_id=${bkId}&amount=${totalPrice}`;

        } catch (err) {
            errorMsg.innerText = err.message || 'An error occurred while booking.';
            confirmBtn.disabled = false;
            confirmBtn.innerText = 'Book Now';
        }
    });

    await fetchSeats();
  }
};

export default BookingsPage;
