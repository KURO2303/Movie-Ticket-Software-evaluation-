import { processPayment, getBookingById, getPaymentMethods, savePaymentMethod } from '../api/apiClient.js';

const PaymentPage = {
  render: async () => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('booking_id');
    const bookingIds = params.get('booking_ids');
    const amount = params.get('amount');

    const displayIds = bookingId ? [bookingId] : (bookingIds ? bookingIds.split(',') : []);

    if (displayIds.length === 0) {
        return `
            <div class="container py-5 text-center">
                <div class="alert alert-danger">Booking information not found.</div>
                <a href="/" class="btn btn-primary">Back to Home</a>
            </div>
        `;
    }

    return `
      <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card shadow border-0">
                    <div class="card-header bg-primary text-white py-3">
                        <h4 class="mb-0 fw-bold"><i class="bi bi-credit-card"></i> Payment Gateway</h4>
                    </div>
                    <div class="card-body p-4">
                        <div class="alert alert-info mb-4">
                            You are paying for booking ID${displayIds.length > 1 ? 's' : ''}: <strong>#${displayIds.join(', #')}</strong><br>
                            Total amount: <strong class="fs-5 text-success">${parseInt(amount || 0).toLocaleString()} VND</strong>
                        </div>

                        <div id="payment-content" class="text-center py-4">
                            <div class="spinner-border text-primary" role="status"></div>
                        </div>
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
                    <h5 class="modal-title fw-bold">Add Payment Method</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="add-card-form">
                        <div class="mb-3">
                            <label class="form-label">Cardholder Name</label>
                            <input type="text" id="card-holder" class="form-control" placeholder="NGUYEN VAN A" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Card Number</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="bi bi-credit-card-2-front"></i></span>
                                <input type="text" id="card-number" class="form-control" placeholder="0000 0000 0000 0000" maxlength="19" required>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-6 mb-3">
                                <label class="form-label">Expiration Date</label>
                                <input type="text" class="form-control" placeholder="MM/YY" maxlength="5" required>
                            </div>
                            <div class="col-6 mb-3">
                                <label class="form-label">CVV</label>
                                <input type="password" class="form-control" placeholder="123" maxlength="3" required>
                            </div>
                        </div>
                        <div class="d-flex justify-content-end gap-2 mt-4">
                            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary fw-bold px-4">Save & Continue</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      </div>
    `;
  },
  afterRender: async () => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('booking_id');
    const bookingIdsStr = params.get('booking_ids');
    
    const bookingIds = bookingId ? [bookingId] : (bookingIdsStr ? bookingIdsStr.split(',') : []);
    if (bookingIds.length === 0) return;
    
    const amount = params.get('amount');
    const contentDiv = document.getElementById('payment-content');
    
    // Init Modal
    const addCardModalEl = document.getElementById('addCardModal');
    const addCardModal = new bootstrap.Modal(addCardModalEl);
    const addCardForm = document.getElementById('add-card-form');

    let savedCards = [];

    const showNoCardState = () => {
        contentDiv.innerHTML = `
            <div class="py-3">
                <p class="text-muted mb-4">You haven't selected a payment method.</p>
                <button id="retry-add-card-btn" class="btn btn-primary fw-bold">
                    + Add Payment Card
                </button>
            </div>
        `;
        document.getElementById('retry-add-card-btn').addEventListener('click', () => addCardModal.show());
    };

    const processTxn = async (btn) => {
        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';

        try {
            const promises = bookingIds.map(id => processPayment({ booking_id: id }));
            await Promise.all(promises);
            alert('Payment successful!');
            window.location.href = '/my-bookings';
        } catch (err) {
            alert('Payment error: ' + err.message);
            btn.disabled = false;
            btn.innerText = originalText;
        }
    };

    const renderConfirmState = (cards) => {
        const cardsHtml = cards.map((card, index) => `
            <div class="card mb-2 ${index === 0 ? 'border-primary' : ''}">
                <div class="card-body py-2">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="paymentCard" id="card-${card.id}" value="${card.id}" ${index === 0 ? 'checked' : ''}>
                        <label class="form-check-label d-flex align-items-center w-100" for="card-${card.id}" style="cursor: pointer;">
                            <span class="fs-4 me-3 text-primary"><i class="bi bi-credit-card-2-front"></i></span>
                            <div>
                                <h6 class="mb-0 fw-bold">${card.card_number_masked}</h6>
                                <small class="text-muted text-uppercase">${card.card_holder}</small>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        `).join('');

        contentDiv.innerHTML = `
            <h6 class="text-start mb-3 fw-bold">Select payment method:</h6>
            <div class="mb-4 text-start">
                ${cardsHtml}
            </div>
            
            <div class="d-grid gap-2">
                <button id="pay-saved-btn" class="btn btn-success btn-lg fw-bold shadow">
                    Confirm Payment
                </button>
                <button id="use-new-card-btn" class="btn btn-outline-secondary btn-sm mt-2">
                    + Add / Use New Card
                </button>
            </div>
        `;

        // Highlight selected card visual
        document.querySelectorAll('input[name="paymentCard"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.querySelectorAll('.card').forEach(c => c.classList.remove('border-primary'));
                e.target.closest('.card').classList.add('border-primary');
            });
        });

        document.getElementById('pay-saved-btn').addEventListener('click', (e) => {
            const selectedRadio = document.querySelector('input[name="paymentCard"]:checked');
            if (selectedRadio) {
                // In a real app, we'd pass the selected card ID to processPayment
                // For now, processPayment just marks the booking as paid, so card ID is metadata
                processTxn(e.target);
            }
        });
        
        document.getElementById('use-new-card-btn').addEventListener('click', () => {
             addCardModal.show();
        });
    };

    try {
        savedCards = await getPaymentMethods();
        
        if (savedCards && savedCards.length > 0) {
            // Case A: Has Saved Card -> Jump to Confirmation
            renderConfirmState(savedCards);
        } else {
            // Case B: No Card -> Show prompt and Open Modal
            showNoCardState();
            addCardModal.show();
        }

    } catch (err) {
        console.error(err);
        contentDiv.innerHTML = '<div class="alert alert-warning">Could not load payment methods.</div>';
    }

    // Handle Add Card Form
    addCardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const holder = document.getElementById('card-holder').value;
        const number = document.getElementById('card-number').value;
        
        // Mock Save
        try {
            await savePaymentMethod({ card_number: number, card_holder: holder });
            addCardModal.hide();
            // Fetch updated list and render confirm
            savedCards = await getPaymentMethods();
            renderConfirmState(savedCards);
        } catch (err) {
            alert('Error saving card: ' + err.message);
        }
    });
  }
};

export default PaymentPage;