from tests.base import TestBase, Colors

class TestPayment(TestBase):
    
    def test_24_add_payment_method(self):
        """TC_PAYMENT_04: Save a new credit card via Gateway"""
        print(f"\n{Colors.BOLD}--- Payment: Add Method ---{Colors.RESET}")
        payload = {"card_number": "1234567890123456", "card_holder": "TEST USER"}
        resp = self._req('POST', endpoint='/api/payment-methods', payload=payload, headers=self.get_auth_headers(), status=201)
        self.state['card_id'] = resp.json().get('id')

    def test_25_get_payment_methods(self):
        """TC_PAYMENT_05: List saved cards"""
        print(f"\n{Colors.BOLD}--- Payment: List Methods ---{Colors.RESET}")
        resp = self._req('GET', endpoint='/api/payment-methods', headers=self.get_auth_headers(), status=200)
        self.assertIsInstance(resp.json(), list)

    def test_26_process_payment_success(self):
        """TC_PAYMENT_01: Pay for a grouped booking"""
        print(f"\n{Colors.BOLD}--- Payment: Process Grouped ---{Colors.RESET}")
        
        # 1. Create a new booking
        new_showtime = self.create_dedicated_showtime()
        seat = self.get_real_available_seat(new_showtime)
        bk_resp = self._req('POST', endpoint='/api/bookings', 
                           payload={"showtime_id": new_showtime, "seat_numbers": [seat]}, 
                           headers=self.get_auth_headers(), status=201)
        
        bk_id = bk_resp.json().get("booking_id")
        
        # 2. Pay for it
        self._req('POST', endpoint='/api/payments', payload={"booking_id": bk_id}, headers=self.get_auth_headers(), status=201)
        
        # 3. Verify booking status is now confirmed
        status_resp = self._req('GET', endpoint=f"/api/bookings/{bk_id}", headers=self.get_auth_headers(), status=200)
        self.assertEqual(status_resp.json().get('status'), 'confirmed')

    def test_27_payment_not_found(self):
        """TC_PAYMENT_02: Payment for invalid booking"""
        print(f"\n{Colors.BOLD}--- Payment: 404 Booking ---{Colors.RESET}")
        self._req('POST', endpoint='/api/payments', payload={"booking_id": 999999}, headers=self.get_auth_headers(), status=404)

    def test_28_delete_card(self):
        """TC_PAYMENT_06: Remove a payment method"""
        print(f"\n{Colors.BOLD}--- Payment: Delete Method ---{Colors.RESET}")
        if self.state['card_id']:
            self._req('DELETE', endpoint=f"/api/payment-methods/{self.state['card_id']}", headers=self.get_auth_headers(), status=200)
