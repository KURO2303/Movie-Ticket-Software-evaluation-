import { getAllUsers, updateUser } from '../api/apiClient.js';
import AdminSidebar from '../components/AdminSidebar.js';

const AdminUsersPage = {
  render: async () => {
    return `
      <div class="admin-layout">
        ${AdminSidebar.render('users')}
        <div class="admin-content">
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="fw-bold mb-0">Manage Users</h2>
                    <div>
                        <input type="text" id="user-search" class="form-control" placeholder="Search by email..." style="width: 250px;">
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th class="ps-4">ID</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th class="text-end pe-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="admin-users-list">
                                    <tr><td colspan="5" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Edit User Modal -->
                <div class="modal fade" id="editUserModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title fw-bold">Edit User</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body p-4">
                                <form id="edit-user-form">
                                    <input type="hidden" id="edit-user-id">
                                    <div class="mb-3">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Email</label>
                                        <input type="email" id="edit-user-email" class="form-control" disabled>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Role</label>
                                        <select id="edit-user-role" class="form-select">
                                            <option value="customer">Customer</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label text-muted small fw-bold text-uppercase">New Password (Optional)</label>
                                        <input type="password" id="edit-user-password" class="form-control" placeholder="Leave blank to keep current">
                                    </div>
                                    <div class="text-end mt-4">
                                        <button type="button" class="btn btn-light me-2" data-bs-dismiss="modal">Cancel</button>
                                        <button type="submit" class="btn btn-primary px-4">Save Changes</button>
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

    const list = document.getElementById('admin-users-list');
    const searchInput = document.getElementById('user-search');
    
    // Modal Elements
    const editModalEl = document.getElementById('editUserModal');
    const editModal = new bootstrap.Modal(editModalEl);
    const editForm = document.getElementById('edit-user-form');
    const editIdInput = document.getElementById('edit-user-id');
    const editEmailInput = document.getElementById('edit-user-email');
    const editRoleSelect = document.getElementById('edit-user-role');
    const editPasswordInput = document.getElementById('edit-user-password');

    let allUsers = [];

    const renderList = (users) => {
        if (!users || users.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">No users found.</td></tr>';
            return;
        }

        // Sort by ID
        const sorted = [...users].sort((a,b) => a.id - b.id);

        list.innerHTML = sorted.map(u => `
          <tr>
            <td class="ps-4 fw-bold text-secondary">#${u.id}</td>
            <td class="fw-bold text-primary">${u.email}</td>
            <td>
                <span class="badge ${u.role === 'admin' ? 'bg-warning text-dark' : 'bg-info text-dark'} border">
                    ${u.role.toUpperCase()}
                </span>
            </td>
            <td><span class="badge bg-success">Active</span></td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-secondary edit-btn" data-id="${u.id}">
                    <i class="bi bi-pencil"></i> Edit
                </button>
            </td>
          </tr>
        `).join('');

        // Attach events
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openEditModal(e.currentTarget.dataset.id));
        });
    };

    const loadData = async () => {
        try {
            allUsers = await getAllUsers();
            renderList(allUsers);
        } catch (err) {
            list.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error loading data: ${err.message}</td></tr>`;
        }
    };

    const openEditModal = (id) => {
        const user = allUsers.find(u => u.id == id);
        if (user) {
            editIdInput.value = user.id;
            editEmailInput.value = user.email;
            editRoleSelect.value = user.role;
            editPasswordInput.value = ''; // Reset password field
            editModal.show();
        }
    };

    // Handle Edit Submit
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editIdInput.value;
        const role = editRoleSelect.value;
        const password = editPasswordInput.value;

        const data = { role };
        if (password) {
            data.password = password;
        }

        try {
            await updateUser(id, data);
            editModal.hide();
            await loadData(); // Reload list
            alert('User updated successfully!');
        } catch (err) {
            alert('Error updating user: ' + err.message);
        }
    });

    // Search Logic
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => 
            u.email.toLowerCase().includes(query) ||
            u.id.toString().includes(query)
        );
        renderList(filtered);
    });

    await loadData();
  }
};

export default AdminUsersPage;