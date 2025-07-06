

class Edge {
  constructor(source_visit, destination_visit, route, priority, rent_until, includes_accommodation) {
    this.source = source_visit;
    this.destination = destination_visit;
    this.route = route;
    this.priority = priority;
    this.rent_until = rent_until;
    this.includes_accommodation = includes_accommodation;
  }

  get_id = () => {
    return `${this.source.place.get_id()}-${this.destination.place.get_id()}:${this.route.route_type.value}`
  }

  // update = (y, map) => {
  //   console.log(y);
  //   // this.route
  //   // map.setPaintProperty(layer.value, 'line-color', color);
  // }
}


class RoutePopup {
  constructor(route) {
    this.route = route;
    this.popup_div = document.createElement('div');
    this.popup_offsets = { 'bottom': [0, -10], 'top': [0, 10], 'left': [10, 0], 'right': [-10, 0], 'top-left': [8, 8], 'top-right': [-8, 8], 'bottom-left': [8, -8], 'bottom-right': [-8, -8] };
    this.create_popup();
  }

  type_changed = (event) => {
    this.route.route_type.value = this.route_type.value;
    this.per_day.innerHTML = (this.route.route_type.value === 'driving') ? '/d' : '';
  }



  create_elements = () => {
    this.source = document.createElement('span');
    this.source.classList.add('pointer');
    this.source.addEventListener('click', () =>
      this.route.map_handler.map.flyTo({center: [this.route.source.coordinates.lat, this.route.source.coordinates.lng]}));
    this.destination = document.createElement('span');
    this.destination.classList.add('pointer');
    this.destination.addEventListener('click', () =>
      this.route.map_handler.map.flyTo({center: [this.route.destination.coordinates.lat, this.route.destination.coordinates.lng]}));

    this.route_type = new HTMLSelect(['flying', 'train', 'bus', 'driving', 'boat', undefined].map(t => [t, transport_icons[t]]),
        ['transport-select'], this.type_changed, this.route.map_handler.view_only).select;
    this.route_type.value = this.route.route_type.value;

    this.duration = new HTMLNumber([], () => {this.route.duration.value = Number(this.duration.innerHTML);}, this.route.map_handler.view_only).span;
    this.route.duration.subscribe((new_value, old_value) => { this.duration.innerHTML = Math.round(new_value);} );
    this.cost = new HTMLNumber([], () => {this.route.cost.value = Number(this.cost.innerHTML);}, this.route.map_handler.view_only).span;
    this.nights = new HTMLNumber([], () => {this.route.nights.value = Number(this.nights.innerHTML);}, this.route.map_handler.view_only).span;
  }

  duration_changed = () => {
    this.route.duration.value = Number(this.duration.innerHTML);
  }

  cost_changed = () => {
    this.route.cost.value = Number(this.cost.innerHTML);
  }

  create_popup = () => {
    this.create_elements();
    const table_constructor = new HTMLTable(['popup']);
    for (var row_index = 0; row_index < 3; row_index += 1) {
      table_constructor.add_row();
    }

    // Todo update transport info correctly and add observers to each value.
    // Todo edit options for transport info.
    const cell0 = table_constructor.add_cell(0, ['leftie']);
    const cell1 = table_constructor.add_cell(0, ['leftie']);
    cell1.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 341.333 341.333" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M170.667 0C76.41 0 0 76.41 0 170.667s76.41 170.667 170.667 170.667 170.667-76.41 170.667-170.667S264.923 0 170.667 0zm0 298.667c-70.692 0-128-57.308-128-128s57.308-128 128-128 128 57.308 128 128-57.308 128-128 128z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    const cell2 = table_constructor.add_cell(0, ['adjacent-visit', 'previous']);
    cell2.appendChild(this.source);
    this.source.innerHTML = this.route.source.get_id();

    const cell3 = table_constructor.add_cell(1, ['transport']);
    cell3.appendChild(this.route_type);

    // cell3.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 45.437 45.437" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M41.403 11.11c-.371-3.627-.962-6.451-1.897-7.561-3.855-4.564-30.859-4.898-33.925 0-.75 1.2-1.276 4.014-1.629 7.567a2.287 2.287 0 0 0-2.026 2.267v4.443a2.29 2.29 0 0 0 1.5 2.146c-.207 6.998-.039 14.299.271 17.93 0 2.803 1.883 2.338 1.883 2.338h1.765v3.026c0 1.2 1.237 2.171 2.761 2.171 1.526 0 2.763-.971 2.763-2.171V40.24h20.534v3.026c0 1.2 1.236 2.171 2.762 2.171 1.524 0 2.761-.971 2.761-2.171V40.24h.58s2.216.304 2.358-1.016c0-3.621.228-11.646.04-19.221a2.28 2.28 0 0 0 1.607-2.177v-4.443a2.284 2.284 0 0 0-2.108-2.273zM12.176 4.2h20.735v3.137H12.176V4.2zm.296 32.467a2.947 2.947 0 1 1 0-5.895 2.947 2.947 0 0 1 0 5.895zm20.328 0a2.948 2.948 0 1 1-.002-5.892 2.948 2.948 0 0 1 .002 5.892zm3.747-12.9H8.54V9.077h28.007v14.69z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    const cell4 = table_constructor.add_cell(1, ['leftie']);
    cell4.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 16 16" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M9.414.586a2 2 0 1 1-2.828 2.828A2 2 0 0 1 9.414.586M9.414 6.586a2 2 0 1 1-2.828 2.828 2 2 0 0 1 2.828-2.828M9.414 12.586a2 2 0 1 1-2.828 2.828 2 2 0 0 1 2.828-2.828" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    const cell5 = table_constructor.add_cell(1, ['adjacent-visit']);
    cell5.appendChild(this.duration);
    this.duration.innerHTML = Math.round(this.route.duration.value);
    const divider = document.createElement('span');
    divider.innerHTML = 'h — €'
    cell5.appendChild(divider);
    cell5.appendChild(this.cost);
    this.cost.innerHTML = (this.route.cost.value !== undefined) ? Math.round(this.route.cost.value) : 0; // TODO default?
    this.per_day = document.createElement('span');
    this.per_day.innerHTML = (this.route.route_type.value === 'driving') ? '/d' : '';
    cell5.appendChild(this.per_day);
    const divider2 = document.createElement('span');
    divider2.innerHTML = ' — '
    cell5.appendChild(divider2);
    cell5.appendChild(this.nights);
    this.nights.innerHTML = (this.route.nights.value !== undefined) ? this.route.nights.value : 0; // TODO default?
    const divider3 = document.createElement('span');
    divider3.innerHTML = ' nights.'
    cell5.appendChild(divider3);

    const delete_span = document.createElement('span');
    cell5.appendChild(delete_span);
    delete_span.innerHTML = ' <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" x="0" y="0" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="m62.205 150 26.569 320.735C90.678 493.865 110.38 512 133.598 512h244.805c23.218 0 42.92-18.135 44.824-41.265L449.795 150H62.205zm118.781 302c-7.852 0-14.458-6.108-14.956-14.063l-15-242c-.513-8.276 5.771-15.395 14.033-15.908 8.569-.601 15.381 5.757 15.908 14.033l15 242c.531 8.57-6.25 15.938-14.985 15.938zM271 437c0 8.291-6.709 15-15 15s-15-6.709-15-15V195c0-8.291 6.709-15 15-15s15 6.709 15 15v242zm89.97-241.062-15 242c-.493 7.874-7.056 14.436-15.908 14.033-8.262-.513-14.546-7.632-14.033-15.908l15-242c.513-8.276 7.764-14.297 15.908-14.033 8.262.513 14.546 7.632 14.033 15.908zM451 60h-90V45c0-24.814-20.186-45-45-45H196c-24.814 0-45 20.186-45 45v15H61c-16.569 0-30 13.431-30 30 0 16.567 13.431 30 30 30h390c16.569 0 30-13.433 30-30 0-16.569-13.431-30-30-30zm-120 0H181V45c0-8.276 6.724-15 15-15h120c8.276 0 15 6.724 15 15v15z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    delete_span.classList.add('pointer');
    delete_span.addEventListener('click', (event) => {
      if (confirm('Are you sure you want to delete this route?')) {
        console.log('delete route.');
        this.route.map_handler.delete_route(this.route);
      }
    });


    const cell10 = table_constructor.add_cell(2, ['leftie']);
    const cell11 = table_constructor.add_cell(2, ['leftie']);
    cell11.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 341.333 341.333" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M170.667 0C76.41 0 0 76.41 0 170.667s76.41 170.667 170.667 170.667 170.667-76.41 170.667-170.667S264.923 0 170.667 0zm0 298.667c-70.692 0-128-57.308-128-128s57.308-128 128-128 128 57.308 128 128-57.308 128-128 128z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    const cell12 = table_constructor.add_cell(2, ['adjacent-visit', 'next']);
    cell12.appendChild(this.destination);
    this.destination.innerHTML = this.route.destination.get_id();

    // TODO add row of edges using this route (their dates, and the visit indices?)

    this.popup_div.appendChild(table_constructor.table);
  }
}


class Route {
  constructor(id, source, destination, route_type, distance=0, duration=0, cost=0, nights=0, route, route_notes, map_handler) {
    this.id = id;
    this.source = source;
    this.destination = destination;
    this.route_type = new Observable(route_type, this.check_same); // driving, flying, undefined
    this.route_type.subscribe(this.route_type_changed);
    this.road_route_types = ['driving', 'train', 'bus'];
    this.distance = new Observable(distance, this.check_same);
    this.distance.subscribe((new_value, old_value) => this.property_changed('distance', new_value, old_value));
    this.duration = new Observable(duration, this.check_same);
    this.duration.subscribe((new_value, old_value) => this.property_changed('duration', new_value, old_value));
    this.cost = new Observable(cost, this.check_same);
    this.cost.subscribe((new_value, old_value) => this.property_changed('cost', new_value, old_value));
    this.nights = new Observable(nights, this.check_same);
    this.nights.subscribe((new_value, old_value) => this.property_changed('nights', new_value, old_value));
    this.route = (route === undefined) ? new Observable([[source.coordinates.lat, source.coordinates.lng], [destination.coordinates.lat, destination.coordinates.lng]], this.check_same) : new Observable(route, this.check_same);
    this.route_spline = this.compute_route_spline(this.route.value);
    this.route.subscribe((new_value, old_value) => this.property_changed('route', new_value, old_value, () => {
      this.route_spline = this.compute_route_spline(this.route.value);
    }));
    this.enabled = false;
    this.traverses = new Observable([], this.check_same)
    this.route_source_id = `route_source:${this.get_id()}`;
    this.route_layer_id = `route:${this.get_id()}`;
    this.route_arrow_layer_id = `route_arrow:${this.get_id()}`;
    this.notes = route_notes;
    this.notes_descriptions_loaded = false;
    this.map_handler = map_handler;

    this.route_popup = new RoutePopup(this);
    this.popup = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '450px', className: 'popupdiv', offset: this.route_popup.popup_offsets }).setDOMContent(this.route_popup.popup_div);
    this.overview = new RouteOverview(this);
    this.popup.on('open', () => {
      this.map_handler.overview.set_html(this.overview.html);
      this.get_note_descriptions();
    });
    this.popup.on('close', () => {
      this.map_handler.overview.reset();
    });
    this.optimize = true;
  }

  compute_route_spline = (controlpoints) => {
    const start_dist = Math.sqrt( Math.pow((controlpoints[0][0]-this.source.coordinates.lat), 2) + Math.pow((controlpoints[0][1]-this.source.coordinates.lng), 2) );
    const end_dist = Math.sqrt( Math.pow((controlpoints[controlpoints.length - 1][0]-this.destination.coordinates.lat), 2) + Math.pow((controlpoints[controlpoints.length - 1][1]-this.destination.coordinates.lng), 2) );
    if (start_dist > 100 || end_dist > 100) {
      console.log(this.source.name, this.destination.name);
    }
    if (start_dist > 0.05 && start_dist < 100) {
      controlpoints = [[this.source.coordinates.lat, this.source.coordinates.lng], ...controlpoints];
    }
    if (end_dist > 0.05 && end_dist < 100) {
      controlpoints = [...controlpoints, [this.destination.coordinates.lat, this.destination.coordinates.lng]];
    }
    if (controlpoints.length > 2) {
      const omit_factor = {undefined: 1, 'boat': 1, 'flying': 1, 'bus': 7, 'train': 10, 'driving': 5}[this.route_type.value];
      return [interpolateBSpline([controlpoints[0], ...controlpoints.slice(1, -1).filter((value, index, Arr) => index % omit_factor == 0), controlpoints[controlpoints.length - 1]], 5)];
    } else {
      const diff = controlpoints[0][0] - controlpoints[1][0];
      if (Math.abs(diff) > 180) {
        const c1 = 180 - Math.abs(controlpoints[0][0]);
        const c2 = 180 - Math.abs(controlpoints[1][0]);
        const mid = (controlpoints[0][1] * (c2 / (c1 + c2))) + (controlpoints[1][1] * (c1 / (c1 + c2)));
        return [[controlpoints[0], [((diff > 180) ? 1 : -1) * 180, mid + ((diff > 180) ? 2 : -2)]], [[((diff > 180) ? -1 : 1) * 180, mid + ((diff > 180) ? 2 : -2)], controlpoints[1]]];
      }
      const bearing = {'Schiphol': -40, 'Buenos Aires': -20}[this.source.name];
      const pointC1 = calculatePointC(controlpoints[0], controlpoints[controlpoints.length - 1], (bearing !== undefined) ? bearing : 10);
      return [interpolateBSpline([controlpoints[0], [pointC1[1], pointC1[0]], controlpoints[controlpoints.length - 1]], 50)];
    }
  }

  route_type_changed = (new_type, old_type) => {
    // TODO check with existing routes (should be handled in the select in the popup actually already).
    this.property_changed('type', new_type, old_type, () => {
      this.set_route(new_type, old_type); // todo handle if no route exists.

      // this.map_handler.graph.update_route();
    });
  }

  property_changed = (property, new_value, old_value, callback=()=>{}) => {
    // console.log(property);
    const args = { 'parameters': {'id': this.id, 'column': property, 'value': new_value} };
    backend_communication.call_google_function('POST',
              'update_route', args, (data) => {
      if (data['status'] === 'OK') {
        callback();
      } else {
        console.log(data);
      }
    });
    // backend_communication.fetch('/travel/update_route/', args, (data) => {
    //   if (data['status'] === 'OK') {
    //     callback();
    //   } else {
    //     console.log(data);
    //   }
    // });
    this.map_handler.graph.update_rent_info();
  }

  route_clicked = (event) => {
    if (this.map_handler.is_shaded()) {
      console.log('route clicked.')
      if (this.map_handler.new_edge_source?.place === this.source &&
          // !this.map_handler.new_edge_source?._outgoing_edges.value.some((edge) => edge.route === this) &&
          this.map_handler.new_edge_route === undefined) {
        event.originalEvent.cancelBubble = true;
        console.log('new outgoing route clicked.')
        this.map_handler.new_edge_route = this;
        this.map_handler.map.flyTo({center: [this.destination.coordinates.lat, this.destination.coordinates.lng], zoom: 9, essential: true});
      } else {
        console.log('already in out-edges.')
      }
    } else {
      if(!event.originalEvent.defaultPrevented) {
        // click was performed outside of layer_1
        event.originalEvent.preventDefault();
        this.popup.setLngLat(event.lngLat);
        this.set_highlight();
        this.popup.addTo(this.map_handler.map);
        this.popup.on('close', () => this.unset_highlight());
      }
    }
  }

  route_hover = (event) => {
    if (!this.map_handler.is_shaded()) {
      this.map_handler.map.getCanvas().style.cursor = 'pointer';
    } else if ((this.map_handler.new_edge_source?.place === this.source) &&
               // !this.map_handler.new_edge_source?._outgoing_edges.value.some((edge) => edge.route === this) &&
                this.map_handler.new_edge_route === undefined) {
      this.map_handler.map.getCanvas().style.cursor = 'pointer';
      // this.set_highlight();
      // this.popup.on('open', () => {});
      // this.popup.on('close', () => {});
      this.popup.setLngLat(event.lngLat);
      this.popup.addTo(this.map_handler.map);
    }
  }

  route_unhover = (event) => {
    this.map_handler.map.getCanvas().style.cursor = '';
    if (this.map_handler.is_shaded() && this.map_handler.new_edge_route !== this) {
      // this.unset_highlight();
      this.popup.remove();
      // this.popup.on('open', () => this.map_handler.overview.set_html(this.overview.html) );
    }
  }

  add_to_map = () => {
    const source_route = [this.route.value[0], this.route.value[this.route.value.length - 1]];

    ['disabled', 'enabled'].forEach((color) => {
      const source = this.map_handler.map.getSource(`routes_${color}_${this.route_type.value}`);
      const source_data = source._data;
      source_data.features.push({ type: 'Feature', id: this.id, properties: {}, geometry: {'coordinates': [], 'type': 'MultiLineString' } });
      source.setData(source_data);
    });


    // if (!this.optimize) {
    //   this.map_handler.map.addSource(this.route_source_id, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: {'coordinates': source_route, 'type': 'LineString' } }});
    //   this.map_handler.add_layer(this.get_line_parameters());
    //   this.map_handler.add_layer(this.get_arrow_parameters());
    //   this.map_handler.map.on('click', this.route_arrow_layer_id, this.route_clicked);
    //   this.map_handler.map.on('mouseenter', this.route_arrow_layer_id, this.route_hover);
    //   this.map_handler.map.on('mouseleave', this.route_arrow_layer_id, this.route_unhover);
    // }
    this.set_disabled();
  }

  get_id = () => {
    return `${this.source.get_id()}-${this.destination.get_id()}:${this.route_type.value}`
  }

  get_parameters = () => {
    return {'source': this.source.get_id(), 'destination': this.destination.get_id(), 'type': this.route_type.value,
            'distance': this.distance.value, 'duration': this.duration.value, 'cost': this.cost.value, 'route': this.route.value};
  }

  set_disabled = () => {
    this.map_handler.map.getSource(`routes_enabled_${this.route_type.value}`).updateData(
        { "type": "FeatureCollection", "features": [{ "id": this.id, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": [] } }] });
    this.map_handler.map.getSource(`routes_disabled_${this.route_type.value}`).updateData(
        { "type": "FeatureCollection", "features": [{ "id": this.id, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": this.route_spline } }] });

    this.enabled = false;
    // if (!this.optimize) {
    //   this.map_handler.map.setPaintProperty(this.route_layer_id, 'line-color', 'rgba(0,0,0,0.27)');
    //   this.map_handler.map.setPaintProperty(this.route_arrow_layer_id, 'icon-opacity', 0.27);
    // }
  }

  set_enabled = () => {
    // if (this.get_id() === 'Santiago,Chile-Melbourne,Australia:flying') {
    //   // could use MultiLineString
    //   console.log(this.route.value);
    // }
    // console.log('set_enabled');
    const enabled_source = this.map_handler.map.getSource(`routes_enabled_${this.route_type.value}`);
    // const route = (this.route.value.length <= 2) ? this.route.value : interpolateBSpline([this.route.value[0], ...this.route.value.slice(1, -1).filter((value, index, Arr) => index % 5 == 0), this.route.value[this.route.value.length - 1]], 3);
    enabled_source.updateData({ "type": "FeatureCollection", "features": [{ "id": this.id, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": this.route_spline } }] });

    const disabled_source = this.map_handler.map.getSource(`routes_disabled_${this.route_type.value}`);
    disabled_source.updateData({ "type": "FeatureCollection", "features": [{ "id": this.id, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": [[]] } }] });
    this.enabled = true;
  }

  set_highlight = () => {
    ((this.enabled) ? this.map_handler.map.getSource(`routes_enabled_${this.route_type.value}`) : this.map_handler.map.getSource(`routes_disabled_${this.route_type.value}`)).updateData(
        { "type": "FeatureCollection", "features": [{ "id": this.id, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": [[]] } }] }
    );
    this.map_handler.map.getSource(`routes_highlighted_${this.route_type.value}`).updateData({ "type": "FeatureCollection", "features": [{ "id": this.id, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": this.route_spline } }] });
    this.highlighted = true;

    // const enabled_source = this.map_handler.map.getSource(`routes_enabled_${this.route_type.value}`);
    // const disabled_source = this.map_handler.map.getSource(`routes_disabled_${this.route_type.value}`);
    // if (!this.optimize) {
    //   this.map_handler.map.setPaintProperty(this.route_layer_id, 'line-color', '#ea58b0');
    //   this.map_handler.map.setPaintProperty(this.route_arrow_layer_id, 'icon-opacity', 1);
    // }
  }

  unset_highlight = () => {
    this.map_handler.map.getSource(`routes_highlighted_${this.route_type.value}`).updateData({ "type": "FeatureCollection", "features": [{ "id": this.id, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": [] } }] });
    ((this.enabled) ? this.map_handler.map.getSource(`routes_enabled_${this.route_type.value}`) : this.map_handler.map.getSource(`routes_disabled_${this.route_type.value}`)).updateData(
        { "type": "FeatureCollection", "features": [{ "id": this.id, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": this.route_spline } }] }
    );
    this.highlighted = false;
  }

  set_route = (new_route_type, old_route_type) => {
    const update_route_source = () => {
      const middle = this.highlighted ? 'highlighted' : (this.enabled ? 'enabled' : 'disabled');
      const old_source = this.map_handler.map.getSource(`routes_${middle}_${old_route_type}`);
      old_source.setData(old_source._data.features.filter(feature => feature.id !== this.id));
      this.map_handler.map.getSource(`routes_${middle}_${new_route_type}`).updateData({ "type": "FeatureCollection", "features": [{ "id": this.id, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": this.route_spline } }] });
    }

    if (!this.road_route_types.includes(old_route_type) && this.road_route_types.includes(new_route_type)) {
      const query = `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${this.source.coordinates.lat},${this.source.coordinates.lng};${this.destination.coordinates.lat},${this.destination.coordinates.lng}` +
          `?access_token=${mapboxgl.accessToken}&geometries=geojson`;
      $.get(query, (data) => {
        if (data['code'] === 'NoRoute') {
          // TODO handle.
        } else {
          this.duration.value = Math.max(1, data.routes[0].duration / 3600);
          this.distance.value = Math.max(1, data.routes[0].distance / 1000);
          this.route.value = data.routes[0].geometry.coordinates;
          update_route_source();
        }
      });
    } else if (this.road_route_types.includes(old_route_type) && !this.road_route_types.includes(new_route_type)) {
      this.duration.value = 0;
      this.distance.value = 0;
      this.route.value = [[this.source.coordinates.lat, this.source.coordinates.lng], [this.destination.coordinates.lat, this.destination.coordinates.lng]];
      update_route_source();
    } else {
      update_route_source();
    }
  };

  get_note_descriptions = () => {
    console.log('get_route_note_descriptions');
    if (this.notes_descriptions_loaded) {
      return;
    }
    Object.values(this.overview.note_description_spans).forEach((html_span) => {
      html_span.span.innerHTML = 'Loading...';
      html_span.process();
    });
    backend_communication.call_google_function('GET',
                'get_route_note_descriptions', {'route_id': this.id}, (data) => {
      const route_notes = data['route_note_descriptions'];
      route_notes.forEach((route_note) => {
        this.overview.note_description_spans[route_note['id']].span.innerHTML = route_note['description'];
        this.overview.note_description_spans[route_note['id']].process();
      });
      this.notes_descriptions_loaded = true;
    });
  }

  get_line_parameters = () => {
    // const paint = (this.route_type.value === undefined) ? {'line-dasharray': [1, 3]} : {};
    const params = { id: this.route_layer_id, type: 'line', source: this.route_source_id, layout: {'line-cap': 'round'},
             paint: { 'line-color': '#ea5882', 'line-width': 3}};
    if (this.route_type.value === undefined || this.route_type.value === 'undefined') {
      params['line-dasharray'] = [1, 3];
    }
    return params;
  };

  get_arrow_parameters = () => {
    const image = {'driving': 'direction_car', 'boat': 'direction_boat', 'flying': 'direction_plane', 'bus': 'direction_bus',
                   'train': 'direction_train', undefined: 'direction_arrow'}[this.route_type.value];
    const icon_size = {'direction_car': 0.2, 'direction_boat': 0.2, 'direction_plane': 0.2, 'direction_bus': 0.2,
                       'direction_train': 0.2, 'direction_arrow': 0.12}[image];
    return { 'id': this.route_arrow_layer_id, 'type': 'symbol', 'source': this.route_source_id, 'paint': { 'icon-opacity': 1 }, 'minzoom': 0,
             'layout': { 'symbol-placement': 'line', 'symbol-spacing': 100, 'icon-allow-overlap': true, 'icon-image': image, 'icon-size': icon_size, 'visibility': 'visible' }}
  };

  check_same (new_value, old_value) {
    if (new_value === old_value) throw new ValidationError('New value is same as old value.');
    return new_value;
  }
}
