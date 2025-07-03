class RouteOverview {
  constructor(route) {
    this.route = route;
    this.route.traverses.subscribe(this.add_traverses);
    this.create_elements();
  };

  traverses_changed = () => {
    console.log(this.route.get_id(), this.route.traverses.value);
  }

  create_elements = () => {
    this.html = document.createElement('div');
    this.title = document.createElement('h1');
    this.html.appendChild(this.title);
    // this.title.innerHTML = `${this.route.source.name} -${transport_icons[this.route.route_type.value]}-> ${this.route.destination.name}`;
    this.title.style = 'line-height: 25px;';
    this.title.innerHTML = `${this.route.source.name}, ${this.route.source.country.name} ${country_flags[this.route.source.country.name]}`
    this.title.innerHTML += `<br>&nbsp;&nbsp;${transport_icons[this.route.route_type.value]}&#8600;<br>&nbsp;&nbsp;&nbsp;&nbsp;`;
    this.title.innerHTML += `${this.route.destination.name}, ${this.route.destination.country.name} ${country_flags[this.route.destination.country.name]}`

    const divider = document.createElement('span');
    divider.innerHTML = '<hr>';
    this.html.appendChild(divider);

    this.traverses_div = document.createElement('div');
    this.html.appendChild(this.traverses_div);

    const divider2 = document.createElement('span');
    divider2.innerHTML = '<hr>';
    this.html.appendChild(divider2);

    this.notes_div = document.createElement('div');
    this.html.appendChild(this.notes_div);
    this.add_notes();

    const divider5 = document.createElement('span');
    divider5.innerHTML = '<hr>';
    this.html.appendChild(divider5)
  }

  add_traverses = () => {
    this.traverses_div.innerHTML = '';
    // const visiting_visits = filter((visit) => visit.entry_date.value !== undefined);
    // const nr_excluded_visits = this.place.visits.value.filter((visit) => !visit.included.value).length;
    // const nr_uncovered_visits = this.place.visits.value.filter((visit) => visit.included.value && visit.entry_date.value === undefined).length;

    const traverse_title = document.createElement('h3');
    this.traverses_div.appendChild(traverse_title);
    const title = document.createElement('span');
    traverse_title.appendChild(title);
    title.innerHTML = (this.route.traverses.value.length === 0) ? 'Not traversing with the current planning.' : 'Traversing on:';

    const traverse_info_div = document.createElement('div');
    this.traverses_div.appendChild(traverse_info_div);
    add_collapsible(title, traverse_info_div, '10vh');

    const traverse_span = document.createElement('span')
    traverse_info_div.appendChild(traverse_span);
    if (this.route.traverses.value.length > 0) {
      this.route.traverses.value.sort().forEach((traverse) => {
        traverse_span.innerHTML += `${traverse.toDateString()}<br>`
      });
    }
    // traverse_span.innerHTML += `${nr_excluded_visits} visits excluded, ${nr_uncovered_visits} visits not covered.`
    // this.add_season_table();
  }

  add_notes = () => {
    const notes_title = document.createElement('h3');
    this.notes_div.appendChild(notes_title);
    const title = document.createElement('span');
    notes_title.appendChild(title);
    title.innerHTML = 'Route notes:'

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
    this.notes_table.add_cell(0, ['act-description-title']).innerHTML = 'Description';

    this.route.notes.forEach((note) => {
      this.add_note(note.id, note.description);
    });

    const add_note_container = document.createElement('div');
    notes_container.appendChild(add_note_container);
    add_note_container.style = 'padding: 3px; width: 100%; text-align: center;'
    const add_note = document.createElement('span');
    add_note_container.appendChild(add_note);
    add_note.classList.add('pointer');
    add_note.innerHTML = '➕';
    add_note.addEventListener('click', () => this.add_note(undefined, 'Edit description to save'));
  }

  add_note= (id=undefined, description='') => {
    if (description === undefined) description = '';
    let note_id = id;
    const row_index = this.notes_table.rows.length;
    const row = this.notes_table.add_row(['activity-row']);

    this.note_description_spans[note_id] = new HTMLText(description, ['activity-description'], (value, old_value) => {
      if (note_id === undefined && old_value === 'Edit description to save') {
        console.log('NEW and edited.')
        const args = {'parameters': {'route_id': this.route.id, 'description': value}};
        backend_communication.call_google_function('POST',
            'add_route_note', args, (data) => {
          if (data['status'] === 'OK') {
            note_id = data['note_id'];
          } else {
            console.log(data);
          }
        });
      } else {
        const args = {'parameters': {'note_id': note_id, 'column': 'description', 'value': value}};
        console.log('EDITED NOTE.')
        backend_communication.call_google_function('POST',
            'update_route_note', args, (data) => {
          if (data['status'] !== 'OK') console.log(data);
        });
      }
      // console.log('updated activity:', value, old_value);
    });
    const description_cell = this.notes_table.add_cell(row_index, ['activity-description-cell']);
    description_cell.appendChild(this.note_description_spans[note_id].span);

    const delete_cell = this.notes_table.add_cell(row_index, ['activity-cell', 'delete']);
    const delete_icon = document.createElement('span');
    delete_cell.appendChild(delete_icon);
    delete_icon.classList.add('pointer');
    delete_icon.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this route note?')) {
        const args = {'parameters': {'note_id': note_id}};
        backend_communication.call_google_function('POST',
              'remove_route_note', args, (data) => {
          if (data['status'] === 'OK') {
            this.notes_table.table.deleteRow(row.rowIndex);
          } else {
            console.log(data)
          }
        });
      }
    });
    delete_icon.innerHTML = '🗑️';
  }
}