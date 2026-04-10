const AdminSidebar = {
  render: (activePage = 'dashboard') => {
    return `
      <div class="admin-sidebar">
        <div class="sidebar-header">
          <i class="bi bi-film"></i> Admin Panel
        </div>
        <nav class="nav flex-column mt-3">
          <a class="nav-link ${activePage === 'dashboard' ? 'active' : ''}" href="/admin/dashboard">
            <i class="bi bi-speedometer2"></i> Dashboard
          </a>
          <a class="nav-link ${activePage === 'movies' ? 'active' : ''}" href="/admin/movies/manage">
            <i class="bi bi-camera-reels"></i> Manage Movies
          </a>
          <a class="nav-link ${activePage === 'showtimes' ? 'active' : ''}" href="/admin/showtimes/manage">
            <i class="bi bi-calendar-week"></i> Manage Showtimes
          </a>
          <a class="nav-link ${activePage === 'bookings' ? 'active' : ''}" href="/admin/bookings/manage">
            <i class="bi bi-ticket-detailed"></i> Manage Bookings
          </a>
          <a class="nav-link ${activePage === 'users' ? 'active' : ''}" href="/admin/users/manage">
             <i class="bi bi-people"></i> Manage Users
          </a>
        </nav>
        
        <div class="user-info">
          <div class="d-grid">
            <button id="admin-logout-btn" class="btn btn-outline-light btn-sm">
              <i class="bi bi-box-arrow-left"></i> Logout
            </button>
          </div>
        </div>
      </div>
    `;
  },
  afterRender: () => {
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('user');
                window.location.href = '/';
            }
        });
    }
  }
};

export default AdminSidebar;
