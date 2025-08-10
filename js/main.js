// const cb = (data) => {
//   console.log('cb');
//   console.log(data);
// }

class TravelApp {
  constructor(access_token) {
    const url_parameters = new URLSearchParams(window.location.search);
    const view_only = url_parameters.get('mode') !== 'edit';
    const trip_id = Number(url_parameters.get('trip')) || 1;
    const plan_id = Number(url_parameters.get('plan')) || 1;

    this.map_handler = new MapHandler('map', access_token, trip_id, plan_id, this.map_loaded, view_only);
  }

  map_loaded = () => {
    console.log(this.map_handler.plan_id);
    console.log(this.map_handler.trip_id);
    // console.log(lsls)
    backend_communication.call_google_function('GET', 'load_data',
        {'trip_id': this.map_handler.trip_id, 'plan_id': this.map_handler.plan_id},
    this.data_loaded);
    // backend_communication.fetch('/travel/load_data/',{}, this.data_loaded );
    window.onbeforeunload = () => {
      const center = this.map_handler.map.getCenter();
      backend_communication.call_google_function('POST',
          'set_last', {'parameters': {'lat': center.lng, 'lng': center.lat,
              'zoom': this.map_handler.map.getZoom(), 'plan_id': this.map_handler.plan_id}}, () => {} );
      // backend_communication.fetch('/travel/set_last/',{'parameters': {'lat': center.lng, 'lng': center.lat, 'zoom': this.map_handler.map.getZoom()}}, () => {} );
    }
  }

  data_loaded = (data) => {
    this.map_handler.graph.initializing_data = true;

    console.log('Response from server:', data);
    this.map_handler.overview.start_date.value = (new Date(data['general']['start_date'])).toISOString().split('T')[0];
    this.map_handler.map.jumpTo({center: [data['general']['lat'], data['general']['lng']]});
    this.map_handler.map.setZoom(data['general']['zoom']);

    this.map_handler.load_image('icons/bus.png', `direction_bus`, (image) => {});
    this.map_handler.load_image('icons/boat.png', `direction_boat`, (image) => {});
    this.map_handler.load_image('icons/train.png', `direction_train`, (image) => {});
    this.map_handler.load_image('icons/car.png', `direction_car`, (image) => {});
    this.map_handler.load_image('icons/plane.png', `direction_plane`, (image) => {});
    this.map_handler.load_image('icons/arrow.png', `direction_arrow`, (image) => {});

    for (const [country_id, country_data] of Object.entries(data.countries)) {
      const country_seasons = Object.values(data.seasons).filter(season => (season.country === Number(country_id)));
      this.map_handler.countries[country_id] = new Country(country_id, country_data['name'], country_seasons, data['country_notes'][country_id], this.map_handler);
    }

    for (const [place_id, place_data] of Object.entries(data.places)) {
      const new_place = this.map_handler.add_place(place_id, place_data.name, this.map_handler.countries[place_data['country_id']],
          place_data.coordinates, data.seasons[place_data['season_id']], place_data.estimated_costs, place_data.actual_costs,
          place_data.paids, data['activities'][place_id], data['place_notes'][place_id]);
    }

    for (const [route_id, route_data] of Object.entries(data.routes)) {
      const route = this.map_handler.add_route(route_id, route_data.source, route_data.destination, route_data.type,
          route_data.distance, route_data.duration, route_data.estimated_cost, route_data.actual_cost, route_data.paid,
          route_data.nights, route_data.route, data['route_notes'][route_id]);
    }

    const visits = {};
    for (const [visit_id, visit_data] of Object.entries(data.visits)) {
      const visit = this.map_handler.places.value[visit_data.place].add_visit(visit_id, visit_data.nights, visit_data.included);
      visits[visit_id] = visit;
    }

    for (const [visit_id, visit_data] of Object.entries(data.visits)) {
      const source_visit = visits[visit_id];
      if (visit_data.outgoing_edges !== undefined) {
        for (const edge of visit_data.outgoing_edges) {
          const destination_visit = visits[edge.destination_id];
          const route = this.map_handler.routes.value[edge.route_id];
          source_visit.add_outgoing_edge(destination_visit, route, edge.priority, visits[edge.rent_until], edge.includes_accommodation, false);
        }
      }
    }

    this.map_handler.graph.initializing_data = false;
    this.map_handler.graph.update_route();
  }
}

main = () => {
  const access_token = 'pk.eyJ1IjoiZG9taW5pcXVlc29tbWVycyIsImEiOiJjbWNoeHNnZG4wMHk1MmtzOGtodnluZHJzIn0.j0bybMxwa2BK4UgPIhxpQw';
  const travel_app = new TravelApp(access_token);
}


const sleepUntil = async (f, timeoutMs) => {
    return new Promise((resolve, reject) => {
        const timeWas = new Date();
        const wait = setInterval(function() {
            if (f()) {
                console.log("resolved after", new Date() - timeWas, "ms");
                clearInterval(wait);
                resolve();
            } else if (new Date() - timeWas > timeoutMs) { // Timeout
                console.log("rejected after", new Date() - timeWas, "ms");
                clearInterval(wait);
                reject();
            }
        }, 100);
    });
}

// Communication, Observable, country_isos, HTMLNumber, MapHandler, VisitPopup, Overview, Edge, bSpline, Country
sleepUntil(() =>
    (typeof Communication === 'function' && typeof Observable === 'function' && typeof HTMLNumber === 'function' &&
     typeof MapHandler === 'function' && typeof VisitPopup === 'function' && typeof Overview === 'function' && typeof Graph === 'function' &&
     typeof Edge === 'function' && typeof bSpline === 'function' && typeof Country === 'function' && typeof country_isos === 'object'),
    5000).then(() => {
      main();
  }).catch(() => {
      console.log('Did not load everything within 5 seconds.')
});
