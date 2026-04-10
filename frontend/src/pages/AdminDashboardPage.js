
// v1.1.0 - Cache-busting comment added
import AdminSidebar from '../components/AdminSidebar.js';
import { getMovies, getAllBookings, getAllUsers, getShowtimes } from '../api/apiClient.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminDashboardPage = {
  render: async () => {
    console.log("AdminDashboardPage: Rendering v1.1.0...");
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Fetch Data
    let moviesCount = 0;
    let revenue = 0;
    let bookingsCount = 0;
    let usersCount = 0;
    let recentActivity = [];

    let moviesList = [];
    let bookingsList = [];
    let usersList = [];
    let showtimesList = [];

    try {
        console.log("AdminDashboardPage: Fetching all data...");
        const [m, b, u, s] = await Promise.all([
            getMovies(),
            getAllBookings(),
            getAllUsers(),
            getShowtimes()
        ]);
        
        moviesList = Array.isArray(m) ? m : [];
        bookingsList = Array.isArray(b) ? b : [];
        usersList = Array.isArray(u) ? u : [];
        showtimesList = Array.isArray(s) ? s : [];

        console.log("AdminDashboardPage: Data results:", { 
            movies: moviesList.length, 
            bookings: bookingsList.length, 
            users: usersList.length 
        });

        moviesCount = moviesList.length;
        bookingsCount = bookingsList.length;
        revenue = bookingsList.reduce((sum, b) => sum + (b.amount || 0), 0);
        
        // Get last 5 bookings for activity
        recentActivity = [...bookingsList].sort((a,b) => b.id - a.id).slice(0, 5);
        
        usersCount = usersList.filter(u => u.role === 'customer').length;

    } catch (e) {
        console.error("Error fetching dashboard stats:", e);
    }

    const formatCurrency = (val) => {
        return val.toLocaleString('vi-VN') + ' VND';
    };

    return `
      <div class="admin-layout">
        ${AdminSidebar.render('dashboard')}
        
        <div class="admin-content">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="fw-bold mb-0">Dashboard Overview</h2>
                <div class="text-muted">Hello, <span class="fw-bold text-dark">${user.email}</span></div>
            </div>

            <!-- Stats Row -->
            <div class="row g-4 mb-4">
                <div class="col-md-3">
                    <div class="card stat-card bg-primary text-white h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-white-50 text-uppercase small fw-bold">Total Movies</h6>
                                    <h2 class="mb-0 fw-bold">${moviesCount}</h2>
                                </div>
                                <i class="bi bi-film fs-1 opacity-50"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card stat-card bg-success text-white h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-white-50 text-uppercase small fw-bold">Revenue</h6>
                                    <h2 class="mb-0 fw-bold">${(revenue/1000000).toFixed(1)}M</h2>
                                    <small class="text-white-50" style="font-size: 0.7rem;">${formatCurrency(revenue)}</small>
                                </div>
                                <i class="bi bi-currency-dollar fs-1 opacity-50"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card stat-card bg-warning text-dark h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-black-50 text-uppercase small fw-bold">Booked Tickets</h6>
                                    <h2 class="mb-0 fw-bold">${bookingsCount}</h2>
                                </div>
                                <i class="bi bi-ticket-perforated fs-1 opacity-50"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card stat-card bg-info text-white h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-white-50 text-uppercase small fw-bold">Customers</h6>
                                    <h2 class="mb-0 fw-bold">${usersCount}</h2>
                                </div>
                                <i class="bi bi-people fs-1 opacity-50"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions & Recent Activity -->
            <div class="row g-4">
                <div class="col-lg-8">
                    <div class="card shadow-sm border-0 h-100">
                        <div class="card-header bg-white py-3 fw-bold border-bottom">
                            <i class="bi bi-clock-history"></i> Recent Booking Activity
                        </div>
                        <div class="list-group list-group-flush">
                             ${recentActivity.length === 0 ? '<div class="p-4 text-center text-muted">No activity yet.</div>' : ''}
                             ${recentActivity.map(b => `
                                 <div class="list-group-item px-4 py-3">
                                    <div class="d-flex w-100 justify-content-between">
                                        <h6 class="mb-1 text-primary">Booking #${b.id}</h6>
                                        <small class="text-muted fw-bold">${b.amount ? b.amount.toLocaleString() : 0} VND</small>
                                    </div>
                                    <p class="mb-1 small">
                                        Customer: <strong>${b.customer_email || b.email || 'Unknown'}</strong><br>
                                        Seat: ${b.seat_number}
                                    </p>
                                 </div>
                             `).join('')}
                             
                             <div class="list-group-item px-4 py-3 text-center text-muted small bg-light">
                                <a href="/admin/bookings/manage" class="text-decoration-none">View all activity</a>
                             </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card shadow-sm border-0 h-100">
                        <div class="card-header bg-white py-3 fw-bold border-bottom">
                            <i class="bi bi-lightning-charge"></i> Quick Actions
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-3">
                                <a href="/admin/movies/manage" class="btn btn-outline-primary text-start p-3">
                                    <i class="bi bi-film me-2"></i> Manage Movies
                                </a>
                                <a href="/admin/showtimes/manage" class="btn btn-outline-dark text-start p-3">
                                    <i class="bi bi-calendar-plus me-2"></i> Add Showtime
                                </a>
                                <button id="export-report-btn" class="btn btn-outline-success text-start p-3">
                                    <i class="bi bi-file-earmark-spreadsheet me-2"></i> Export CSV
                                </button>
                                <button id="export-pdf-btn" class="btn btn-outline-danger text-start p-3">
                                    <i class="bi bi-file-earmark-pdf me-2"></i> Export PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    `;
  },
  afterRender: () => {
     AdminSidebar.afterRender();
     
     // Helper for data prep
     const fetchData = async () => {
         return await Promise.all([
            getMovies(),
            getAllBookings(),
            getShowtimes()
         ]);
     };

     const exportPdfBtn = document.getElementById('export-pdf-btn');
     if (exportPdfBtn) {
         exportPdfBtn.addEventListener('click', async () => {
             try {
                 exportPdfBtn.disabled = true;
                 exportPdfBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generating...';
                 
                 const [movies, bookings, showtimes] = await fetchData();
                 
                 const doc = new jsPDF();
                 
                 // Title
                 doc.setFontSize(18);
                 doc.text('Revenue Report', 14, 22);
                 doc.setFontSize(11);
                 doc.setTextColor(100);
                 doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
                 
                 // Table Data
                 const tableData = movies.map(movie => {
                     const movieShowtimeIds = showtimes
                        .filter(s => s.movie_id === movie.id)
                        .map(s => s.id);
                     
                     const movieBookings = bookings.filter(b => movieShowtimeIds.includes(b.showtime_id));
                     const totalRevenue = movieBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
                     const totalTickets = movieBookings.length;
                     
                     return [
                         movie.id,
                         movie.title,
                         movie.genre,
                         new Date(movie.release_date).toLocaleDateString(),
                         totalTickets,
                         totalRevenue.toLocaleString()
                     ];
                 });
                 
                 // Use autoTable function directly if attached, or call it
                 autoTable(doc, {
                     head: [['ID', 'Title', 'Genre', 'Release Date', 'Tickets', 'Revenue (VND)']],
                     body: tableData,
                     startY: 40,
                     theme: 'grid',
                     styles: { fontSize: 8 },
                     headStyles: { fillColor: [41, 128, 185] }
                 });
                 
                 // Total Summary
                 const totalRevenueAll = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
                 const finalY = doc.lastAutoTable.finalY + 10;
                 
                 doc.setFontSize(12);
                 doc.setTextColor(0);
                 doc.text(`Total System Revenue: ${totalRevenueAll.toLocaleString()} VND`, 14, finalY);
                 
                 doc.save(`revenue_report_${new Date().toISOString().slice(0,10)}.pdf`);
                 
             } catch (err) {
                 console.error("PDF Generation Error:", err);
                 alert('Failed to generate PDF. Check console for details. Error: ' + err.message);
             } finally {
                 exportPdfBtn.disabled = false;
                 exportPdfBtn.innerHTML = '<i class="bi bi-file-earmark-pdf me-2"></i> Export PDF';
             }
         });
     }
     
     const exportBtn = document.getElementById('export-report-btn');
     if(exportBtn) {
         exportBtn.addEventListener('click', async () => {
             try {
                 const [movies, bookings, showtimes] = await fetchData();
                 
                 // Generate CSV
                 const rows = [
                     ['Movie ID', 'Title', 'Genre', 'Release Date', 'Total Bookings', 'Total Revenue (VND)']
                 ];
                 
                 movies.forEach(movie => {
                     // Get all showtimes for this movie
                     const movieShowtimeIds = showtimes
                        .filter(s => s.movie_id === movie.id)
                        .map(s => s.id);
                     
                     // Get all bookings for those showtimes
                     const movieBookings = bookings.filter(b => movieShowtimeIds.includes(b.showtime_id));
                     
                     const totalRevenue = movieBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
                     const totalTickets = movieBookings.length;
                     
                     rows.push([
                         movie.id,
                         `"${movie.title.replace(/"/g, '""')}"`, // Escape quotes
                         movie.genre,
                         movie.release_date,
                         totalTickets,
                         totalRevenue
                     ]);
                 });
                 
                 const csvContent = "data:text/csv;charset=utf-8," 
                    + rows.map(e => e.join(",")).join("\n");
                    
                 const encodedUri = encodeURI(csvContent);
                 const link = document.createElement("a");
                 link.setAttribute("href", encodedUri);
                 link.setAttribute("download", `revenue_report_${new Date().toISOString().slice(0,10)}.csv`);
                 document.body.appendChild(link);
                 link.click();
                 document.body.removeChild(link);
                 
             } catch (err) {
                 alert('Failed to generate report: ' + err.message);
             }
         });
     }
  }
};

export default AdminDashboardPage;
