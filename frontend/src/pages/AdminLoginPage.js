import { loginUser } from '../api/apiClient.js';

const AdminLoginPage = {
  render: () => {
    return `
      <div class="row justify-content-center mt-5">
        <div class="col-md-5 col-lg-4">
          <div class="card shadow border-0">
            <div class="card-header bg-danger text-white text-center py-3">
              <h4 class="mb-0 fw-bold">Admin Login</h4>
            </div>
            <div class="card-body p-4">
              <p class="text-muted text-center mb-4">Area reserved for administrators.</p>
              <form id="admin-login-form">
                <div class="mb-3">
                  <label class="form-label">Username / Email</label>
                  <input type="text" id="admin-email" class="form-control" placeholder="admin or admin@system.com" required>
                </div>
                <div class="mb-4">
                  <label class="form-label">Password</label>
                  <input type="password" id="admin-password" class="form-control" placeholder="••••••••" required>
                </div>
                <div class="d-grid">
                  <button type="submit" id="admin-login-btn" class="btn btn-danger py-2 fw-bold">Admin Login</button>
                </div>
              </form>
              <div id="admin-error-msg" class="text-danger mt-3 text-center small"></div>
              <div class="mt-4 p-3 bg-light rounded small border">
                <p class="mb-0 text-muted"><strong>Default account:</strong><br>admin / 111111</p>
              </div>
            </div>
          </div>
          <div class="text-center mt-3">
             <a href="/" class="text-decoration-none text-muted">&larr; Back to Home</a>
          </div>
        </div>
      </div>
    `;
  },
  afterRender: () => {
    const form = document.getElementById('admin-login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('admin-email').value;
      const password = document.getElementById('admin-password').value;
      const errorMsg = document.getElementById('admin-error-msg');
      const loginBtn = document.getElementById('admin-login-btn');

      loginBtn.disabled = true;
      loginBtn.innerText = 'Processing...';
      errorMsg.innerText = '';

      try {
        const response = await loginUser({ username, password });
        
        if (response.role === 'admin') {
            localStorage.setItem('user', JSON.stringify(response));
            window.location.href = '/admin/dashboard';
        } else {
             errorMsg.innerText = 'This account does not have admin privileges.';
             // logout if accidentally logged in as user
             localStorage.removeItem('user');
        }

      } catch (err) {
        console.error('Admin login failed:', err);
        errorMsg.innerText = err.message || 'Invalid credentials.';
      } finally {
        loginBtn.disabled = false;
        loginBtn.innerText = 'Admin Login';
      }
    });
  }
};

export default AdminLoginPage;
