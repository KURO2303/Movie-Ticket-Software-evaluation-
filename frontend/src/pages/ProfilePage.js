import { getUserProfile, getPaymentMethods, deletePaymentMethod, updatePaymentMethod, savePaymentMethod } from '../api/apiClient.js';

const ProfilePage = {
  render: async () => {
    return `
      <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <!-- User Info -->
                <div class="card shadow-sm border-0 mb-4">
                    <div class="card-header bg-white py-3">
                        <h4 class="mb-0 fw-bold">Personal Information</h4>
                    </div>
                    <div class="card-body p-4" id="profile-content">
                        <div class="text-center py-4">
                            <div class="spinner-border text-primary" role="status"></div>
                        </div>
                    </div>
                </div>

                <!-- Payment Methods -->
                <div class="card shadow-sm border-0">
                    <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                        <h4 class="mb-0 fw-bold">Saved Payment Methods</h4>
                        <button id="add-card-btn" class="btn btn-sm btn-success fw-bold">
                            <i class="bi bi-plus-lg"></i> Add Card
                        </button>
                    </div>
                    <div class="card-body p-4" id="payment-methods-content">
                         <p class="text-muted">Loading...</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <!-- Add Card Modal -->
      <div class="modal fade" id="addCardModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">Add New Card</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="add-card-form">
                        <div class="mb-3">
                            <label class="form-label">Cardholder Name</label>
                            <input type="text" id="add-card-holder" class="form-control" placeholder="NGUYEN VAN A" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Card Number</label>
                            <input type="text" id="add-card-number" class="form-control" placeholder="0000 0000 0000 0000" maxlength="19" required>
                        </div>
                        <div class="text-end mt-4">
                            <button type="button" class="btn btn-light me-2" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-success px-4 fw-bold">Save Card</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      </div>

      <!-- Edit Card Modal -->
      <div class="modal fade" id="editCardModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Update Card Information</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="edit-card-form">
                        <input type="hidden" id="edit-card-id">
                        <div class="mb-3">
                            <label class="form-label">Card Number (Cannot be edited)</label>
                            <input type="text" id="edit-card-number" class="form-control" disabled>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Cardholder Name</label>
                            <input type="text" id="edit-card-holder" class="form-control" required>
                        </div>
                        <div class="text-end">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      </div>
    `;
  },
  afterRender: async () => {
    const profileContainer = document.getElementById('profile-content');
    const paymentContainer = document.getElementById('payment-methods-content');
    const addBtn = document.getElementById('add-card-btn');
    
    // Add Modal
    const addModal = new bootstrap.Modal(document.getElementById('addCardModal'));
    const addForm = document.getElementById('add-card-form');
    const addHolderInput = document.getElementById('add-card-holder');
    const addNumberInput = document.getElementById('add-card-number');

    // Edit Modal Elements
    const editModalEl = document.getElementById('editCardModal');
    const editModal = new bootstrap.Modal(editModalEl);
    const editForm = document.getElementById('edit-card-form');
    const editIdInput = document.getElementById('edit-card-id');
    const editNumberInput = document.getElementById('edit-card-number');
    const editHolderInput = document.getElementById('edit-card-holder');

    let savedCards = [];

    // Load Profile
    try {
        const user = await getUserProfile();
        
        profileContainer.innerHTML = `
            <div class="text-center mb-4">
                <div class="avatar-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px; border-radius: 50%; font-size: 2rem;">
                    ${user.email.charAt(0).toUpperCase()}
                </div>
                <h3 class="fw-bold">${user.email}</h3>
                <span class="badge bg-secondary text-uppercase">${user.role}</span>
            </div>
            
            <hr>

            <form>
                <div class="mb-3">
                    <label class="form-label text-muted">Email</label>
                    <input type="text" class="form-control" value="${user.email}" disabled>
                </div>
                <div class="mb-3">
                    <label class="form-label text-muted">Member ID</label>
                    <input type="text" class="form-control" value="${user.id}" disabled>
                </div>
            </form>
            
            <div class="mt-4 text-center">
                <a href="/my-bookings" class="btn btn-outline-primary">
                    <i class="bi bi-ticket-perforated"></i> View Booking History
                </a>
            </div>
        `;
    } catch (err) {
        profileContainer.innerHTML = `<div class="alert alert-danger">Could not load info: ${err.message}</div>`;
    }

    // Load Payment Methods
    const loadCards = async () => {
        try {
            savedCards = await getPaymentMethods();
            if (!savedCards || savedCards.length === 0) {
                paymentContainer.innerHTML = '<p class="text-muted text-center py-3">You have no saved payment methods.</p>';
                return;
            }

            paymentContainer.innerHTML = `
                <div class="list-group list-group-flush">
                    ${savedCards.map(card => `
                        <div class="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
                            <div class="d-flex align-items-center">
                                <i class="bi bi-credit-card-2-front fs-2 text-primary me-3"></i>
                                <div>
                                    <h6 class="mb-0 fw-bold">${card.card_number_masked}</h6>
                                    <small class="text-muted">${card.card_holder}</small>
                                </div>
                            </div>
                            <div>
                                <button class="btn btn-outline-primary btn-sm me-2 edit-card-btn" data-id="${card.id}">
                                    <i class="bi bi-pencil"></i> Edit
                                </button>
                                <button class="btn btn-outline-danger btn-sm delete-card-btn" data-id="${card.id}">
                                    <i class="bi bi-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Delete Logic
            document.querySelectorAll('.delete-card-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    if (confirm('Are you sure you want to delete this card?')) {
                        try {
                            await deletePaymentMethod(id);
                            loadCards(); // Reload
                        } catch (err) {
                            alert('Error deleting card: ' + err.message);
                        }
                    }
                });
            });

            // Edit Logic
            document.querySelectorAll('.edit-card-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const card = savedCards.find(c => c.id == id);
                    if(card) {
                        editIdInput.value = card.id;
                        editNumberInput.value = card.card_number_masked;
                        editHolderInput.value = card.card_holder;
                        editModal.show();
                    }
                });
            });

        } catch (err) {
            paymentContainer.innerHTML = `<div class="alert alert-danger">Error loading cards: ${err.message}</div>`;
        }
    };

    // Handle Add Submit
    addBtn.addEventListener('click', () => {
        addForm.reset();
        addModal.show();
    });

    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await savePaymentMethod({ 
                card_number: addNumberInput.value, 
                card_holder: addHolderInput.value 
            });
            addModal.hide();
            loadCards();
            alert('Card added successfully!');
        } catch (err) {
            alert('Error adding card: ' + err.message);
        }
    });

    // Handle Edit Submit
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editIdInput.value;
        const holder = editHolderInput.value;
        
        try {
            await updatePaymentMethod(id, { card_holder: holder });
            editModal.hide();
            loadCards();
            alert('Update successful!');
        } catch (err) {
            alert('Error updating: ' + err.message);
        }
    });

    await loadCards();
  }
};

export default ProfilePage;
