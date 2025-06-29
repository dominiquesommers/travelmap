
class Country {
  constructor(id, name, seasons) {
    this.id = id;
    this.name = name;
    this.seasons = seasons;
    this.flag = ''; // TODO
  }
}

class Place {
  constructor(id, name, country, coordinates, season, costs, activities, map_handler) {
    this.id = id;
    this.name = name;
    this.country = country;
    this.coordinates = coordinates;
    this.season = (season !== undefined) ? season :
        { jan: 1, feb: 1, mar: 1, apr: 1, may: 1, jun: 1, jul: 1, aug: 1, sep: 1, oct: 1, nov: 1, dec: 1, description: 'default', description_abbreviation: 'D' };
    this.costs = costs;
    this.activities = activities;
    this.activities_descriptions_loaded = false;
    this.visits = new Observable([]);
    this.map_handler = map_handler;
    this.marker = new PlaceMarker(this, map_handler);
    this.overview = new PlaceOverview(this);
  }

  get_id = () => {
    return `${this.name},${this.country.name}`
  }

  add_visit = (visit_id, nights, included, callback=(new_visit)=>{}) => {
    if (visit_id === undefined) {
      const args = { 'parameters': {'place': this.id, 'nights': nights, 'included': included } };
      backend_communication.call_google_function('POST',
                'add_visit', args, (data) => {
        if (data['status'] === 'OK') {
          callback(this.add_visit(data['visit_id'], nights, included));
        } else {
          console.log(data);
        }
      });
      // backend_communication.fetch('/travel/add_visit/', args, (data) => {
      //   if (data['status'] === 'OK') {
      //     callback(this.add_visit(data['visit_id'], nights, included));
      //   } else {
      //     console.log(data);
      //   }
      // });
    } else {
      // console.log(`add visit ${visit_id}`)
      const new_visit = new Visit(visit_id, this, nights, included);
      this.visits.value = [...this.visits.value, new_visit];
      return new_visit;
    }
  }

  delete_visit = (visit_to_remove, callback=() => {}) => {
    const args = { 'parameters': {'visit_id': visit_to_remove.id} };
    backend_communication.call_google_function('POST',
                'remove_visit', args, (data) => {
      if (data['status'] === 'OK') {
        const index = this.visits.value.indexOf(visit_to_remove);
        this.visits.value = [...this.visits.value.slice(0, index), ...this.visits.value.slice(index + 1)];
        Object.values(this.map_handler.places.value).forEach((place) => {
          place.visits.value.forEach((visit) => {
            const edges_to_remove = visit._outgoing_edges.value.filter((edge) => edge.destination === visit_to_remove);
            edges_to_remove.forEach((edge) => visit.remove_outgoing_edge(edge, false));
          });
        });
        callback();
      } else {
        console.log(data);
      }
    });
    // backend_communication.fetch('/travel/remove_visit/', args, (data) => {
    //   if (data['status'] === 'OK') {
    //     const index = this.visits.value.indexOf(visit_to_remove);
    //     this.visits.value = [...this.visits.value.slice(0, index), ...this.visits.value.slice(index + 1)];
    //     Object.values(this.map_handler.places.value).forEach((place) => {
    //       place.visits.value.forEach((visit) => {
    //         const edges_to_remove = visit._outgoing_edges.value.filter((edge) => edge.destination === visit_to_remove);
    //         edges_to_remove.forEach((edge) => visit.remove_outgoing_edge(edge, false));
    //       });
    //     });
    //     callback();
    //   } else {
    //     console.log(data);
    //   }
    // });
  }

  get_activity_descriptions = () => {
    console.log('get_activity_descriptions');
    if (this.activities_descriptions_loaded) {
      return;
    }
    // TODO get and set activity descriptions
    backend_communication.call_google_function('GET',
                'get_activity_descriptions', {'place_id': this.id}, (data) => {
      console.log(data);
      const activities = data['activity_descriptions'];
      Object.entries(activities).forEach((activity_id, description) => {
        this.overview.activity_description_spans[activity_id].innerHTML = description;
      });
      this.activities_descriptions_loaded = true;
    });
  }
}


class Visit {
  constructor(id, place, nights, included=true) {
    this.id = id;
    this.place = place;
    this.nights = new Observable(nights, this.set_nights);
    this.nights.subscribe(this.nights_updated)
    this._outgoing_edges = new Observable([]);
    this.included = new Observable(included, this.set_included);
    this.included.subscribe(this.included_updated)
    this.next_edge = new Observable(undefined, this.check_same);
    this.previous_edge = new Observable(undefined, this.check_same);
    this.entry_date = new Observable(undefined, this.check_same);
    this.exit_date = new Observable(undefined, this.check_same);
    this.month_days = {};
    this.entry_date.subscribe(this.compute_month_days);
    this.exit_date.subscribe(this.compute_month_days);
    this.included_in_rent = false;
    this.marker = undefined;
    this.popup = new VisitPopup(this);
  }

  get_id = () => {
    return `${this.place.get_id()}:${this.id}`;
  }

  check_same (new_value, old_value) {
    if (new_value === old_value) throw new ValidationError('New value is same as old value.');
    return new_value;
  }

  set_nights = (new_nights, old_value) => {
    if (new_nights < 0) throw new ValidationError('New nights is negative.');
    return this.check_same(new_nights, old_value);
  }

  nights_updated = (new_nights, old_value) => {
    const args = { 'parameters': {'id': this.id, 'column': 'nights', 'value': new_nights} };
    backend_communication.call_google_function('POST',
                'update_visit', args, (data) => {
      if (data['status'] === 'NOT OK') { console.log(data); }
    });
    // backend_communication.fetch('/travel/update_visit/', args, (data) => {
    //   if (data['status'] === 'NOT OK') { console.log(data); }
    // });
  }

  set_included = (new_included, old_value) => {
    if ((new_included !== false) &&  (new_included !== true)) throw new ValidationError('New included is not a boolean.');
    return this.check_same(new_included, old_value);
  }

  included_updated = (new_included, old_value) => {
    const args = { 'parameters': {'id': this.id, 'column': 'included', 'value': new_included} };
    backend_communication.call_google_function('POST',
                'update_visit', args, (data) => {
      if (data['status'] === 'NOT OK') { console.log(data); }
    });
    // backend_communication.fetch('/travel/update_visit/', args, (data) => {
    //   if (data['status'] === 'NOT OK') { console.log(data); }
    // });
  }

  // update_next_edge = () => {
  //   // TODO this will/should be handled by graph.
  //   this.next_edge.value = this._outgoing_edges.find((edge) => edge.destination.included.value);
  // };

  add_outgoing_edge = (destination, route, priority, rent_until, includes_accommodation, update_db, index=-1) => {
    index = -1;
    if (update_db) {
      // TODO compute priority.
      const priority = (this._outgoing_edges.length > 0) ? Math.max(...this._outgoing_edges.value.map((edge) => edge.priority)) + 1 : 0;
      console.log('priority');
      console.log(priority);
      const args = { 'parameters': {'source_visit_id': this.id, 'destination_visit_id': destination.id, 'route_id': route.id, 'priority': priority} };
      backend_communication.call_google_function('POST',
                'add_edge', args, (data) => {
        if (data['status'] === 'OK') {
          this.add_outgoing_edge(destination, route, priority, rent_until, includes_accommodation, false, index);
        } else {
          console.log(data);
        }
      });
      // backend_communication.fetch('/travel/add_edge/', args, (data) => {
      //   if (data['status'] === 'OK') {
      //     this.add_outgoing_edge(destination, route, priority, rent_until, includes_accommodation, false, index);
      //   } else {
      //     console.log(data);
      //   }
      // });
    } else {
      const edge = new Edge(this, destination, route, priority, rent_until, includes_accommodation);
      if (index === -1) {
        this._outgoing_edges.value = [...this._outgoing_edges.value, edge];
      } else {
        this._outgoing_edges.value = [...this._outgoing_edges.value.slice(0, index), edge, ...this._outgoing_edges.value.slice(index)];
      }
    }
  };

  remove_outgoing_edge = (edge, update_db=true) => {
    if (update_db) {
      const args = { 'parameters': {'source_visit_id': edge.source.id, 'destination_visit_id': edge.destination.id, 'route_id': edge.route.id} };
      backend_communication.call_google_function('POST',
                'remove_edge', args, (data) => {
        if (data['status'] === 'OK') {
          this.remove_outgoing_edge(edge, false);
        } else {
          console.log(data);
        }
      });
      // backend_communication.fetch('/travel/remove_edge/', args, (data) => {
      //   if (data['status'] === 'OK') {
      //     this.remove_outgoing_edge(edge, false);
      //   } else {
      //     console.log(data);
      //   }
      // });
    } else {
      console.log('remove edgeeeee')
      const index = this._outgoing_edges.value.indexOf(edge);
      this._outgoing_edges.value = [...this._outgoing_edges.value.slice(0, index), ...this._outgoing_edges.value.slice(index + 1)];
    }
  }

  change_order_outgoing_edges = (ordered_edges, prev_ordered_edges, dragged_edge) => {
    if (Array.prototype.map.call( ordered_edges, function(e,i){ return e === prev_ordered_edges[i]; }).every(e => e)) {
      console.log('order did not change.')
    } else {
      if (dragged_edge !== undefined) {
        const dragged_edge_index = ordered_edges.indexOf(dragged_edge);
        const priority = (dragged_edge_index === 0) ? ordered_edges[1].priority - 1 :
            (dragged_edge_index === (ordered_edges.length - 1)) ? ordered_edges[ordered_edges.length - 2].priority + 1 :
                (ordered_edges[dragged_edge_index - 1].priority + ordered_edges[dragged_edge_index + 1].priority) / 2;
        console.log(`priority: ${priority}.`) // TODO fix priorities.
        const args = { 'parameters': {'source_visit_id': dragged_edge.source.id, 'destination_visit_id': dragged_edge.destination.id,
                                         'route_id': dragged_edge.route.id, 'column': 'priority', 'value': priority} };
        backend_communication.call_google_function('POST',
                  'update_edge', args, (data) => {
          if (data['status'] === 'OK') {
            this._outgoing_edges.value = ordered_edges;
          } else {
            console.log(data);
          }
        });
        // backend_communication.fetch('/travel/update_edge/', args, (data) => {
        //   if (data['status'] === 'OK') {
        //     this._outgoing_edges.value = ordered_edges;
        //   } else {
        //     console.log(data);
        //   }
        // });
      }
    }
  };

  add_marker = (map) => {
    this.marker = new Marker(this, map); //.nights, this.place.coordinates, this.popup.popup);
  };

  compute_month_days = () => {
    if (this.entry_date.value === undefined || this.exit_date.value === undefined || this.nights.value === 0) {
      this.month_days = {};
    }
    if (this.entry_date.value > this.exit_date.value) {
      throw new Error(`end_date can not be before start_date, is ${this.entry_date.value} - ${this.exit_date.value}.`);
    }

    const result = {};
    let current_date = new Date(this.entry_date.value);
    current_date.setDate(current_date.getDate() + 1);
    while (current_date <= this.exit_date.value) {
      const current_month = current_date.getMonth();
      const current_year = current_date.getFullYear();
      const month_name = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(current_date).toLowerCase();
      const first_day_of_month = new Date(current_year, current_month, 1);
      const last_day_of_month = new Date(current_year, current_month + 1, 0);
      const start_overlap = current_date <= first_day_of_month ? first_day_of_month : current_date;
      const end_overlap = this.exit_date.value >= last_day_of_month ? last_day_of_month : this.exit_date.value;
      if (start_overlap <= end_overlap) {
        const time_difference = end_overlap.getTime() - start_overlap.getTime();
        const day_difference = Math.ceil(time_difference / (1000 * 3600 * 24)) + 1;
        result[month_name] = (result[month_name] || 0) + day_difference;
      }
      current_date.setMonth(current_date.getMonth() + 1);
      current_date.setDate(1);
    }

    this.month_days = result;
  }
}