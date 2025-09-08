class PlaceOverview {
  constructor(place) {
    this.place = place;
    this.place.visits.subscribe(this.visits_changed);
    this.create_elements();
  };

  visits_changed = (new_visits, old_visits) => {
    new_visits.forEach((visit) => {
      if (!old_visits.includes(visit)) {
        visit.entry_date.subscribe(this.add_visits);
        visit.exit_date.subscribe(this.add_visits);
      }
    });
    old_visits.forEach((visit) => {
      if (!new_visits.includes(visit)) {
        visit.entry_date.subscribe(this.add_visits);
        visit.exit_date.subscribe(this.add_visits);
      }
    });
    this.add_visits();
  }

  create_elements = () => {
    this.html = document.createElement('div');
    this.title = document.createElement('h1');
    this.title.style = 'white-space: initial;'
    this.html.appendChild(this.title);
    const place_name = new HTMLText(`${this.place.name}`, [], (value) => {
      const args = {'parameters': {'place_id': this.place.id, 'column': `name`, 'value': value}};
      backend_communication.call_google_function('POST',
          'update_place', args, (data) => {
        console.log(data);
        if (data['status'] !== 'OK') console.log(data);
      });
    }, 'span', true, this.place.map_handler.view_only).span;
    place_name.style.padding = '0px';
    this.title.appendChild(place_name);
    // const country_span = document.createElement('span');
    // this.title.appendChild(country_span);
    // country_span.innerHTML = `, ${this.place.country.name} ${country_flags[this.place.country.name]}`;

    const divider = document.createElement('span');
    divider.innerHTML = '<hr>';
    this.html.appendChild(divider);

    this.visit_div = document.createElement('div');
    this.html.appendChild(this.visit_div);

    const divider1 = document.createElement('span');
    divider1.innerHTML = '<hr>';
    this.html.appendChild(divider1);

    this.season_div = document.createElement('div');
    this.html.appendChild(this.season_div);
    this.add_seasonality();

    const divider2 = document.createElement('span');
    divider2.innerHTML = '<hr>';
    this.html.appendChild(divider2);

    this.accommodation_div = document.createElement('div');
    this.html.appendChild(this.accommodation_div);
    this.add_accommodation();
    this.costs_div = document.createElement('div');
    this.html.appendChild(this.costs_div);
    this.add_costs();

    const divider3 = document.createElement('span');
    divider3.innerHTML = '<hr>';
    this.html.appendChild(divider3);

    this.activities_div = document.createElement('div');
    this.html.appendChild(this.activities_div);
    this.add_activities();

    const divider4 = document.createElement('span');
    divider4.innerHTML = '<hr>';
    this.html.appendChild(divider4);

    this.notes_div = document.createElement('div');
    this.html.appendChild(this.notes_div);
    this.add_notes();

    const divider5 = document.createElement('span');
    divider5.innerHTML = '<hr>';
    this.html.appendChild(divider5)
  }

  add_visits = () => {
    this.visit_div.innerHTML = '';
    const visiting_visits = this.place.visits.value.filter((visit) => visit.entry_date.value !== undefined);
    const nr_excluded_visits = this.place.visits.value.filter((visit) => !visit.included.value).length;
    const nr_uncovered_visits = this.place.visits.value.filter((visit) => visit.included.value && visit.entry_date.value === undefined).length;

    const visit_title = document.createElement('h3');
    this.visit_div.appendChild(visit_title);
    const title = document.createElement('span');
    visit_title.appendChild(title);
    title.innerHTML = (visiting_visits.length === 0) ? 'Not visiting with the current planning.' : 'Visiting on:';

    const visit_info_div = document.createElement('div');
    this.visit_div.appendChild(visit_info_div);
    add_collapsible(title, visit_info_div, '10vh');

    const visit_span = document.createElement('span')
    visit_info_div.appendChild(visit_span);
    if (visiting_visits.length > 0) {
      visiting_visits.sort((a, b) => a.entry_date.value - b.entry_date.value).forEach((visit) => {
        visit_span.innerHTML += `${visit.entry_date.value?.toDateString()} - ${visit.exit_date.value?.toDateString()} (${visit.nights.value} night${visit.nights.value !== 1 ? 's' : ''})<br>`
      });
    }
    visit_span.innerHTML += `${nr_excluded_visits} visits excluded, ${nr_uncovered_visits} visits not covered.`

    this.add_season_table();
  }

  add_seasonality = () => {
    this.season_div.innerHTML = '';
    const season_title = document.createElement('h3');
    this.season_div.appendChild(season_title);
    const title = document.createElement('span');
    season_title.appendChild(title);
    title.innerHTML = 'Time to visit';

    const season_div = document.createElement('div');
    this.season_div.appendChild(season_div);

    add_collapsible(title, season_div, '12vh');

    const season_span = document.createElement('span');
    season_div.appendChild(season_span);
    const season_prefix_span = document.createElement('span');
    season_prefix_span.innerHTML = 'Selected season: ';
    season_span.appendChild(season_prefix_span);
    season_prefix_span.style.paddingRight = '3px';

    const seasons = [];
    const default_season_description_string = '(empty)';
    this.place.country.seasons.sort((a, b) => a.id - b.id).forEach((season) => {
      seasons.push([season.id, (season.description === null) ? default_season_description_string : season.description]);
    });

    const on_open = () => {
      this.add_season_span.classList.remove('hidden');
    }
    const on_close = () => {
      this.add_season_span.classList.add('hidden');
    }
    const on_season_description_change = (value, old_value) => {
      const args = {'parameters': {'id': this.place.season.id, 'column': `description`, 'value': value}};
      backend_communication.call_google_function('POST', 'update_season', args, (data) => {
        if (data['status'] === 'OK') {
          this.place.season.description = value;
          this.place.map_handler.overview.update_route();
          this.add_season_table();
        } else {
          console.log(data);
          alert('Did not work.')
          this.season_select.span.innerHTML = old_value;
        }
      });
    }
    const on_season_delete = (deleted_season) => {
      // Will cause a foreign key constraint error when the season is still referenced somewhere.
      //   TODO parse the error correctly.
      if (confirm('Are you sure you want to delete this season?')) {
        const args = { 'parameters': {'season_id': deleted_season[0] }};
        backend_communication.call_google_function('POST',
              'remove_season', args, (data) => {
          if (data['status'] === 'OK') {
            if (document.getElementById('floating-divs').contains(this.season_select.context_menu)) {
              document.getElementById('floating-divs').removeChild(this.season_select.context_menu);
              this.season_select.context_menu.classList.add('hidden');
              on_close();
            }
            this.place.country.seasons = this.place.country.seasons.filter(season => Number(season.id) !== Number(deleted_season[0]));
            console.log(this.place.country.seasons);
            this.add_seasonality();
            this.add_season_table();
          } else {
            console.log(data);
            alert(`Can't delete season, check if it is still referenced somewhere.`)
          }
        });
      }
    }
    const on_season_order_changed = (dragged_value, new_order) => {
      console.log('todo season_order_changed');
      // TODO add 'priority' column to seasons table.
    }

    const description_text = (this.place.season.description === null) ? default_season_description_string : this.place.season.description;
    this.season_select = new HTMLSelectableText(description_text, seasons, on_open, on_close, on_season_order_changed,
        this.season_changed, on_season_delete, false, ['bold-text'], on_season_description_change,
        'span', true, this.place.map_handler.view_only);
    season_span.appendChild(this.season_select.span);
    this.season_select.span.classList.add('left-span');
    this.add_season_span = document.createElement('span');
    season_span.classList.add('left-right-aligned');
    season_span.appendChild(this.add_season_span);
    this.add_season_span.classList.add('pointer', 'right-span');//, 'hidden');
    if (seasons.length > 0) {
      this.add_season_span.classList.add('hidden');
    }
    this.add_season_span.innerHTML = '➕';
    this.add_season_span.addEventListener('click', () => {
      console.log('todo add season.');
      console.log(this.place.country.id);
      console.log(this.place.country.seasons);
      const new_season = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
        description: 'NEW SEASON', description_abbreviation: 'NEW', jan_reason: null, feb_reason: null, mar_reason: null,
        apr_reason: null, may_reason: null, jun_reason: null, jul_reason: null, aug_reason: null, sep_reason: null, oct_reason: null, nov_reason: null, dec_reason: null }
      const args = { 'parameters': {'country_id': this.place.country.id }};
      backend_communication.call_google_function('POST',
            'add_season', args, (data) => {
        if (data['status'] === 'OK') {
          new_season.id = data['season_id'];
          this.place.country.seasons.push(new_season);
          console.log(this.place.country.seasons)
          this.add_seasonality();
          this.add_season_table();
        } else {
          console.log(data);
          alert(`Can't create new season, check if it a season already exists with name: 'NEW SEASON'.`)
        }
      });
    });

    this.season_table_div = document.createElement('div');
    season_div.appendChild(this.season_table_div);
  }

  add_season_table = () => {
    this.season_table_div.innerHTML = '';
    const season_table = new HTMLTable(['season-table']);
    this.season_table_div.appendChild(season_table.table);
    season_table.add_row(['title-row']);
    ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach((month) => {
        season_table.add_cell(0).innerHTML = month;
    });

    [['number-row']].forEach((classes) => season_table.add_row(classes));
    const visiting_visits = this.place.visits.value.filter((visit) => visit.entry_date.value !== undefined && visit.exit_date.value !== undefined);
    const entries = visiting_visits.sort((a, b) => a.entry_date.value - b.entry_date.value).map((visit) => [visit.entry_date.value, visit.exit_date.value])

    const cell1 = season_table.add_cell(1, ['season-cell']);
    const abbreviation_string = (this.place.season.description_abbreviation === null) ? 'N/A' : this.place.season.description_abbreviation;

    const season_abbreviation_changed = (value, old_value) => {
      const args = {'parameters': {'id': this.place.season.id, 'column': `description_abbreviation`, 'value': value}};
      backend_communication.call_google_function('POST', 'update_season', args, (data) => {
        if (data['status'] === 'OK') {
          this.place.season.description_abbreviation = value;
          this.place.map_handler.overview.update_route();
          this.add_season_table();
        } else {
          console.log(data);
          alert('Did not work.')
          season_abbreviation.span.innerHTML = old_value;
        }
      });
    }
    const season_abbreviation = new HTMLText(abbreviation_string, [], season_abbreviation_changed,
        'span', true, this.place.map_handler.view_only).span;
    cell1.appendChild(season_abbreviation);
    cell1.addEventListener('mouseover', (event) => {
      Object.values(this.place.map_handler.places.value).filter(p => p.season === this.place.season).forEach(p => p.marker.pill.table.classList.add('season'));
    });
    cell1.addEventListener('mouseleave', (event) => {
      Object.values(this.place.map_handler.places.value).filter(p => p.season === this.place.season).forEach(p => p.marker.pill.table.classList.remove('season'));
    });
    const cells = this.place.map_handler.overview.create_season_row(season_table, this.place, entries, undefined, 15);
    // cells[0].style.height = '22px';
  }

  season_changed = (selected_season) => {
    const args = { 'parameters': {'place_id': this.place.id, 'column': 'season_id', 'value': Number(selected_season[0])}};
    backend_communication.call_google_function('POST',
          'update_place', args, (data) => {
      if (data['status'] === 'OK') {
        this.place.season = this.place.country.seasons.find(s => s.id === Number(selected_season[0]));
        this.place.map_handler.overview.update_route();
        this.add_season_table();
      } else {
        console.log(data);
        this.season_select.value = this.place.season.id;
      }
    });
  }

  add_accommodation = () => {
    // const accommodation_title = document.createElement('h3');
    // this.accommodation_div.appendChild(accommodation_title);
    // accommodation_title.innerHTML = 'Accommodation:'
    //
    // const accommodation_span = document.createElement('span');
    // this.accommodation_div.appendChild(accommodation_span);
    // this.accommodation_type_select = new HTMLSelect([['hotel', 'hotel'], ['tent', 'tent']], [], () => this.accommodation_type_changed).select;
    // accommodation_span.innerHTML = 'Staying in: ';
    // accommodation_span.appendChild(this.accommodation_type_select);
    // accommodation_span.innerHTML += ' for €';
    // this.cost = new HTMLNumber(undefined,[], () => this.accommodation_cost_changed(Number(this.cost.innerHTML))).span;
    // this.cost.innerHTML = 50;
    // accommodation_span.appendChild(this.cost);
  }

  add_costs = () => {
    const costs_title = document.createElement('h3');
    this.costs_div.appendChild(costs_title);
    const title = document.createElement('span');
    costs_title.appendChild(title);
    title.innerHTML = 'Cost estimates:';

    const costs_div = document.createElement('div');
    this.costs_div.appendChild(costs_div);

    add_collapsible(title, costs_div, '10vh');

    const costs_table = new HTMLTable(['season-table']);
    costs_div.appendChild(costs_table.table);
    const row1 = costs_table.add_header(['costs-title-row']);
    costs_table.add_cell(0, ['cost-cell-title']).innerHTML = 'Accomm. (€/n)';
    costs_table.add_cell(0, ['cost-cell-title']).innerHTML = 'Food (€/d)';
    costs_table.add_cell(0, ['cost-cell-title']).innerHTML = 'Misc. (€/d)';
    const row2 = costs_table.add_row(['costs-row']);

    ['accommodation', 'food', 'miscellaneous'].forEach((cost_type) => {
      const cost_cell = costs_table.add_cell(1, ['activity-cell', 'cost']);
      const cost_span = new HTMLCost([], (value, prefix) => {
        const cost_cat = (prefix === 'paid') ? 'paid' : `${prefix}_cost`;
        const args = {'parameters': {'place_id': this.place.id, 'column': `${cost_type}_${cost_cat}`, 'value': value}};
        backend_communication.call_google_function('POST',
          'update_place', args, (data) => {
          console.log(data);
          if (data['status'] !== 'OK') console.log(data)
        });
      }, this.place.paids[cost_type], this.place.map_handler.view_only);
      cost_span.estimated_cost.span.innerHTML = this.place.estimated_costs[cost_type];
      cost_span.actual_cost.span.innerHTML = this.place.actual_costs[cost_type]; // TODO fix
      cost_cell.appendChild(cost_span.span);
    });
  }

  accommodation_type_changed = () => {
    console.log(`new_type: ${this.accommodation_type_select.value}`);
  }

  accommodation_cost_changed = (new_cost) => {
    console.log(`new_cost: ${new_cost}`);
  }

  add_activities = () => {
    const activities_title = document.createElement('h3');
    this.activities_div.appendChild(activities_title);
    const title = document.createElement('span');
    activities_title.appendChild(title);
    title.innerHTML = 'Activities:';
    // const magic_activity = document.createElement('span');
    // magic_activity.style = 'font-size: 20px;'
    // activities_title.appendChild(magic_activity);
    // magic_activity.classList.add('pointer');
    // magic_activity.innerHTML = ' 🧙‍'; //'<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" x="0" y="0" viewBox="0 0 32 32" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M20 29H6a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3zM6 11a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1zM10 8a1 1 0 0 1-1-1V6a3 3 0 0 1 3-3h1a1 1 0 0 1 0 2h-1a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1zM26 23h-1a1 1 0 0 1 0-2h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 2 0v1a3 3 0 0 1-3 3zM28 8a1 1 0 0 1-1-1V6a1 1 0 0 0-1-1h-1a1 1 0 0 1 0-2h1a3 3 0 0 1 3 3v1a1 1 0 0 1-1 1zM28 16a1 1 0 0 1-1-1v-4a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1zM21 5h-4a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M16 20h-6a1 1 0 0 1 0-2h6a1 1 0 0 1 0 2z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M13 23a1 1 0 0 1-1-1v-6a1 1 0 0 1 2 0v6a1 1 0 0 1-1 1z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    // magic_activity.addEventListener('click', () => {
    //   console.log('Not implemented anymore.');
      // backend_communication.fetch('/travel/get_activities/', {'parameters': {'place': this.place.name, 'country': this.place.country.name}}, (data) => {
      //   if (data['status'] === 'OK') {
      //     console.log(data)
      //     data['data'].forEach((act) => {
      //       act.activity_description += '\n'
      //       act.activity_description += act.links.map((link,i) => `url(${link},link${i+1})`).join(',');
      //       this.add_activity(undefined, false, act.activity_description, act.activity_category, act.cost, act.activity_emoji); //act.activity_category
      //     });
      //     // data.forEach()
      //   } else {
      //     console.log(data)
      //   }
      // });
    // });

    const activities_container = document.createElement('div');
    this.activity_description_spans = {};
    // activities_container.style = 'max-height: 400px; overflow-y: auto;'
    activities_container.style = 'width: 100%;'

    add_collapsible(title, activities_container, '40vh');

    // activities_container.style = 'width: 100%; max-height: 40%; overflow-y: auto;'
    this.activities_div.appendChild(activities_container);
    this.activities_table = new HTMLTable(['activity-table']);

    activities_container.appendChild(this.activities_table.table);
    // activities_table.table.style = 'border: 1px solid black';
    const row1 = this.activities_table.add_header(['activity-title-row']);
    // row1.style = 'border: 1px solid black';
    this.activities_table.add_cell(0).innerHTML = '';
    this.activities_table.add_cell(0, ['act-description-title']).innerHTML = 'Description';
    this.activities_table.add_cell(0).innerHTML = 'Cat.';
    this.activities_table.add_cell(0).innerHTML = '€';

    this.place.activities.forEach((activity) => {
      this.add_activity(activity.id, activity.included, activity.description, activity.category, activity.estimated_cost,
          activity.actual_cost, activity.paid);
    });

    const add_activity_container = document.createElement('div');
    activities_container.appendChild(add_activity_container);
    add_activity_container.style = 'padding: 3px; width: 100%; text-align: center;'
    const add_activity = document.createElement('span');
    add_activity_container.appendChild(add_activity);
    add_activity.classList.add('pointer');
    add_activity.innerHTML = '➕'; //'<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" x="0" y="0" viewBox="0 0 32 32" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M20 29H6a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3zM6 11a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1zM10 8a1 1 0 0 1-1-1V6a3 3 0 0 1 3-3h1a1 1 0 0 1 0 2h-1a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1zM26 23h-1a1 1 0 0 1 0-2h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 2 0v1a3 3 0 0 1-3 3zM28 8a1 1 0 0 1-1-1V6a1 1 0 0 0-1-1h-1a1 1 0 0 1 0-2h1a3 3 0 0 1 3 3v1a1 1 0 0 1-1 1zM28 16a1 1 0 0 1-1-1v-4a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1zM21 5h-4a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M16 20h-6a1 1 0 0 1 0-2h6a1 1 0 0 1 0 2z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M13 23a1 1 0 0 1-1-1v-6a1 1 0 0 1 2 0v6a1 1 0 0 1-1 1z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    add_activity.addEventListener('click', () => {
      if (this.place.map_handler.view_only) { return }
      this.add_activity(undefined,false, 'Edit description to save');
    });
  }

  add_activity = (id=undefined, checked=false, description='', category=undefined,
                  estimated_cost=0, actual_cost=0, paid=false, emoji=undefined) => {
    if (description === undefined) description = '';
    let activity_id = id;
    const row_index = this.activities_table.rows.length;
    const row = this.activities_table.add_row(['activity-row']);
    const check_cell = this.activities_table.add_cell(row_index, ['activity-cell']);
    const checkbox = document.createElement('input');
    if (this.place.map_handler.view_only) {
      checkbox.disabled = true;
    }
    checkbox.type = 'checkbox';
    check_cell.appendChild(checkbox);
    checkbox.checked = checked;
    checkbox.addEventListener('change', () => {
      const args = {'parameters': {'activity_id': activity_id, 'column': 'included', 'value': checkbox.checked}};
      backend_communication.call_google_function('POST',
          'update_activity', args, (data) => {
        if (data['status'] !== 'OK') console.log(data)
      });
    });
    this.activity_description_spans[activity_id] = new HTMLText(description, ['activity-description'], (value, old_value) => {
      if (activity_id === undefined && old_value === 'Edit description to save') {
        console.log('NEW and edited.')
        const args = {'parameters': {'place_id': this.place.id, 'description': value, 'category': category_select.value,
            'estimated_cost': Number(cost_span.estimated_cost.span.innerHTML), 'actual_cost': Number(cost_span.actual_cost.span.innerHTML),
            'paid': cost_span.is_paid, 'included': checkbox.checked, 'trip_id': this.place.map_handler.trip_id}};
        backend_communication.call_google_function('POST',
            'add_activity', args, (data) => {
          if (data['status'] === 'OK') {
            activity_id = data['activity_id'];
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
          } else {
            console.log(data);
          }
        });
      } else {
        const args = {'parameters': {'activity_id': activity_id, 'column': 'description', 'value': value}};
        console.log('EDITED ACTIVITY.')
        backend_communication.call_google_function('POST',
            'update_activity', args, (data) => {
          if (data['status'] !== 'OK') console.log(data);
        });
      }
      // console.log('updated activity:', value, old_value);
    }, 'p', false, this.place.map_handler.view_only);

    const description_cell = this.activities_table.add_cell(row_index, ['activity-description-cell']);
    description_cell.appendChild(this.activity_description_spans[activity_id].span);

    if (id === undefined) {
      this.activity_description_spans[activity_id].double_click(new MouseEvent('dblclick', {}), true);
    }

    const category_cell = this.activities_table.add_cell(row_index, ['activity-cell', 'category']);
    if (emoji !== undefined && !Object.keys(activity_icons).includes(category)) {
      activity_icons[category] = emoji;
    }
    // console.log(category, activity_icons[category]);
    const category_select = new HTMLSelect(Object.entries(activity_icons).map((icon) => [icon[0], icon[1]]), ['activity-select'], (selected) => {
      // console.log('Category changed! to ', selected);
      const args = {'parameters': {'activity_id': activity_id, 'column': 'category', 'value': selected}};
      backend_communication.call_google_function('POST',
            'update_activity', args, (data) => {
        if (data['status'] !== 'OK') console.log(data);
      });
    }, this.place.map_handler.view_only).select;
    category_select.value = category;
    category_cell.appendChild(category_select);
    const cost_cell = this.activities_table.add_cell(row_index, ['activity-cell', 'cost']);
    const cost_span = new HTMLCost([], (value, prefix) => {
      const args = {'parameters': {'activity_id': activity_id,
          'column': (prefix === 'paid') ? 'paid' : `${prefix}_cost`,'value': value}};
      backend_communication.call_google_function('POST',
            'update_activity', args, (data) => {
        if (data['status'] !== 'OK') console.log(data);
      });
    }, paid, this.place.map_handler.view_only);
    cost_span.estimated_cost.span.innerHTML = estimated_cost;
    cost_span.actual_cost.span.innerHTML = actual_cost;
    cost_cell.appendChild(cost_span.span);
    const delete_cell = this.activities_table.add_cell(row_index, ['activity-cell', 'delete']);
    const delete_icon = document.createElement('span');
    delete_cell.appendChild(delete_icon);
    delete_icon.classList.add('pointer');
    delete_icon.addEventListener('click', () => {
      if (this.place.map_handler.view_only) { return };
      if (confirm('Are you sure you want to delete this activity?')) {
        if (activity_id === undefined) {
          this.activities_table.table.deleteRow(row.rowIndex);
        } else {
          const args = {'parameters': {'activity_id': activity_id}};
          backend_communication.call_google_function('POST',
            'remove_activity', args, (data) => {
              if (data['status'] === 'OK') {
                this.activities_table.table.deleteRow(row.rowIndex);
              } else {
                console.log(data)
              }
            });
        }
      }
    });
    delete_icon.innerHTML = '🗑️';
  }

  add_notes = () => {
    const notes_title = document.createElement('h3');
    this.notes_div.appendChild(notes_title);
    const title = document.createElement('span');
    notes_title.appendChild(title);
    title.innerHTML = 'Place notes:'

    const notes_container = document.createElement('div');
    this.note_description_spans = {};
    // activities_container.style = 'max-height: 400px; overflow-y: auto;'
    notes_container.style = 'width: 100%;'

    add_collapsible(title, notes_container, '40vh');

    // activities_container.style = 'width: 100%; max-height: 40%; overflow-y: auto;'
    this.notes_div.appendChild(notes_container);
    this.notes_table = new HTMLTable(['activity-table']);

    notes_container.appendChild(this.notes_table.table);
    const row1 = this.notes_table.add_header(['activity-title-row']);
    this.notes_table.add_cell(0).innerHTML = '';
    this.notes_table.add_cell(0, ['act-description-title']).innerHTML = 'Description';
    this.notes_table.add_cell(0).innerHTML = 'Cat.';
    this.notes_table.add_cell(0).innerHTML = '€';

    this.place.notes.forEach((note) => {
      this.add_note(note.id, note.included, note.description, note.category, note.estimated_cost, note.actual_cost, note.paid);
    });

    const add_note_container = document.createElement('div');
    notes_container.appendChild(add_note_container);
    add_note_container.style = 'padding: 3px; width: 100%; text-align: center;'
    const add_note = document.createElement('span');
    add_note_container.appendChild(add_note);
    add_note.classList.add('pointer');
    add_note.innerHTML = '➕';
    add_note.addEventListener('click', () => {
      if (this.place.map_handler.view_only) { return }
      this.add_note(undefined,false, 'Edit description to save')
    });
  }

  add_note= (id=undefined, checked=false, description='', category=undefined,
             estimated_cost=0, actual_cost=0, paid=false, emoji=undefined) => {
    if (description === undefined) description = '';
    let note_id = id;
    const row_index = this.notes_table.rows.length;
    const row = this.notes_table.add_row(['activity-row']);
    const check_cell = this.notes_table.add_cell(row_index, ['activity-cell']);
    const checkbox = document.createElement('input');
    if (this.place.map_handler.view_only) {
      checkbox.disabled = true;
    }
    checkbox.type = 'checkbox';
    check_cell.appendChild(checkbox);
    checkbox.checked = checked;
    checkbox.addEventListener('change', () => {
      const args = {'parameters': {'note_id': note_id, 'column': 'included', 'value': checkbox.checked}};
      backend_communication.call_google_function('POST',
          'update_place_note', args, (data) => {
        if (data['status'] !== 'OK') console.log(data)
      });
    });
    this.note_description_spans[note_id] = new HTMLText(description, ['activity-description'], (value, old_value) => {
      if (note_id === undefined && old_value === 'Edit description to save') {
        console.log('NEW and edited.')
        const args = {'parameters': {'place_id': this.place.id, 'description': value,
            'category': category_select.value, 'estimated_cost': Number(cost_span.estimated_cost.span.innerHTML),
            'actual_cost': Number(cost_span.actual_cost.span.innerHTML), 'paid': cost_span.is_paid, 'included': checkbox.checked,
            'trip_id': this.place.map_handler.trip_id}};
        backend_communication.call_google_function('POST',
            'add_place_note', args, (data) => {
          if (data['status'] === 'OK') {
            note_id = data['note_id'];
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
          } else {
            console.log(data);
          }
        });
      } else {
        const args = {'parameters': {'note_id': note_id, 'column': 'description', 'value': value}};
        console.log('EDITED NOTE.')
        backend_communication.call_google_function('POST',
            'update_place_note', args, (data) => {
          if (data['status'] !== 'OK') console.log(data);
        });
      }
      // console.log('updated activity:', value, old_value);
    }, 'p', false, this.place.map_handler.view_only);
    const description_cell = this.notes_table.add_cell(row_index, ['activity-description-cell']);
    description_cell.appendChild(this.note_description_spans[note_id].span);

    if (id === undefined) {
      this.note_description_spans[note_id].double_click(new MouseEvent('dblclick', {}), true);
    }

    const category_cell = this.notes_table.add_cell(row_index, ['activity-cell', 'category']);
    if (emoji !== undefined && !Object.keys(note_icons).includes(category)) {
      note_icons[category] = emoji;
    }
    const category_select = new HTMLSelect(Object.entries(note_icons).map((icon) => [icon[0], icon[1]]), ['activity-select'], (selected) => {
      // console.log('Category changed! to ', selected);
      const args = {'parameters': {'note_id': note_id, 'column': 'category', 'value': selected}};
      backend_communication.call_google_function('POST',
            'update_place_note', args, (data) => {
        if (data['status'] !== 'OK') console.log(data);
      });
    }, this.place.map_handler.view_only).select;
    category_select.value = category;
    category_cell.appendChild(category_select);
    const cost_cell = this.notes_table.add_cell(row_index, ['activity-cell', 'cost']);
    const cost_span = new HTMLCost([], (value, prefix) => {
      const args = {'parameters': {'note_id': note_id, 'column': (prefix === 'paid') ? 'paid' : `${prefix}_cost`,
          'value': value}};
      backend_communication.call_google_function('POST',
            'update_place_note', args, (data) => {
        if (data['status'] !== 'OK') console.log(data);
      });
    }, paid, this.place.map_handler.view_only);
    cost_span.estimated_cost.span.innerHTML = estimated_cost;
    cost_span.actual_cost.span.innerHTML = actual_cost;
    cost_cell.appendChild(cost_span.span);
    const delete_cell = this.notes_table.add_cell(row_index, ['activity-cell', 'delete']);
    const delete_icon = document.createElement('span');
    delete_cell.appendChild(delete_icon);
    delete_icon.classList.add('pointer');
    delete_icon.addEventListener('click', () => {
      if (this.place.map_handler.view_only) { return; }
      if (confirm('Are you sure you want to delete this place note?')) {
        if (note_id === undefined) {
          this.notes_table.table.deleteRow(row.rowIndex);
        } else {
          const args = {'parameters': {'note_id': note_id}};
          backend_communication.call_google_function('POST',
              'remove_place_note', args, (data) => {
                if (data['status'] === 'OK') {
                  this.notes_table.table.deleteRow(row.rowIndex);
                } else {
                  console.log(data)
                }
              });
        }
      }
    });
    delete_icon.innerHTML = '🗑️';
  }
}