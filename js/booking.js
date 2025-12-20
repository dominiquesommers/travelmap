class Booking {
  constructor(id, place, accommodation_cost = 0, food_cost = 0, miscellaneous_cost = 0,
              booked_entry_date = undefined, booked_nights = 0, booked_accommodation_url = '') {
    this.id = id;
    this.place = place;
    this.accommodation_cost = new Observable(accommodation_cost, this.set_natural);
    this.accommodation_cost.subscribe((new_value, old_value) => this.booking_updated('accommodation_cost', new_value, old_value));
    this.food_cost = new Observable(food_cost, this.set_natural);
    this.food_cost.subscribe((new_value, old_value) => this.booking_updated('food_cost', new_value, old_value));
    this.miscellaneous_cost = new Observable(miscellaneous_cost, this.set_natural);
    this.miscellaneous_cost.subscribe((new_value, old_value) => this.booking_updated('miscellaneous_cost', new_value, old_value));
    this.booked_entry_date = new Observable((booked_entry_date === undefined) ? undefined : new Date(booked_entry_date), this.check_same);
    this.booked_entry_date.subscribe((new_value, old_value) => this.booking_updated('booked_entry_date', new_value, old_value));
    this.booked_nights = new Observable(booked_nights, this.set_natural);
    this.booked_nights.subscribe((new_value, old_value) => this.booking_updated('booked_nights', new_value, old_value));
    this.booked_accommodation_url = new Observable(booked_accommodation_url, this.check_same);
    this.booked_accommodation_url.subscribe((new_value, old_value) => this.booking_updated('booked_accommodation_url', new_value, old_value));
  }

  is_paid_for = () => {
    const nonzero_natural = [this.accommodation_cost, this.food_cost, this.miscellaneous_cost, this.booked_nights].some(cost => cost.value != null && cost.value > 0);
    const nonzero_booking = this.booked_entry_date.value != null || (this.booked_accommodation_url.value != null && this.booked_accommodation_url.value !== '');
    return nonzero_natural || nonzero_booking;
  }

  booking_updated = (column, new_value, old_value) => {
    const args = { 'parameters': {'id': this.id, 'column': column, 'value': new_value} };
    console.log('update_booking', args);
    backend_communication.call_google_function('POST', 'update_booking', args, (data) => {
      if (data['status'] === 'NOT OK') { console.log(data); }
    });
  }

  check_same (new_value, old_value) {
    if (new_value === old_value) throw new ValidationError('New value is same as old value.');
    return new_value;
  }

  set_natural = (new_value, old_value) => {
    if (new_value < 0) throw new ValidationError('New value is negative.');
    return this.check_same(new_value, old_value);
  }
}