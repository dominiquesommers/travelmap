class MapHandler {
  constructor(container, access_token, loaded_callback=() => {}) {
    mapboxgl.accessToken = access_token;
    this.container = container;
    this.overview = new Overview(this);
    this.loaded_callback = loaded_callback;
    this.initialize_map();
    this.custom_search = false;
    this.new_edge_source = undefined;
    this.new_edge_destination = new Observable(undefined);
    this.new_edge_route = undefined;
    this.countries = {};
    this.routes = new Observable({});
          // { type: 'Feature', properties: {}, geometry: {'coordinates': source_route, 'type': 'LineString' } }});
    this.places = new Observable({});
    this.graph = new Graph(this);
  };

  initialize_map = () => {
    this.loaded = false;
    // backend_communication.fetch('/travel/get_last/', {}, (data) => {
    //   console.log(data);
    this.map_style = 'standard' //'outdoors-v12';
    this.map = new mapboxgl.Map({
      container: this.container,
      // center: [-71.97856, -13.516283],
      center: [0, 0], //148.91417, -20.27917],
      // center: [-77.1075439453125, -12.023203053704648],
      maxZoom: 15,
      minZoom: 1,
      zoom: 8,
      // style: 'mapbox://styles/mapbox/outdoors-v12?optimize=true'
      style: `mapbox://styles/mapbox/${this.map_style}?optimize=true`
      // style: 'mapbox://styles/mapbox/satellite-v9?optimize=true'
      // style: 'mapbox://styles/mapbox/satellite-streets-v12'
      // style: 'mapbox://styles/mapbox/light-v11'
      // style: 'mapbox://styles/mapbox/dark-v11'
    });
    this.map.on('style.load', this.on_style_load);
    // });

    // this.map.on('zoom', (e) => {
    //   console.log('event type:', e.type);
    //
    //     // event type: boxzoomstart
    // });
  };

  get_visit_by_id = (visit_id) => {
    return Object.values(this.places.value).find((place) => place.visits.value.some(visit => visit.id === visit_id))?.visits.value.find(visit => visit.id === visit_id);
  }

  on_style_load = () => {
    if (!this.loaded) {
      console.log('loaded.');
      this.loaded = true;
      this.add_control();
      this.add_search();
      this.map.on('click', this.custom_search_map_clicked);
      this.loaded_callback();
      this.map.addSource('shade', {'type': 'geojson', 'data': { 'type': 'Feature', 'geometry': { 'type': 'Polygon', 'coordinates': [[[0, 90], [0, -90], [360, -90], [360, 90], [0, 90]]]}}});
      this.initialize_routes();

      // const eventSource = new EventSource('/travel/sse_stream/')
      // eventSource.onmessage = (event) => {
      //   console.log(event.data);
      // }
    }
  };

  initialize_routes = () => {
    const images = {undefined: 'direction_arrow', 'boat': 'direction_boat', 'flying': 'direction_plane', 'bus': 'direction_bus', 'train': 'direction_train', 'driving': 'direction_car'};

    const line_colors = {
      'driving': 'rgba(102, 153, 204',
      'boat': 'rgba(255, 140, 66',
      'flying': 'rgba(252, 186, 3',
      'bus': 'rgba(227, 67, 64',
      'train': 'rgba(162, 62, 72',
      undefined: 'rgba(112, 112, 112'
    };
    const line_opacities = {'enabled': 1, 'highlighted': 1, 'disabled': 0.05};

    const icon_sizes = {'direction_car': 0.2, 'direction_boat': 0.2, 'direction_plane': 0.2, 'direction_bus': 0.2, 'direction_train': 0.2, 'direction_arrow': 0.12};
    const line_colorss = {'enabled': '#ea5858', 'highlighted': 'rgba(255, 255, 255', 'highlighted2': 'rgba(234, 88, 176', 'disabled': 'rgba(0,0,0,0.03)'};
    const icon_opacities = {'enabled': 1, 'highlighted': 1, 'disabled': 0.05};
    ['disabled', 'enabled', 'highlighted'].forEach((color) => {
      Object.entries(images).forEach(([route_type, image]) => {
        const source_id = `routes_${color}_${route_type}`;
        const line_color = (color !== 'highlighted') ? `${line_colors[route_type]}, ${line_opacities[color]})` : `${line_colorss[color]}, ${line_opacities[color]})`;
        this.map.addSource(source_id, { type: 'geojson', data: { 'type': 'FeatureCollection', 'features': []}, dynamic: true});
        this.add_layer({ id: `routes_${color}_${route_type}_lines`, type: 'line', source: source_id, layout: {'line-cap': 'round'},
          paint: { 'line-color': line_color,  // line_colors[color],
            'line-width': 3}});
        this.add_layer({ id: `routes_${color}_${route_type}_icons`, 'type': 'symbol', 'source': source_id, 'paint': { 'icon-opacity': icon_opacities[color] }, 'minzoom': 0,
           'layout': { 'symbol-placement': 'line', 'symbol-spacing': 100, 'icon-allow-overlap': true,
             'icon-image': images[route_type], 'icon-size': icon_sizes[images[route_type]], 'visibility': 'visible' }});

      this.map.on('click', `routes_${color}_${route_type}_icons`, (event) => this.routes.value[event.features[0].id].route_clicked(event));
      this.map.on('mouseenter', `routes_${color}_${route_type}_icons`, (event) => {
        this.route_hover_id = event.features[0].id;
        this.routes.value[event.features[0].id].route_hover(event);
      });
      this.map.on('mouseleave', `routes_${color}_${route_type}_icons`, (event) => this.routes.value[this.route_hover_id].route_unhover(event));
      });
    });
  };

  custom_search_map_clicked = (event) => {
    if (this.custom_search_button?.innerHTML === 'cancel') {
      this.custom_search = false;
      this.custom_search_button.innerHTML = 'custom2';
      this.map.getCanvas().style.cursor = '';
      const all_features = this.map.queryRenderedFeatures(event.point);
      console.log(all_features);
      const get_name = {
        'outdoors-v12': (feature) => ('name_en' in feature.properties) ? feature.properties.name_en : feature.properties.name,
        'standard': (feature) => ('name_en' in feature._vectorTileFeature.properties) ? feature._vectorTileFeature.properties.name_en : feature._vectorTileFeature.properties.name
      };
      const get_country_iso = {
        'outdoors-v12': (feature) => feature.properties.iso_3166_1,
        'standard': (feature) => feature._vectorTileFeature.properties.iso_3166_1
      }

      const features = all_features.filter((feature) =>
              (get_name[this.map_style](feature) !== undefined) && (get_country_iso[this.map_style](feature) !== undefined)
          // ((('name_en' in feature.properties) || ('name' in feature.properties)) && ('iso_3166_1' in feature.properties))
          // (feature.layer['source-layer'] === 'place_label') ||
          // (feature.layer['source-layer'] === 'poi_label' && feature.properties.class === 'park_like') ||
          // (feature.layer['source-layer'] === 'natural_label' && feature.properties.class === 'landform')
      );
      if (features.length > 1) {
        console.log('Multiple labels found, taking the first.');
        console.log(features);
      }
      if (features.length > 0) {
        const place_name = get_name[this.map_style](features[0]);
        const country_name = country_isos[get_country_iso[this.map_style](features[0])][0];
        // const place_name = ('name_en' in features[0].properties) ? features[0].properties.name_en : features[0].properties.name;
        // const country_name = country_isos[features[0].properties.iso_3166_1][0];
        const country = Object.values(this.countries).filter((c) => c.name === country_name)[0];
        const place_id = `${place_name},${country_name}`;
        console.log(`${place_id} [${event.lngLat.lng}, ${event.lngLat.lat}]`);
        const season = country?.seasons[0];
        if (!Object.values(this.places.value).some(place => place.get_id() === place_id)) {
          this.add_place(undefined, place_name, (country === undefined) ? country_name : country, {'lat': event.lngLat.lng, 'lng': event.lngLat.lat}, season);
        }
        // }
      }
    }

    /*
    insert into countries (name) values ('Australia'), ('Bolivia'), ('Chile'), ('Colombia'), ('Costa Rica'), ('Ecuador'), ('Indonesia'), ('Laos'), ('Netherlands'), ('Nicaragua'), ('Panama'), ('Peru'), ('Philippines'), ('Singapore'), ('Thailand');
     */
  }

  add_control = () => {
    const nav = new mapboxgl.NavigationControl();
    this.map.addControl(nav, 'bottom-left');
  };

  add_search = () => {
    const searchBox = new MapboxSearchBox();
    searchBox.accessToken = mapboxgl.accessToken;
    searchBox.options = {types: 'place,city'};  //,address,poi',
    this.map.addControl(searchBox, 'top-left');
    searchBox.addEventListener('retrieve', this.search_callback);
    const x = document.getElementsByClassName('mapboxgl-ctrl-top-left')[0];
    x.style.width = '400px';
    this.custom_search_button = document.createElement('button');
    x.appendChild(this.custom_search_button);
    this.custom_search_button.classList.add('custom-search');
    this.custom_search_button.innerHTML = 'custom'
    this.custom_search_button.addEventListener('click', (e) => {
      if (this.custom_search_button.innerHTML === 'custom') {
        this.custom_search_button.innerHTML = 'cancel';
        this.map.getCanvas().style.cursor = 'pointer';
      } else {
        this.custom_search_button.innerHTML = 'custom';
        this.map.getCanvas().style.cursor = '';
      }
    });
    this.blub = document.createElement('button');
    document.getElementById('container').appendChild(this.blub);
    this.blub.classList.add('hide');
    this.blub.innerHTML = 'Hide';
    this.blub.addEventListener('click', (e) => {
      if (this.blub.innerHTML === 'Hide') {
        this.blub.innerHTML = 'Show';
        document.getElementById('properties').style = 'display: none';
        this.map.resize();
      } else {
        this.blub.innerHTML = 'Hide';
        document.getElementById('properties').style = 'display: block';
        this.map.resize();
      }
    });
  };

  search_callback = (event) => {
    const selection = event.detail.features[0];
    const selection_name = selection.properties.context.place.name;
    const selection_country_name = selection.properties.context.country.name;
    const selection_coords = selection.geometry.coordinates;

    const selection_country = Object.values(this.countries).filter((c) => c.name === selection_country_name)[0];
    const season = selection_country?.seasons[0];
    const place_id = `${selection_name},${selection_country_name}`;
    if (!Object.values(this.places.value).some(place => place.get_id() === place_id)) {
      this.add_place(undefined, selection_name, (selection_country === undefined) ? selection_country_name : selection_country,
          {  'lat': selection_coords[0], 'lng': selection_coords[1] }, season);
    }
  }

  load_image = (filename, image_name, callback) => {
    // console.log(`Trying to load image: ${filename}.`)
    this.map.loadImage(filename, (err, image) => {
      if (err) {
        console.error('err image', err);
      }
      this.map.addImage(image_name, image);
      callback(image);
    })
  }

  add_place = (place_id, name, country, coordinates, season=undefined, costs=undefined, activities=[]) => {
    if (place_id === undefined) {
      const args = { 'parameters': {'name': name, 'country': (country instanceof Country) ? country.name : country,
          'lat': coordinates.lat, 'lng': coordinates.lng , 'season_id': season?.id}};
      backend_communication.call_google_function('POST',
          'add_place', args, (data) => {
        console.log(data);
        if (data['status'] === 'OK') {
          if (!(country instanceof Country)) {
            this.countries[data['country_id']] = new Country(data['country_id'], country, []);
            country = this.countries[data['country_id']];
          }
          this.add_place(data['place_id'], name, country, coordinates, season);
        } else {
          console.log(data);
        }
      });
      // backend_communication.fetch('/travel/add_place/', args, (data) => {
      //   if (data['status'] === 'OK') {
      //     if (!(country instanceof Country)) {
      //       this.countries[data['country_id']] = new Country(data['country_id'], country, []);
      //       country = this.countries[data['country_id']];
      //     }
      //     this.add_place(data['place_id'], name, country, coordinates, season);
      //   } else {
      //     console.log(data);
      //   }
      // });
    } else {
      const new_place = {};
      costs = (costs !== undefined) ? costs : {'accommodation': 0, 'food': 0, 'miscellaneous': 0};
      new_place[place_id] = new Place(place_id, name, country, coordinates, season, costs, activities, this);
      this.places.value = {...this.places.value, ...new_place};
      return new_place[place_id];
    }
  }

  delete_place = (place) => {
    const args = { 'parameters': {'place_id': place.id }};
    backend_communication.call_google_function('POST',
          'remove_place', args, (data) => {
      console.log(data);
      if (data['status'] === 'OK') {
        place.marker.popup.remove();
        place.marker.marker.remove();
        delete this.places.value[place.id];
        this.places.value = {...this.places.value}
        Object.values(this.routes.value).forEach((route) => {
          if (route.source === place || route.destination === place) {
            this.remove_route(route);
          }
        });
      } else {
        console.log(data);
      }
    });

    // backend_communication.fetch('/travel/remove_place/', args, (data) => {
    //   if (data['status'] === 'OK') {
    //     place.marker.popup.remove();
    //     place.marker.marker.remove();
    //     delete this.places.value[place.id];
    //     this.places.value = {...this.places.value}
    //     Object.values(this.routes.value).forEach((route) => {
    //       if (route.source === place || route.destination === place) {
    //         this.remove_route(route);
    //       }
    //     });
    //   } else {
    //     console.log(data);
    //   }
    // });
  }

  add_route = (route_id, source_id, destination_id, route_type=undefined, distance=0, duration=0,
               cost=0, nights=0, route=undefined, callback=(new_route) => {}) => {
    if (route_id === undefined) {
      const args = { 'parameters': {'source_id': source_id, 'destination_id': destination_id, 'route_type': route_type,
                                                     'distance': distance, 'duration': duration, 'cost': cost, 'nights': nights, 'route': route} };
      backend_communication.call_google_function('POST',
        'add_route', args, (data) => {
        if (data['status'] === 'OK') {
          callback(this.add_route(data['route_id'], source_id, destination_id, route_type, distance, duration, cost, nights, route));
        } else {
          console.log(data);
          callback(undefined);
        }
      });
      // backend_communication.fetch('/travel/add_route/', args, (data) => {
      //   if (data['status'] === 'OK') {
      //     callback(this.add_route(data['route_id'], source_id, destination_id, route_type, distance, duration, cost, nights, route));
      //   } else {
      //     console.log(data);
      //     callback(undefined);
      //   }
      // });
    } else {
      const new_route = new Route(route_id, this.places.value[source_id], this.places.value[destination_id], route_type, distance, duration, cost, nights, route, this);
      const routes = {};
      routes[route_id] = new_route;
      this.routes.value = {...this.routes.value, ...routes};
      new_route.add_to_map();
      return new_route;
    }
  }

  remove_route = (route) => {
    route.popup.remove();
    this.map.removeLayer(route.route_layer_id);
    this.map.removeLayer(route.route_arrow_layer_id);
    this.map.removeSource(route.route_source_id);
    delete this.routes.value[route.id];
    this.routes.value = {...this.routes.value};
    route.source.visits.value.forEach((visit) => {
      const edges_to_remove = visit._outgoing_edges.value.filter((edge) => edge.route === route);
      edges_to_remove.forEach((edge) => visit.remove_outgoing_edge(edge, false));
    });
  }

  delete_route = (route) => {
    const args = { 'parameters': {'route_id': route.id} };
    backend_communication.call_google_function('POST',
      'remove_route', args, (data) => {
      if (data['status'] === 'OK') {
        this.remove_route(route);
      } else {
        console.log(data);
      }
    });
    // backend_communication.fetch('/travel/remove_route/', args, (data) => {
    //   if (data['status'] === 'OK') {
    //     this.remove_route(route);
    //   } else {
    //     console.log(data);
    //   }
    // });
  }

  get_route_by_id = (route_id) => {
    // TODO (after different way of saving routes: source: {dest1: {fly, drive, undef}, dest2: {}})
  }

  add_layer = (parameters) => {
    this.map.addLayer(parameters);
  }

  is_shaded = () => {
    return (this.map.getLayer('shade') !== undefined);
  }

  toggle_shade = () => {
    console.log(`toggle shade, is: ${(this.map.getLayer('shade') !== undefined)}`)
    if (!this.is_shaded()) {
      const shade_layer = {
      'id': 'shade', 'type': 'fill',
      'source': 'shade',
      'layout': {}, 'paint': { 'fill-color': 'rgba(0,0,0,0.4)', 'fill-opacity': 1,
                'fill-opacity-transition': { duration: 2000 } } };
      this.add_layer(shade_layer);
    } else {
      this.map.removeLayer('shade');
    }
    console.log(`now: ${(this.map.getLayer('shade') !== undefined)}`)
  }
}