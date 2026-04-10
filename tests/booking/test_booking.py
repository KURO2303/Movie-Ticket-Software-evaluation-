from tests.base import TestBase, Colors

class TestBooking(TestBase):
    
    def test_18_booking_grouped_seats(self):
        """TC_BOOKING_01: Book multiple seats in a single ID"""
        print(f"\n{Colors.BOLD}--- Booking: Grouped Seats ---{Colors.RESET}")
        
        # 1. Setup
        new_showtime = self.create_dedicated_showtime()
        seat1 = self.get_real_available_seat(new_showtime)
        seat2 = seat1
        while seat2 == seat1:
            seat2 = self.get_real_available_seat(new_showtime)
        
        payload = {
            "showtime_id": new_showtime, 
            "seat_numbers": [seat1, seat2]
        }
        
        # 2. Act
        resp = self._req('POST', endpoint='/api/bookings', payload=payload, headers=self.get_auth_headers(), status=201)
        data = resp.json()
        
        # 3. Assert
        self.assertIn("booking_id", data)
        self.state['booking_id'] = data["booking_id"]
        self.assertEqual(data["seats"], f"{seat1}, {seat2}")
        print(f" -> Created Grouped Booking #{data['booking_id']}")

    def test_19_booking_atomicity(self):
        """TC_BOOKING_02: Atomic failure if one seat is taken"""
        print(f"\n{Colors.BOLD}--- Booking: Atomicity ---{Colors.RESET}")
        
        new_showtime = self.create_dedicated_showtime()
        seat1 = self.get_real_available_seat(new_showtime)
        seat2 = seat1
        while seat2 == seat1:
            seat2 = self.get_real_available_seat(new_showtime)
            
        # Manually book seat1 first
        self._req('POST', endpoint='/api/bookings', payload={"showtime_id": new_showtime, "seat_numbers": [seat1]}, headers=self.get_auth_headers(), status=201)
        
        # Now try to book [seat1, seat2]. Should fail because seat1 is gone.
        payload = {"showtime_id": new_showtime, "seat_numbers": [seat1, seat2]}
        resp = self._req('POST', endpoint='/api/bookings', payload=payload, headers=self.get_auth_headers(), status=400)
        
        # Accept both messages (pre-check vs atomic-check)
        err = resp.json().get('error', '')
        self.assertTrue("not available" in err or "no longer available" in err)

    def test_20_booking_no_auth(self):
        """TC_BOOKING_03: Verify 401 without token"""
        print(f"\n{Colors.BOLD}--- Booking: Unauthorized ---{Colors.RESET}")
        payload = {"showtime_id": 1, "seat_numbers": ["A1"]}
        # _req adds API-KEY, but we need JWT for bookings
        self._req('POST', endpoint='/api/bookings', payload=payload, status=401)

    def test_21_booking_my_list(self):
        """TC_BOOKING_04: Get customer's booking list"""
        print(f"\n{Colors.BOLD}--- Booking: My Bookings ---{Colors.RESET}")
        resp = self._req('GET', endpoint='/api/bookings', headers=self.get_auth_headers(), status=200)
        self.assertIsInstance(resp.json(), list)

    def test_22_booking_detail(self):
        """TC_BOOKING_05: Get single booking detail"""
        print(f"\n{Colors.BOLD}--- Booking: Detail ---{Colors.RESET}")
        if not self.state['booking_id']: self.skipTest("No booking ID")
        resp = self._req('GET', endpoint=f"/api/bookings/{self.state['booking_id']}", headers=self.get_auth_headers(), status=200)
        self.assertEqual(resp.json().get('id'), self.state['booking_id'])

    def test_23_booking_cascade_release(self):
        """TC_BOOKING_07: Deleting grouped booking releases all seats"""
        print(f"\n{Colors.BOLD}--- Booking: Cascade Release ---{Colors.RESET}")
        
        # 1. Create a grouped booking
        new_showtime = self.create_dedicated_showtime()
        
        # IMPORTANT: Trigger seat generation by fetching them first
        self._req('GET', endpoint=f"/api/showtimes/{new_showtime}/seats", status=200)
        
        seat1 = self.get_real_available_seat(new_showtime)
        seat2 = seat1
        while seat2 == seat1:
            seat2 = self.get_real_available_seat(new_showtime)

        self._req('POST', endpoint='/api/bookings', payload={"showtime_id": new_showtime, "seat_numbers": [seat1, seat2]}, headers=self.get_auth_headers(), status=201)
        
        # Verify they are booked
        resp = self._req('GET', endpoint=f"/api/showtimes/{new_showtime}/seats", status=200)
        seats = resp.json()
        b1 = next(s for s in seats if s['seat_number'] == seat1)
        b2 = next(s for s in seats if s['seat_number'] == seat2)
        self.assertEqual(b1['status'], 'booked')
        self.assertEqual(b2['status'], 'booked')
        
        # 2. Find the booking ID for these seats
        resp = self._req('GET', endpoint='/api/bookings', headers=self.get_auth_headers(), status=200)
        # Find the specific booking for this showtime
        my_bk = next(b for b in resp.json() if b['showtime_id'] == new_showtime)
        bk_id = my_bk['id']
        
        # 3. Delete it
        self._req('DELETE', endpoint=f"/api/bookings/{bk_id}", headers=self.get_auth_headers(), status=200)
        
        # 4. Verify seats are available again
        resp = self._req('GET', endpoint=f"/api/showtimes/{new_showtime}/seats", status=200)
        seats = resp.json()
        b1 = next(s for s in seats if s['seat_number'] == seat1)
        b2 = next(s for s in seats if s['seat_number'] == seat2)
        self.assertEqual(b1['status'], 'available')
        self.assertEqual(b2['status'], 'available')
        print(f" -> Cascade release verified for {seat1}, {seat2}")
