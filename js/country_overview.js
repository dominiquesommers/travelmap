class CountryOverview {
  constructor(country) {
    this.country = country;
    this.country.visits.subscribe(this.add_visits);
    this.create_elements();
  };

  create_elements = () => {
    this.html = document.createElement('div');
    this.title = document.createElement('h1');
    this.title.style = 'white-space: initial;'
    this.title.innerHTML = `${this.country.name} ${country_flags[this.country.name]}`;
    this.html.appendChild(this.title);

    const divider = document.createElement('span');
    divider.innerHTML = '<hr>';
    this.html.appendChild(divider);

    this.visits_div = document.createElement('div');
    this.html.appendChild(this.visits_div);

    const divider2 = document.createElement('span');
    divider2.innerHTML = '<hr>';
    this.html.appendChild(divider2);

    this.notes_div = document.createElement('div');
    this.html.appendChild(this.notes_div);
    this.add_notes();

    [0,1,2].forEach(i => {
      const divider3 = document.createElement('span');
      divider3.innerHTML = '<hr>';
      this.html.appendChild(divider3);
    });
  }

  add_visits = () => {
    this.visits_div.innerHTML = '';
    const visit_title = document.createElement('h3');
    this.visits_div.appendChild(visit_title);
    const title = document.createElement('span');
    visit_title.appendChild(title);
    title.innerHTML = (this.country.visits.value.length === 0) ? 'Not visiting with the current planning.' : 'Visiting for ';

    const visit_info_div = document.createElement('div');
    this.visits_div.appendChild(visit_info_div);
    add_collapsible(title, visit_info_div, '10vh');

    const visit_span = document.createElement('span')
    visit_info_div.appendChild(visit_span);
    let total_visit_days = 0;
    if (this.country.visits.value.length > 0) {
      this.country.visits.value.sort((a, b) => a[0] - b[0]).forEach((visit) => {
        const days = ((visit[1] - visit[0]) / (24 * 60 * 60 * 1000)) + 1;
        visit_span.innerHTML += `${visit[0].toDateString()} - ${visit[1].toDateString()} (${days} day${days !== 1 ? 's' : ''})<br>`;
        total_visit_days += days;
      });
      title.innerHTML += `${total_visit_days} day${total_visit_days !== 1 ? 's' : ''} on:`;
    }
  }

  add_notes = () => {
    const notes_title = document.createElement('h3');
    this.notes_div.appendChild(notes_title);
    const title = document.createElement('span');
    notes_title.appendChild(title);
    title.innerHTML = 'Country notes:'

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

    this.country.notes.forEach((note) => {
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
      if (this.country.map_handler.view_only) { return; }
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
    if (this.country.map_handler.view_only) {
      checkbox.disabled = true;
    }
    checkbox.type = 'checkbox';
    check_cell.appendChild(checkbox);
    checkbox.checked = checked;
    checkbox.addEventListener('change', () => {
      const args = {'parameters': {'note_id': note_id, 'column': 'included', 'value': checkbox.checked}};
      backend_communication.call_google_function('POST',
          'update_country_note', args, (data) => {
        if (data['status'] !== 'OK') console.log(data)
      });
    });
    this.note_description_spans[note_id] = new HTMLText(description, ['activity-description'], (value, old_value) => {
      if (note_id === undefined && old_value === 'Edit description to save') {
        console.log('NEW and edited.')
        const args = {'parameters': {'country_id': this.country.id, 'description': value,
            'category': category_select.value, 'estimated_cost': Number(cost_span.estimated_cost.span.innerHTML),
            'actual_cost': Number(cost_span.actual_cost.span.innerHTML), 'paid': cost_span.is_paid,
            'included': checkbox.checked, 'trip_id': this.country.map_handler.trip_id}};
        backend_communication.call_google_function('POST',
            'add_country_note', args, (data) => {
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
            'update_country_note', args, (data) => {
          if (data['status'] !== 'OK') console.log(data);
        });
      }
      // console.log('updated activity:', value, old_value);
    }, 'p', false, this.country.map_handler.view_only);
    const description_cell = this.notes_table.add_cell(row_index, ['activity-description-cell']);
    description_cell.appendChild(this.note_description_spans[note_id].span);

    if (id === undefined) {
      this.note_description_spans[note_id].double_click(new MouseEvent('dblclick', {}), true);
    }

    const category_cell = this.notes_table.add_cell(row_index, ['activity-cell', 'category']);
    if (emoji !== undefined && !Object.keys(note_icons).includes(category)) {
      note_icons[category] = emoji;
    }
    const category_select = new HTMLSelect(Object.entries(note_icons).map((icon) => [icon[0], icon[1]]),
        ['activity-select'], (selected) => {
      // console.log('Category changed! to ', selected);
      const args = {'parameters': {'note_id': note_id, 'column': 'category', 'value': selected}};
      backend_communication.call_google_function('POST',
            'update_country_note', args, (data) => {
        if (data['status'] !== 'OK') console.log(data);
      });
    }, this.country.map_handler.view_only).select;
    category_select.value = category;
    category_cell.appendChild(category_select);
    const cost_cell = this.notes_table.add_cell(row_index, ['activity-cell', 'cost']);
    const cost_span = new HTMLCost([], (value, prefix) => {
      const args = {'parameters': {'note_id': note_id, 'column': (prefix === 'paid') ? 'paid' : `${prefix}_cost`,
          'value': value}};
      backend_communication.call_google_function('POST',
            'update_country_note', args, (data) => {
        if (data['status'] !== 'OK') console.log(data);
      });
    }, paid, this.country.map_handler.view_only);
    cost_span.estimated_cost.span.innerHTML = estimated_cost;
    cost_span.actual_cost.span.innerHTML = actual_cost;
    cost_cell.appendChild(cost_span.span);
    const delete_cell = this.notes_table.add_cell(row_index, ['activity-cell', 'delete']);
    const delete_icon = document.createElement('span');
    delete_cell.appendChild(delete_icon);
    delete_icon.classList.add('pointer');
    delete_icon.addEventListener('click', () => {
      if (this.country.map_handler.view_only) { return; };
      if (confirm('Are you sure you want to delete this country note?')) {
        if (note_id === undefined) {
          this.notes_table.table.deleteRow(row.rowIndex);
        } else {
          const args = {'parameters': {'note_id': note_id}};
          backend_communication.call_google_function('POST',
              'remove_country_note', args, (data) => {
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