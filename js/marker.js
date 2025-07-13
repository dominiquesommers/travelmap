

class VisitPopup {
  constructor(visit) {
    this.visit = visit;

    // TODO create all elements empty. I.e., call this.html_table = this.create_table();
    // subscribe and call once, to enter each of the values

    this.create_elements();

    this.visit.nights.subscribe(this.update_nights);
    this.visit.entry_date.subscribe(this.update_entry_date);
    this.visit.exit_date.subscribe(this.update_exit_date);

    this.visit.next_edge.subscribe(this.update_next_edge);
    this.update_next_edge(this.visit.next_edge.value, undefined);

    this.visit.previous_edge.subscribe(this.update_previous_edge);
    this.update_previous_edge(this.visit.previous_edge.value, undefined);

    this.visit._outgoing_edges.subscribe(this.update_outgoing_edges);
    // TODO call update_outgoing_edges, subscribed to included of outgoing_edge destinations.

    this.html_table = this.create_table();
    this.update_nights(this.visit.nights.value);
  };

  update_nights = (new_value, old_value=undefined) => {
    this.night_span.innerHTML = new_value;
    if (new_value === 0) {
      this.decrement_nights.classList.toggle('disabled');
    } else if (old_value === 0) {
      this.decrement_nights.classList.toggle('disabled');
    }
  }

  update_entry_date = (new_value, old_value) => {
    this.entry_date_span.innerHTML = (new_value !== undefined) ? new_value.toDateString() : '';
  }

  update_exit_date = (new_value, old_value) => {
    this.exit_date_span.innerHTML = (new_value !== undefined) ? new_value.toDateString() : '';
  }

  update_next_nights = (new_value, old_value=undefined) => {
    // console.log(`update_next_nights: ${new_value}`);
    this.next_visit.innerHTML = `${this.adjacent_visit_string(this.visit.next_edge.value.destination)}`; // `${this.visit.next_edge.value.destination.place.name} (${new_value})`;
  }

  update_previous_nights = (new_value, old_value=undefined) => {
    // console.log(`update_previous_nights: ${new_value}`);
    this.previous_visit.innerHTML = `${this.adjacent_visit_string(this.visit.previous_edge.value.source)}`; //  `${this.visit.previous_edge.value.source.place.name} (${new_value})`;
  }

  update_next_edge = (new_edge, old_edge=undefined) => {
    if (old_edge !== undefined) {
      old_edge.destination.nights.unsubscribe(this.update_next_nights);
      old_edge.route.route_type.unsubscribe(this.update_next_route_info);
      old_edge.route.duration.unsubscribe(this.update_next_route_info);
      old_edge.route.cost.unsubscribe(this.update_next_route_info);
    }
    // console.log(`Next edge updated: ${new_edge}`);
    if (new_edge !== undefined) {
      new_edge.destination.nights.subscribe(this.update_next_nights);
      new_edge.route.route_type.subscribe(this.update_next_route_info);
      new_edge.route.duration.subscribe(this.update_next_route_info);
      new_edge.route.cost.subscribe(this.update_next_route_info);
      this.update_next_route_info();
      this.next_visit.innerHTML = `${this.adjacent_visit_string(new_edge.destination)}`;
      this.next_visit.addEventListener('click', () => {
        this.visit.place.map_handler.map.flyTo({'center': [new_edge.destination.place.coordinates.lat, new_edge.destination.place.coordinates.lng]});
        this.visit.place.marker.popup.remove();
        new_edge.destination.place.marker.set_popup(undefined, new_edge.destination);
        new_edge.destination.place.marker.popup.addTo(this.visit.place.map_handler.map);
      });
    } else {
      this.next_edge_type.innerHTML = '';
      this.next_visit.innerHTML = '';
      this.next_visit.addEventListener('click', () => {});
    }
    // // TODO update next destination (place, nights), and route information.
    // // TODO this is just to get it working, should be done in a cleaner way.
    // if (this.next_visit !== undefined) {
    //   if (new_edge === undefined) {
    //     this.next_visit.innerHTML = ``
    //   } else {
    //     this.next_visit.innerHTML = `${this.adjacent_visit_string(new_edge.destination)}`;
    //   }
    // }
  }

  update_next_route_info = () => {
    this.next_edge_type.innerHTML = transport_icons[this.visit.next_edge.value?.route.route_type.value];
    this.next_edge_duration.innerHTML = Math.round(this.visit.next_edge.value?.route.duration.value);
    this.next_edge_cost.innerHTML = `${Math.round(this.visit.next_edge.value?.route.cost.value)}${(this.visit.next_edge.value?.route.route_type.value === 'driving') ? '/d' : ''}`;
  }

  update_rent_info = () => {
    if (this.visit.included_in_rent) return;
    let until_visit = this.visit.next_edge.value.rent_until;
    let non_drive_types = 0;
    let until_destination = this.visit; //.next_edge.value.destination;
    const options = [['', 'Select visit']];
    let last_option = undefined;
    while (non_drive_types < 4) { //until_destination !== until_visit) {
      if (until_destination.next_edge.value === undefined) break;
      const arrive_route_type = until_destination.next_edge.value?.route.route_type.value;
      non_drive_types = (arrive_route_type === 'driving') ? 0 : non_drive_types + 1;
      until_destination = until_destination.next_edge.value.destination;
      const depart_route_type = until_destination.next_edge.value?.route.route_type.value;
      if (arrive_route_type === 'driving' && arrive_route_type !== depart_route_type) {
        options.push([until_destination.id, `${until_destination.place.name}_${until_destination.id}`]);
        last_option = until_destination;
      }
    }

    this.next_edge_rent.innerHTML = `Rent until: `
    const rent_until_select = new HTMLSelect(options, [], (value) => {
      const args = {'parameters': {'source_visit_id': this.visit.id, 'destination_visit_id': this.visit.next_edge.value.destination.id,
          'route_id': this.visit.next_edge.value.route.id, 'column': 'rent_until', 'value': value}};
      backend_communication.call_google_function('POST',
        'update_edge', args, (data) => {
        if (data['status'] === 'OK') {
          this.visit.next_edge.value.rent_until = this.visit.place.map_handler.get_visit_by_id(value);
          this.visit.place.map_handler.graph.update_rent_info();
        } else {
          console.log(data);
        }
      });
      // backend_communication.fetch('/travel/update_edge/', args, (data) => {
      //   if (data['status'] === 'OK') {
      //     this.visit.next_edge.value.rent_until = this.visit.place.map_handler.get_visit_by_id(value);
      //     this.visit.place.map_handler.graph.update_rent_info();
      //   } else {
      //     console.log(data);
      //   }
      // });
    }, this.visit.place.map_handler.view_only).select;
    rent_until_select.options[0].disabled = true;

    if (until_visit !== undefined && Array.from(rent_until_select.options).some((option) => option.value === until_visit.id)) {
      const base_route = this.visit.next_edge.value.route;
      rent_until_select.value = until_visit.id;
      // Update and lock information through the 'driving' edges until the until_visit is reached.
      let next_visit = this.visit;
      while (next_visit !== until_visit) {
        const arrival_route = next_visit.next_edge.value.route;
        arrival_route.cost.value = base_route.cost.value;
        next_visit = next_visit.next_edge.value.destination;
        next_visit.included_in_rent = true;
        const departure_route = next_visit.next_edge.value.route;
        const acco_string = `${(this.visit.next_edge.value.includes_accommodation) ? 'In' : 'Ex'}cludes accommodation.`
        next_visit.popup.previous_edge_rent.innerHTML = `Rent from: ${this.visit.place.name}_${this.visit.id}.<br>${acco_string}`
        if (next_visit === until_visit) {
          // next_visit.
        } else {
          departure_route.cost.value = base_route.cost.value;
          next_visit.popup.next_edge_rent.innerHTML = `Rent until: ${until_visit.place.name}_${until_visit.id}.<br>${acco_string}`
        }
      }
    }
    this.next_edge_rent.appendChild(rent_until_select);

    const includes_acco_span = document.createElement('span');
    includes_acco_span.innerHTML = '<br>Includes accomm.:'
    const checkbox = document.createElement('input');
    if (this.visit.place.map_handler.view_only) {
      checkbox.disabled = true;
    }
    checkbox.type = 'checkbox';
    checkbox.checked = this.visit.next_edge.value.includes_accommodation;
    includes_acco_span.appendChild(checkbox);
    this.next_edge_rent.appendChild(includes_acco_span);
    checkbox.addEventListener('change', (event) => {
      const args = {'parameters': {'source_visit_id': this.visit.id, 'destination_visit_id': this.visit.next_edge.value.destination.id,
          'route_id': this.visit.next_edge.value.route.id, 'column': 'includes_accommodation', 'value': checkbox.checked}};
      backend_communication.call_google_function('POST',
      'update_edge', args, (data) => {
        if (data['status'] === 'OK') {
          this.visit.next_edge.value.includes_accommodation = checkbox.checked;
          this.visit.place.map_handler.graph.update_rent_info();
        } else {
          console.log(data);
        }
      });

      // backend_communication.fetch('/travel/update_edge/', args, (data) => {
      //   if (data['status'] === 'OK') {
      //     this.visit.next_edge.value.includes_accommodation = checkbox.checked;
      //     this.visit.place.map_handler.graph.update_rent_info();
      //   } else {
      //     console.log(data);
      //   }
      // });
    });
  }

  update_previous_edge = (new_edge, old_edge=undefined) => {
    if (old_edge !== undefined) {
      old_edge.source.nights.unsubscribe(this.update_previous_nights);
      old_edge.route.route_type.unsubscribe(this.update_previous_route_info);
      old_edge.route.duration.unsubscribe(this.update_previous_route_info);
      old_edge.route.cost.unsubscribe(this.update_previous_route_info);
    }
    // console.log(`update_previous_edge: ${new_edge}`);
    if (new_edge !== undefined) {
      new_edge.source.nights.subscribe(this.update_previous_nights);
      new_edge.route.route_type.subscribe(this.update_previous_route_info);
      new_edge.route.duration.subscribe(this.update_previous_route_info);
      new_edge.route.cost.subscribe(this.update_previous_route_info);
      this.update_previous_route_info();
      this.previous_visit.innerHTML = `${this.adjacent_visit_string(new_edge.source)}`;
      this.previous_visit.addEventListener('click', () => {
        this.visit.place.map_handler.map.flyTo({'center': [new_edge.source.place.coordinates.lat, new_edge.source.place.coordinates.lng]})
        this.visit.place.marker.popup.remove();
        new_edge.source.place.marker.set_popup(undefined, new_edge.source);
        new_edge.source.place.marker.popup.addTo(this.visit.place.map_handler.map);
      });
    } else {
      this.previous_edge_type.innerHTML = '';
      this.previous_edge_duration.innerHTML = 0;
      this.previous_edge_cost.innerHTML = 0;
      this.previous_visit.innerHTML = '';
      this.previous_visit.addEventListener('click', () => {});
    }
  }

  update_previous_route_info = () => {
    this.previous_edge_type.innerHTML = transport_icons[this.visit.previous_edge.value?.route.route_type.value];
    this.previous_edge_duration.innerHTML = Math.round(this.visit.previous_edge.value?.route.duration.value);
    this.previous_edge_cost.innerHTML = `${Math.round(this.visit.previous_edge.value?.route.cost.value)}${(this.visit.previous_edge.value?.route.route_type.value === 'driving') ? '/d' : ''}`;
  }

  adjacent_visit_string = (visit) => {
    return `${visit.place.name}<sub>${visit.id}</sub> (${visit.nights.value})`
  }

  update_outgoing_edge_information = (a=undefined, b=undefined) => {
    this.sortable_list.reset();
    this.visit._outgoing_edges.value.forEach((edge) => {
      const option_html = document.createElement('div')
      const visit_html = document.createElement('span')
      option_html.appendChild(visit_html);
      visit_html.innerHTML = `${this.adjacent_visit_string(edge.destination)}`
      if (!edge.destination.included.value) {
        option_html.style = `background-color: lightgrey;`
      }
      const delete_span = document.createElement('span');
      option_html.appendChild(delete_span);
      delete_span.innerHTML = ' <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="m62.205 150 26.569 320.735C90.678 493.865 110.38 512 133.598 512h244.805c23.218 0 42.92-18.135 44.824-41.265L449.795 150H62.205zm118.781 302c-7.852 0-14.458-6.108-14.956-14.063l-15-242c-.513-8.276 5.771-15.395 14.033-15.908 8.569-.601 15.381 5.757 15.908 14.033l15 242c.531 8.57-6.25 15.938-14.985 15.938zM271 437c0 8.291-6.709 15-15 15s-15-6.709-15-15V195c0-8.291 6.709-15 15-15s15 6.709 15 15v242zm89.97-241.062-15 242c-.493 7.874-7.056 14.436-15.908 14.033-8.262-.513-14.546-7.632-14.033-15.908l15-242c.513-8.276 7.764-14.297 15.908-14.033 8.262.513 14.546 7.632 14.033 15.908zM451 60h-90V45c0-24.814-20.186-45-45-45H196c-24.814 0-45 20.186-45 45v15H61c-16.569 0-30 13.431-30 30 0 16.567 13.431 30 30 30h390c16.569 0 30-13.433 30-30 0-16.569-13.431-30-30-30zm-120 0H181V45c0-8.276 6.724-15 15-15h120c8.276 0 15 6.724 15 15v15z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
      delete_span.classList.add('pointer');
      delete_span.addEventListener('click', (event) => {
        if (confirm('Are you sure you want to delete this outgoing edge?')) {
          edge.source.remove_outgoing_edge(edge);
        }
      });

      this.sortable_list.add_option(option_html, edge);
    });
  }

  update_outgoing_edges = (new_edges, old_edges=undefined) => {
    old_edges?.forEach((edge) => {
      if (!new_edges.includes(edge)) {
        edge.destination.nights.unsubscribe(this.update_outgoing_edge_information);
        edge.destination.included.unsubscribe(this.update_outgoing_edge_information);
      }
    });

    new_edges.forEach((edge) => {
      if (!old_edges?.includes(edge)) {
        // console.log(edge)
        edge.destination.nights.subscribe(this.update_outgoing_edge_information);
        edge.destination.included.subscribe(this.update_outgoing_edge_information);
      }
    });

    this.update_outgoing_edge_information();
  }

  create_elements = () => {
    this.previous_visit = document.createElement('span');
    this.previous_edge_type = document.createElement('div');
    this.previous_edge_duration = document.createElement('span');
    this.previous_edge_cost = document.createElement('span');
    this.previous_edge_rent = document.createElement('span');
    this.next_visit = document.createElement('span');
    this.next_edge_type = document.createElement('div');
    this.next_edge_duration = document.createElement('span');
    this.next_edge_cost = document.createElement('span');
    this.next_edge_rent = document.createElement('span');
    this.next_edge = this.visit.next_edge;
    this.decrement_nights = document.createElement('span');
    this.night_span = document.createElement('span');
    this.entry_date_span = document.createElement('span');
    this.exit_date_span = document.createElement('span');
  }

  add_edge = () => {
    // console.log('add new edge.');
    this.visit.place.marker.popup.remove();
    this.visit.place.map_handler.new_edge_source = this.visit;
    this.visit.place.map_handler.toggle_shade();

    const c = [this.visit.place.coordinates.lat, this.visit.place.coordinates.lng];
    const p = { id: 'new_route', type: 'line', source: 'new_route_source', layout: {'line-cap': 'round'}, paint: { 'line-color': 'rgb(187,187,187)', 'line-width': 3, 'line-dasharray': [1, 3]}};
    const p2 = { 'id': 'new_route_arrow', 'type': 'symbol', 'source': 'new_route_source', 'layout': { 'symbol-placement': 'line', 'symbol-spacing': 100, 'icon-allow-overlap': true, 'icon-image': 'direction_arrow', 'icon-size': 0.12, 'visibility': 'visible' }, 'paint': { 'icon-opacity': 1 }, 'minzoom': 0}

    Object.values(this.visit.place.map_handler.routes.value).forEach(route => {
      if (route.source === this.visit.place) {
        route.set_highlight();
      }
    });

    this.visit.place.map_handler.map.addSource('new_route_source', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: {'coordinates': [c, c], 'type': 'LineString' } } });
    this.visit.place.map_handler.add_layer(p);
    this.visit.place.map_handler.add_layer(p2);
    const update_new_edge = (e) => {
      const new_c = [e.lngLat.lng, e.lngLat.lat];
      // TODO find shortest path, rechtsom of linksom.
      if (c[0] < 0 && new_c[0] > 0) {
        new_c[0] = -180 - (180 - new_c[0]);
      }
      // console.log([c[0], e.lngLat.lng, new_c[0]]);

      this.visit.place.map_handler.map.getSource('new_route_source').setData({ type: 'Feature', properties: {}, geometry: {'coordinates': [c, new_c], 'type': 'LineString' } });
      // this.visit.place.map_handler.map.getSource('new_route_arrow').setData({ type: 'Feature', properties: {}, geometry: {'coordinates': [c, [e.lngLat.lng, e.lngLat.lat]], 'type': 'LineString' } });
    }

    this.visit.place.map_handler.map.on('mousemove', update_new_edge);

    const cleanup = () => {
      Object.values(this.visit.place.map_handler.routes.value).forEach(route => {
        if (route !== this.visit.place.map_handler.new_edge_route && route.source === this.visit.place) {
          route.unset_highlight();
        }
      });
      if (this.visit.place.map_handler.new_edge_route === undefined) {
        this.visit.place.map_handler.map.removeLayer('new_route');
        this.visit.place.map_handler.map.removeLayer('new_route_arrow');
        this.visit.place.map_handler.map.removeSource('new_route_source');
        this.visit.place.map_handler.map.off('mousemove', update_new_edge);
      } else {
        this.visit.place.map_handler.new_edge_route.unset_highlight();
      }
      this.visit.place.map_handler.new_edge_destination.unsubscribe(destination_clicked_callback);
      this.visit.place.map_handler.new_edge_destination.value = undefined;
      this.visit.place.map_handler.new_edge_source = undefined;
      this.visit.place.map_handler.new_edge_route = undefined;
      this.visit.place.map_handler.map.off('click', map_clicked_callback);
      this.visit.place.map_handler.toggle_shade();
    }

    const destination_clicked_callback = (new_destination=undefined, old_destination=undefined) => {
      console.log('destination clicked.')
      if (this.visit.place.map_handler.new_edge_route === undefined) {
        if (this.visit.place === new_destination.place) {
          console.log('Cannot create route/edge to the same place.')
        } else {
          console.log('todo with route_id from database')
          console.log(this.visit.place.id)
          // console.log(lslfldslfdsfds)

          this.visit.place.map_handler.add_route(undefined, this.visit.place.id, new_destination.place.id, undefined, 0, 0, 0, 0,
              [[this.visit.place.coordinates.lat, this.visit.place.coordinates.lng], [new_destination.place.coordinates.lat, new_destination.place.coordinates.lng]],
              [], (new_route) => {
            if (new_route !== undefined) {
              const new_edge = this.visit.add_outgoing_edge(new_destination, new_route, undefined, undefined, undefined, true);
                  // new Edge(this.visit, new_destination, new_route));
            } else {
              console.log('Route did already exist (should not be able to happen).')
            }
          });
        }
      } else {
        if (new_destination.place === this.visit.place.map_handler.new_edge_route.destination) {
          const new_edge = this.visit.add_outgoing_edge(new_destination, this.visit.place.map_handler.new_edge_route, undefined, undefined, undefined, true);
        } else {
          console.log('Selected destination is a different place than the destination of the selected route.')
        }
      }
      cleanup();
    }

    this.visit.place.map_handler.new_edge_destination.subscribe(destination_clicked_callback);
    const map_clicked_callback = (event) => {
      if (!event.originalEvent.cancelBubble) {
        cleanup();
      } else {
        this.visit.place.map_handler.map.removeLayer('new_route');
        this.visit.place.map_handler.map.removeLayer('new_route_arrow');
        this.visit.place.map_handler.map.removeSource('new_route_source');
        this.visit.place.map_handler.new_edge_route.set_highlight();
        this.visit.place.map_handler.map.off('mousemove', update_new_edge);
      }
    }

    this.visit.place.map_handler.map.on('click', map_clicked_callback);
  }

  create_table = () => {
    // this.create_elements();

    const table_constructor = new HTMLTable(['popup']);
    for (var row_index = 0; row_index < 5; row_index += 1) {
      table_constructor.add_row();
    }

    const cell1 = table_constructor.add_cell(0, ['leftie'], 3);
    cell1.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 341.333 341.333" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M170.667 0C76.41 0 0 76.41 0 170.667s76.41 170.667 170.667 170.667 170.667-76.41 170.667-170.667S264.923 0 170.667 0zm0 298.667c-70.692 0-128-57.308-128-128s57.308-128 128-128 128 57.308 128 128-57.308 128-128 128z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    const cell2 = table_constructor.add_cell(0, ['adjacent-visit', 'previous']);
    cell2.appendChild(this.previous_visit);
    this.previous_visit.classList.add('pointer');

    const cell3 = table_constructor.add_cell(1, ['transport']);
    cell3.appendChild(this.previous_edge_type);

    // cell3.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 45.437 45.437" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M41.403 11.11c-.371-3.627-.962-6.451-1.897-7.561-3.855-4.564-30.859-4.898-33.925 0-.75 1.2-1.276 4.014-1.629 7.567a2.287 2.287 0 0 0-2.026 2.267v4.443a2.29 2.29 0 0 0 1.5 2.146c-.207 6.998-.039 14.299.271 17.93 0 2.803 1.883 2.338 1.883 2.338h1.765v3.026c0 1.2 1.237 2.171 2.761 2.171 1.526 0 2.763-.971 2.763-2.171V40.24h20.534v3.026c0 1.2 1.236 2.171 2.762 2.171 1.524 0 2.761-.971 2.761-2.171V40.24h.58s2.216.304 2.358-1.016c0-3.621.228-11.646.04-19.221a2.28 2.28 0 0 0 1.607-2.177v-4.443a2.284 2.284 0 0 0-2.108-2.273zM12.176 4.2h20.735v3.137H12.176V4.2zm.296 32.467a2.947 2.947 0 1 1 0-5.895 2.947 2.947 0 0 1 0 5.895zm20.328 0a2.948 2.948 0 1 1-.002-5.892 2.948 2.948 0 0 1 .002 5.892zm3.747-12.9H8.54V9.077h28.007v14.69z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    const cell4 = table_constructor.add_cell(1, ['leftie']);
    cell4.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 16 16" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M9.414.586a2 2 0 1 1-2.828 2.828A2 2 0 0 1 9.414.586M9.414 6.586a2 2 0 1 1-2.828 2.828 2 2 0 0 1 2.828-2.828M9.414 12.586a2 2 0 1 1-2.828 2.828 2 2 0 0 1 2.828-2.828" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    const cell5 = table_constructor.add_cell(1, ['route-details']);
    const divider = document.createElement('span');
    divider.innerHTML = 'h<br>€'
    cell5.appendChild(this.previous_edge_duration);
    cell5.appendChild(divider);
    cell5.appendChild(this.previous_edge_cost);

    const cell_rent2 = table_constructor.add_cell(1, ['route-details']);
    cell_rent2.appendChild(this.previous_edge_rent);
    cell_rent2.style = 'padding: 0px 5px 0px 5px';

    // cell5.innerHTML = '<span>2h</span><br><span>€20</span>';

    const cell6 = table_constructor.add_cell(2, ['leftie'], 3);
    const gps = document.createElement('span');
    cell6.appendChild(gps)
    gps.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="34" height="34" x="0" y="0" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M256 0C153.755 0 70.573 83.182 70.573 185.426c0 126.888 165.939 313.167 173.004 321.035 6.636 7.391 18.222 7.378 24.846 0 7.065-7.868 173.004-194.147 173.004-321.035C441.425 83.182 358.244 0 256 0zm0 278.719c-51.442 0-93.292-41.851-93.292-93.293S204.559 92.134 256 92.134s93.291 41.851 93.291 93.293-41.85 93.292-93.291 93.292z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    gps.classList.add('edit');
    gps.addEventListener('click', (event) => {
      if (this.visit.place.map_handler.view_only) { return; }
      this.visit.place.included.value = !this.visit.included.value;
    });
    const current_visit_cell = table_constructor.add_cell(2, ['current-visit']);
    const current_visit_name_span = document.createElement('span');
    current_visit_cell.appendChild(current_visit_name_span);
    current_visit_name_span.innerHTML = `${this.visit.place.name}<sub>${this.visit.id}</sub>`;
    // this.decrement_nights = document.createElement('span');
    current_visit_cell.appendChild(this.decrement_nights);
    this.decrement_nights.innerHTML = '<sup>-</sup>';
    this.decrement_nights.classList.add('minus');
    this.decrement_nights.addEventListener('click', (event) => {
      if (this.visit.place.map_handler.view_only) { return; }
      this.visit.nights.value -= 1;
    });
    current_visit_cell.appendChild(this.night_span);
    const increment_nights = document.createElement('span');
    current_visit_cell.appendChild(increment_nights);
    increment_nights.innerHTML = '<sup>+</sup>';
    increment_nights.classList.add('plus');
    increment_nights.addEventListener('click', (event) => {
      if (this.visit.place.map_handler.view_only) { return; }
      this.visit.nights.value += 1;
    });

    const delete_span = document.createElement('span');
    current_visit_cell.appendChild(delete_span);
    delete_span.innerHTML = ' <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" x="0" y="0" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="m62.205 150 26.569 320.735C90.678 493.865 110.38 512 133.598 512h244.805c23.218 0 42.92-18.135 44.824-41.265L449.795 150H62.205zm118.781 302c-7.852 0-14.458-6.108-14.956-14.063l-15-242c-.513-8.276 5.771-15.395 14.033-15.908 8.569-.601 15.381 5.757 15.908 14.033l15 242c.531 8.57-6.25 15.938-14.985 15.938zM271 437c0 8.291-6.709 15-15 15s-15-6.709-15-15V195c0-8.291 6.709-15 15-15s15 6.709 15 15v242zm89.97-241.062-15 242c-.493 7.874-7.056 14.436-15.908 14.033-8.262-.513-14.546-7.632-14.033-15.908l15-242c.513-8.276 7.764-14.297 15.908-14.033 8.262.513 14.546 7.632 14.033 15.908zM451 60h-90V45c0-24.814-20.186-45-45-45H196c-24.814 0-45 20.186-45 45v15H61c-16.569 0-30 13.431-30 30 0 16.567 13.431 30 30 30h390c16.569 0 30-13.433 30-30 0-16.569-13.431-30-30-30zm-120 0H181V45c0-8.276 6.724-15 15-15h120c8.276 0 15 6.724 15 15v15z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    delete_span.classList.add('pointer');
    delete_span.addEventListener('click', (event) => {
      if (this.visit.place.map_handler.view_only) { return; }
      if (confirm('Are you sure you want to delete this visit?')) {
        console.log('delete visit.');
        this.visit.place.marker.popup.remove();
        this.visit.place.delete_visit(this.visit, () => {
          if (this.visit.place.visits.value.length === 0) {
            if (confirm('No more visits left in this place, do you want to delete the place altogether?')) {
              this.visit.place.map_handler.delete_place(this.visit.place);
            }
          }
        });
      }
    });

    const divider3 = document.createElement('span');
    current_visit_cell.appendChild(divider3);
    divider3.innerHTML = '<br>'
    current_visit_cell.appendChild(this.entry_date_span);
    this.update_entry_date(this.visit.entry_date.value);
    this.entry_date_span.classList.add('current-dates')
    const divider4 = document.createElement('span');
    divider4.classList.add('current-dates')
    divider4.innerHTML = ' - '
    current_visit_cell.appendChild(divider4);
    current_visit_cell.appendChild(this.exit_date_span);
    this.update_exit_date(this.visit.exit_date.value);
    this.exit_date_span.classList.add('current-dates');

    const cell8 = table_constructor.add_cell(3, ['transport']);
    cell8.appendChild(this.next_edge_type);
    const cell9 = table_constructor.add_cell(3, ['leftie']);
    cell9.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 16 16" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M9.414.586a2 2 0 1 1-2.828 2.828A2 2 0 0 1 9.414.586M9.414 6.586a2 2 0 1 1-2.828 2.828 2 2 0 0 1 2.828-2.828M9.414 12.586a2 2 0 1 1-2.828 2.828 2 2 0 0 1 2.828-2.828" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    const cell10 = table_constructor.add_cell(3, ['route-details']);
    const divider2 = document.createElement('span');
    divider2.innerHTML = 'h<br>€'
    cell10.appendChild(this.next_edge_duration);
    cell10.append(divider2);
    cell10.appendChild(this.next_edge_cost);
    const cell_rent = table_constructor.add_cell(3, ['route-details']);
    cell_rent.appendChild(this.next_edge_rent);
    cell_rent.style = 'padding: 0px 5px 0px 5px';

    const cell11 = table_constructor.add_cell(4, ['leftie'], 3);
    cell11.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 341.333 341.333" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M170.667 0C76.41 0 0 76.41 0 170.667s76.41 170.667 170.667 170.667 170.667-76.41 170.667-170.667S264.923 0 170.667 0zm0 298.667c-70.692 0-128-57.308-128-128s57.308-128 128-128 128 57.308 128 128-57.308 128-128 128z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    const cell12 = table_constructor.add_cell(4, ['adjacent-visit', 'next']);

    const next_edge_div = document.createElement('div');
    cell12.appendChild(next_edge_div);
    next_edge_div.classList.add('custom-select');
    next_edge_div.appendChild(this.next_visit);
    this.next_visit.classList.add('pointer');
    const edit = document.createElement('span');
    next_edge_div.appendChild(edit)
    edit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="12" height="12" x="0" y="0" viewBox="0 0 492.493 492" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M304.14 82.473 33.165 353.469a10.799 10.799 0 0 0-2.816 4.949L.313 478.973a10.716 10.716 0 0 0 2.816 10.136 10.675 10.675 0 0 0 7.527 3.114 10.6 10.6 0 0 0 2.582-.32l120.555-30.04a10.655 10.655 0 0 0 4.95-2.812l271-270.977zM476.875 45.523 446.711 15.36c-20.16-20.16-55.297-20.14-75.434 0l-36.949 36.95 105.598 105.597 36.949-36.949c10.07-10.066 15.617-23.465 15.617-37.715s-5.547-27.648-15.617-37.719zm0 0" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    edit.classList.add('edit');

    this.sortable_list = new SortableHTMLList(edit, this.visit.change_order_outgoing_edges, this.visit.place.map_handler.view_only);
    next_edge_div.appendChild(this.sortable_list.container);
    this.update_outgoing_edges(this.visit._outgoing_edges.value);
    const add_edge_div = document.createElement('div');
    this.sortable_list.container.appendChild(add_edge_div);
    add_edge_div.classList.add('horizontal-center');
    const add_edge_span = document.createElement('span');
    add_edge_div.appendChild(add_edge_span);
    add_edge_span.classList.add('pointer');
    add_edge_span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" x="0" y="0" viewBox="0 0 32 32" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M20 29H6a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3zM6 11a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1zM10 8a1 1 0 0 1-1-1V6a3 3 0 0 1 3-3h1a1 1 0 0 1 0 2h-1a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1zM26 23h-1a1 1 0 0 1 0-2h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 2 0v1a3 3 0 0 1-3 3zM28 8a1 1 0 0 1-1-1V6a1 1 0 0 0-1-1h-1a1 1 0 0 1 0-2h1a3 3 0 0 1 3 3v1a1 1 0 0 1-1 1zM28 16a1 1 0 0 1-1-1v-4a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1zM21 5h-4a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M16 20h-6a1 1 0 0 1 0-2h6a1 1 0 0 1 0 2z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M13 23a1 1 0 0 1-1-1v-6a1 1 0 0 1 2 0v6a1 1 0 0 1-1 1z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    add_edge_span.addEventListener('click', this.add_edge);

    return table_constructor.table;
  }
}


class PlaceMarker {
  constructor(place, map_handler) {
    this.place = place;
    this.marker_div = this.create_html_div();
    this.map_handler = map_handler;

    this.popup_div = document.createElement('div');
    this.popup = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '450px', className: 'popupdiv', offset: {} }).setDOMContent(this.popup_div);
    this.marker = new mapboxgl.Marker({element: this.marker_div, offset: [0, 8], anchor: 'top'}) // anchor: 'top'})
        .setLngLat([this.place.coordinates.lat, this.place.coordinates.lng])
        .setPopup(this.popup);
    this.popup.on('open', () => {
      this.marker.addClassName('highlighted');
      this.place.country.get_note_descriptions();
      this.place.get_activity_descriptions();
      this.place.get_note_descriptions();
      this.place.map_handler.overview.set_html(this.place.country.overview.html);
      this.place.map_handler.overview.append_html(this.place.overview.html);
    });
    this.popup.on('close', () => {
      this.marker.removeClassName('highlighted');
      this.place.map_handler.overview.reset();
    });
    this.marker.addTo(this.map_handler.map);
    this.place.visits.subscribe(this.update_visits);
  }

  update_visits = (new_visits, old_visits) => {
    old_visits?.forEach((visit) => {
      if (!new_visits.includes(visit)) {
        visit.nights.unsubscribe(this.update_cell_values);
        visit.included.unsubscribe(this.update_cell_values);
      }
    });

    new_visits.forEach((visit) => {
      if (!old_visits?.includes(visit)) {
        visit.nights.subscribe(this.update_cell_values);
        visit.included.subscribe(this.update_cell_values);
      }
    });

    this.clear_cells();
    this.create_cells();
    this.update_cell_values();
  }

  update_cell_values = (new_value=undefined, old_value=undefined) => {
    // console.log(`lenght: ${this.place.visits.value.length}`)
    this.place.visits.value?.forEach((visit, index) => {
      this.visit_cells[index].innerHTML = visit.nights.value;
      // if (!this.place.visits.value[index].included.value) {
      //   this.visit_cells[index].innerHTML += '.';
      // }
      // this.visit_cells[index].toggleClass() // TODO cleaner way to show excluded visits.
    });
  }

  create_cells = () => {
    const cell_classes = this.visit_cells?.map(cell => Array.from(cell.classList));
    this.visit_cells = [];
    this.place.visits.value?.forEach((visit, index) => {
      const cell = this.pill.add_cell(0, (cell_classes[index]) ? cell_classes[index] : ['number']);
      if (this.add_visit_clicked && !cell_classes[index]) cell.classList.add((!visit.included) ? 'excluded' : 'uncovered');
      this.visit_cells.push(cell);
      cell.addEventListener('click', this.set_popup);
      if (index === 0) cell.classList.add('left-cell');
    });
    this.plus_cell = this.pill.add_cell(0,['number']);
    this.plus_cell.addEventListener('click', (event) => {
      event.stopPropagation();
      if (this.place.map_handler.view_only) { return; }
      this.set_popup;
    });
    this.plus_cell.classList.add('right-cell');
    this.plus_cell.innerHTML = '+';
    this.add_visit_clicked = false;
  }

  set_popup = (event, visit=undefined) => {
    if (event !== undefined) event.preventDefault();
    if (visit === undefined && event.target.innerHTML === '+') {
      event.stopPropagation();
      this.add_visit_clicked = true;
      this.place.add_visit(undefined, 0, true, (new_visit) => {
        if (this.map_handler.is_shaded()) {
          console.log('clicked but is shaded.')
          event.stopPropagation();
          this.map_handler.new_edge_destination.value = new_visit;
        } else {
          console.log('clicked not is shaded.')
          const visit_index = this.visit_cells.length - 1;
          this.popup_div.innerHTML = '';
          this.popup_div.appendChild(this.place.visits.value[visit_index].popup.html_table);
          this.popup.setOffset(this.compute_popup_offsets(visit_index));
          this.popup.addTo(this.map_handler.map);
        }
      });
    } else {
      let visit_index = undefined;
      if (visit === undefined) {
         visit_index = this.visit_cells.indexOf(event.target);
        visit = this.place.visits.value[visit_index];
      } else {
        visit_index = this.place.visits.value.indexOf(visit);
      }
      if (this.map_handler.is_shaded()) {
        event.stopPropagation();
        this.map_handler.new_edge_destination.value = visit;
      } else {
        this.popup_div.innerHTML = '';
        this.popup_div.appendChild(visit.popup.html_table);
        this.popup.setOffset(this.compute_popup_offsets(visit_index));
      }
    }
  }

  compute_popup_offsets = (index) => {
    const cell_widths = [...this.visit_cells.map(cell => cell.getBoundingClientRect()['width']), this.plus_cell.getBoundingClientRect()['width']];
    const pill_width = cell_widths.reduce((a, b) => a + b, 0);
    const pill_height= this.plus_cell.getBoundingClientRect()['height'];
    let x_offset = -pill_width/2;
    let i = 0;
    while (i < index) {
      x_offset += cell_widths[i];
      i += 1;
    }
    x_offset += cell_widths[index] / 2;

    return {
      'bottom': [x_offset, 8], 'top': [x_offset, 36], 'left': [pill_width/2, pill_height/2 + 8], 'right': [-pill_width/2, pill_height/2 + 8],
      'top-left': [x_offset, pill_height + 8], 'top-right': [x_offset, pill_height + 8],
      'bottom-left': [x_offset, 8], 'bottom-right': [x_offset, 8]
    };
  }

  clear_cells = () => {
    this.pill.clear_row(0);
  }

  create_html_div = () => {
    const marker_div = document.createElement('div');
    marker_div.classList.add('place');
    this.pill = new HTMLTable(['destination-marker']);
    marker_div.appendChild(this.pill.table);
    this.pill.add_row();

    const blubdiv = document.createElement('div');
    blubdiv.style = 'padding:2px 5px 2px 5px;margin-top:2px;background:white;'
    blubdiv.innerHTML = 'Hoi';
    // marker_div.appendChild(blubdiv);

    this.create_cells();
    this.update_cell_values();

    return marker_div;
  }
}
