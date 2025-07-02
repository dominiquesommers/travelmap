class CountryOverview {
  constructor(country) {
    this.country = country;
    // this.place.visits.subscribe(this.visits_changed);
    this.create_elements();
  };

  // visits_changed = (new_visits, old_visits) => {
  //   new_visits.forEach((visit) => {
  //     if (!old_visits.includes(visit)) {
  //       visit.entry_date.subscribe(this.add_visits);
  //       visit.exit_date.subscribe(this.add_visits);
  //     }
  //   });
  //   old_visits.forEach((visit) => {
  //     if (!new_visits.includes(visit)) {
  //       visit.entry_date.subscribe(this.add_visits);
  //       visit.exit_date.subscribe(this.add_visits);
  //     }
  //   });
  //   this.add_visits();
  // }

  create_elements = () => {
    this.html = document.createElement('div');
    this.title = document.createElement('h1');
    this.title.style = 'white-space: initial;'
    this.title.innerHTML = `${this.country.name} ${country_flags[this.country.name]}`;
    this.html.appendChild(this.title);

    const divider = document.createElement('span');
    divider.innerHTML = '<hr>';
    this.html.appendChild(divider);

    this.notes_div = document.createElement('div');
    this.html.appendChild(this.notes_div);
    this.add_notes();

    [0,1,2].forEach(i => {
      const divider3 = document.createElement('span');
      divider3.innerHTML = '<hr>';
      this.html.appendChild(divider3);
    });
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
      this.add_note(note.id, note.included, note.description, note.category, note.cost);
    });

    const add_note_container = document.createElement('div');
    notes_container.appendChild(add_note_container);
    add_note_container.style = 'padding: 3px; width: 100%; text-align: center;'
    const add_note = document.createElement('span');
    add_note_container.appendChild(add_note);
    add_note.classList.add('pointer');
    add_note.innerHTML = '➕';
    add_note.addEventListener('click', () => this.add_note(undefined,false, 'Edit description to save'));
  }

  add_note= (id=undefined, checked=false, description='', category=undefined, cost=0, emoji=undefined) => {
    if (description === undefined) description = '';
    let note_id = id;
    const row_index = this.notes_table.rows.length;
    const row = this.notes_table.add_row(['activity-row']);
    const check_cell = this.notes_table.add_cell(row_index, ['activity-cell']);
    const checkbox = document.createElement('input');
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
        const args = {'parameters': {'country_id': this.country.id, 'description': value, 'category': category_select.value, 'cost': Number(cost_span.innerHTML), 'included': checkbox.checked}};
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
    });
    const description_cell = this.notes_table.add_cell(row_index, ['activity-description-cell']);
    description_cell.appendChild(this.note_description_spans[note_id].span);
    const category_cell = this.notes_table.add_cell(row_index, ['activity-cell', 'category']);
    if (emoji !== undefined && !Object.keys(note_icons).includes(category)) {
      note_icons[category] = emoji;
    }
    const category_select = new HTMLSelect(Object.entries(note_icons).map((icon) => [icon[0], icon[1]]), ['activity-select'], (selected) => {
      // console.log('Category changed! to ', selected);
      const args = {'parameters': {'note_id': note_id, 'column': 'category', 'value': selected}};
      backend_communication.call_google_function('POST',
            'update_country_note', args, (data) => {
        if (data['status'] !== 'OK') console.log(data);
      });
    }).select;
    category_select.value = category;
    category_cell.appendChild(category_select);
    const cost_cell = this.notes_table.add_cell(row_index, ['activity-cell', 'cost']);
    const cost_span = new HTMLNumber([], (value) => {
      const args = {'parameters': {'note_id': note_id, 'column': 'cost', 'value': value}};
      backend_communication.call_google_function('POST',
            'update_country_note', args, (data) => {
        if (data['status'] !== 'OK') console.log(data);
      });
    }).span;
    cost_span.innerHTML = cost;
    cost_cell.appendChild(cost_span);
    const delete_cell = this.notes_table.add_cell(row_index, ['activity-cell', 'delete']);
    const delete_icon = document.createElement('span');
    delete_cell.appendChild(delete_icon);
    delete_icon.classList.add('pointer');
    delete_icon.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this country note?')) {
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
    });
    delete_icon.innerHTML = '🗑️';
  }
}