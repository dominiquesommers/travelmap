

class Graph {
  constructor(map_handler) {
    this.map_handler = map_handler;
    this.map_handler.places.subscribe(this.places_changed);
    this.initializing_data = false;
    // this._visits = {};
  }

  places_changed = (new_places, old_places) => {
    const old_places_ids = Object.keys(old_places);
    const new_places_ids = Object.keys(new_places);
    Object.entries(new_places).forEach(([place_id, place]) => {
      if (!old_places_ids.includes(place_id)) { place.visits.subscribe(this.visits_changed); }
    });
    Object.entries(old_places).forEach(([place_id, place]) => {
      if (!new_places_ids.includes(place_id)) { place.visits.unsubscribe(this.visits_changed); }
    });
  }

  visits_changed = (new_visits, old_visits) => {
    new_visits.forEach((visit) => {
      if (!old_visits.includes(visit)) {
        visit._outgoing_edges.subscribe(this.update_route);
        visit.included.subscribe(this.update_route);
        visit.nights.subscribe(this.update_route);
      }
    });
    old_visits.forEach((visit) => {
      if (!new_visits.includes(visit)) {
        visit._outgoing_edges.unsubscribe(this.update_route);
        visit.included.unsubscribe(this.update_route);
        visit.nights.unsubscribe(this.update_route);
      }
    });
  }

  update_route = () => {
    if (this.initializing_data) {
      return;
    }

    this.sorted_covered_visits = [];
    console.log('updating route.')
    const source_place = Object.values(this.map_handler.places.value).find((p) => p.name === 'Eindhoven');
    if (source_place === undefined || source_place.visits.value.length ===  0 || !source_place.visits.value[0].included.value) { return; }
    const source_visit = source_place.visits.value[0];

    Object.values(this.map_handler.places.value).forEach((place) => {
      place.visits.value.forEach((visit) => {
        ['covered', 'uncovered', 'excluded'].forEach(cl => visit.place.marker.visit_cells[visit.place.visits.value.indexOf(visit)].classList.remove(cl));
        visit.previous_edge.value = undefined;
        visit.next_edge.value = undefined;
        visit.entry_date.value = undefined;
        visit.exit_date.value = undefined;
        visit._outgoing_edges.value.forEach((edge) => {
            edge.route.set_disabled();
            edge.route.traverses.value = [];
        });
      });
    });

    // route.traverses.value = [...route.traverses.value, date];

    source_visit.previous_edge.value = undefined;
    var current_visit = source_visit;
    const covered_visits = new Set([current_visit]);
    this.sorted_covered_visits.push(current_visit);
    const covered_routes = new Set();
    while (true) {
      current_visit.place.marker.visit_cells[current_visit.place.visits.value.indexOf(current_visit)].classList.add('covered');
      current_visit.next_edge.value = current_visit._outgoing_edges.value.find((edge) => (edge.destination.included.value && !covered_visits.has(edge.destination)));
      current_visit._outgoing_edges.value.forEach((edge) => {
        if (edge === current_visit.next_edge.value) {
          edge.route.set_enabled();
          covered_routes.add(edge.route);
        } else if (!covered_routes.has(edge.route)) {
          edge.route.set_disabled();
        }
      });

      if (current_visit.next_edge.value === undefined) {
        // Encountered an end of the route.
        break;
      }
      const next_visit = current_visit.next_edge.value.destination;
      if (covered_visits.has(next_visit)) {
        // Encountered a loop in visits, should not happen!
        break;
      }
      covered_visits.add(next_visit);
      this.sorted_covered_visits.push(next_visit);
      next_visit.previous_edge.value = current_visit.next_edge.value;
      current_visit = next_visit;
    }

    Object.values(this.map_handler.places.value).forEach((place) => {
      place.visits.value.forEach((visit) => {
        if (!covered_visits.has(visit)) {
          visit.place.marker.visit_cells[visit.place.visits.value.indexOf(visit)].classList.add((!visit.included.value) ? 'excluded' : 'uncovered');
          visit.previous_edge.value = undefined;
          visit.next_edge.value = undefined;
          visit.entry_date.value = undefined;
          visit.exit_date.value = undefined;
          visit._outgoing_edges.value.forEach((edge) => {
            if (!covered_routes.has(edge.route)) {
              edge.route.set_disabled();
              edge.route.traverses.value = [];
            }
          });
        }
      });
    });

    this.update_dates();
    this.update_rent_info();
    this.update_cost_info();
  }

  update_dates = () => {
    Object.values(this.map_handler.places.value).forEach((place) => {
      place.country.visits.value = [];
      place.visits.value.forEach((visit) => {
        visit.entry_date.value = undefined;
        visit.exit_date.value = undefined;
      });
    });

    let current_country = undefined;
    let current_date = new Date(`${this.map_handler.overview.start_date.value}T00:00:00.000+00:00`);
    current_date = (isNaN(current_date)) ? new Date(this.map_handler.overview.start_date.value) : current_date;
    let previous_visit = undefined;
    this.sorted_covered_visits.forEach(visit => {
      const route_nights = (previous_visit === undefined) ? 0 : previous_visit?.next_edge.value.route.nights.value;
      current_date.setDate(current_date.getDate() + route_nights);
      visit.entry_date.value = new Date(Date.UTC(current_date.getUTCFullYear(), current_date.getUTCMonth(), current_date.getUTCDate()));
      current_date.setDate(current_date.getDate() + visit.nights.value);
      visit.exit_date.value = new Date(Date.UTC(current_date.getUTCFullYear(), current_date.getUTCMonth(), current_date.getUTCDate()));
      if (visit.place.country !== current_country) {
        current_country = visit.place.country;
        visit.place.country.visits.value = [...visit.place.country.visits.value, [visit.entry_date.value, visit.exit_date.value]];
      } else {
        const updated_exit = visit.place.country.visits.value[visit.place.country.visits.value.length - 1];
        updated_exit[1] = visit.exit_date.value;
        visit.place.country.visits.value = [...visit.place.country.visits.value.slice(0, -1), updated_exit];
      }
      if (visit.next_edge.value !== undefined) {
        visit.next_edge.value.route.traverses.value = [...visit.next_edge.value.route.traverses.value, current_date];
      }
      previous_visit = visit;
    });
    this.map_handler.overview.update_route(this.sorted_covered_visits[0]);
  }

  update_rent_info = () => {
    this.sorted_covered_visits.forEach(visit => {
      if (visit.next_edge.value?.rent_until !== undefined) {
        visit.popup.update_rent_info();
      }
    });
    this.sorted_covered_visits.forEach(visit => {
      if (visit.next_edge.value?.rent_until === undefined &&
          visit.next_edge.value?.route.route_type.value === 'driving') {
        visit.popup.update_rent_info();
      }
    });
  }

  update_cost_info = () => {
    let total_cost = {accommodation: 0, food: 0, miscellaneous: 0, transport: 0, activities: 0};
    let rent_until_edge = undefined;
    let covered_places = new Set();
    let routes_to_do = [];
    this.sorted_covered_visits.forEach(visit => {
      // console.log();
      // console.log(visit.place.name, visit.nights.value);
      if (visit === rent_until_edge?.rent_until) {
        rent_until_edge = undefined;
      }

      // console.log(rent_until_edge)

      if (rent_until_edge !== undefined) {
        if (rent_until_edge.includes_accommodation) {
          // console.log('jjaa', rent_until_edge.route.cost.value * visit.nights.value)
          total_cost.transport += 0.5 * rent_until_edge.route.cost.value * visit.nights.value;
          total_cost.accommodation += 0.5 * rent_until_edge.route.cost.value * visit.nights.value;
        } else {
          total_cost.transport += rent_until_edge.route.cost.value * visit.nights.value;
        }
      }

      // visit_cost: nights*acco (unless visit.included_in_rent), nights*food, nights*misc]
      if (rent_until_edge === undefined || !rent_until_edge.includes_accommodation) {
        // console.log(rent_until_edge?.includes_accommodation, visit.place.costs.accommodation)
        total_cost.accommodation += visit.nights.value * visit.place.costs.accommodation;
      }

      total_cost.food += visit.nights.value * visit.place.costs.food;
      total_cost.miscellaneous += visit.nights.value * visit.place.costs.miscellaneous;

      if (!covered_places.has(visit.place)) {
        visit.place.activities.forEach(activity => {
          if (activity.included) {
            total_cost.activities += activity.cost;
          }
        });
      }

      const edge = visit.next_edge.value;
      if (edge?.rent_until !== undefined) {
        rent_until_edge = edge;
        // rent_includes_accommodation = edge.includes_accommodation;
      }

      if (edge !== undefined && rent_until_edge === undefined) {
        // console.log('jojojo', edge.route.cost.value)
        if (edge.route.nights.value > 0) {
          // console.log('j00ojojo', edge.route.cost.value)
          if (edge.route.route_type.value === 'boat') {
            total_cost.transport += 0.25 * edge.route.cost.value;
            total_cost.accommodation += 0.25 * edge.route.cost.value;
            total_cost.food += 0.25 * edge.route.cost.value;
            total_cost.activities += 0.25 * edge.route.cost.value;
          } else {
            total_cost.transport += 0.4 * edge.route.cost.value;
            total_cost.accommodation += 0.4 * edge.route.cost.value;
            total_cost.food += 0.2 * edge.route.cost.value;
          }
        } else {
          // console.log('j11ojojo', edge.route.cost.value)
          total_cost.transport += edge.route.cost.value;
        }
      }

      covered_places.add(visit.place);
    });
    console.log(total_cost);
    console.log(total_cost.accommodation + total_cost.food + total_cost.miscellaneous + total_cost.transport + total_cost.activities);
    console.log(`Nr of routes without specified cost: ${routes_to_do.length}`)
    routes_to_do.forEach((route, index) => {
      console.log(`${index}: (${route.route_type.value}) ${route.source.name}, ${route.source.country.name} -> ${route.destination.name}, ${route.destination.country.name}`)
    });
  }
}