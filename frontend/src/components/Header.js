const Header = {
  render: () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return `
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
        <div class="container">
          <a class="navbar-brand fw-bold" href="/">🎬 MovieBook</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav me-auto">
              <li class="nav-item">
                <a class="nav-link" href="/">Home</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="/movies">Movies</a>
              </li>
              ${user && user.role === 'customer' ? `
                <li class="nav-item">
                  <a class="nav-link" href="/my-bookings">My Tickets</a>
                </li>
              ` : ''}
              ${user && user.role === 'admin' ? `
                <li class="nav-item">
                  <a class="nav-link text-warning" href="/admin/dashboard">Admin</a>
                </li>
              ` : ''}
            </ul>
            <div class="d-flex align-items-center">
              ${!user ? `
                <a href="/login" class="btn btn-outline-light btn-sm me-2">Login</a>
                <a href="/admin/login" class="btn btn-outline-warning btn-sm">Admin Login</a>
              ` : `
                <a href="/profile" class="text-decoration-none me-3">
                    <span class="navbar-text text-light">
                      <small>Hello, ${user.email}</small>
                    </span>
                </a>
                <button id="logout-btn" class="btn btn-danger btn-sm">Logout</button>
              `}
            </div>
          </div>
        </div>
      </nav>
    `;
  },
  afterRender: () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '/';
      });
    }
  }
};

export default Header;
