
class Overview {
  constructor(maphandler) {
    this.maphandler = maphandler;
    this.overview_div = document.getElementById('overview');
    this.create_elements();
    this.reset();
  }

  set_html = (html) => {
    this.overview_div.innerHTML = '';
    this.overview_div.appendChild(html);
  }

  append_html = (html) => {
    this.overview_div.appendChild(html);
  }

  reset = () => this.set_html(this.html);

  create_elements = () => {
    this.html = document.createElement('div');

    this.title = document.createElement('h1');
    this.html.appendChild(this.title);
    this.title.innerHTML = 'Overview';

    this.dates = document.createElement('div');
    this.html.appendChild(this.dates);
    const date_span1 = document.createElement('span');
    this.dates.appendChild(date_span1);
    date_span1.innerHTML = 'Traveling ';
    const date_span2 = document.createElement('label');
    this.dates.appendChild(date_span2);
    date_span2.for = 'start_date';
    date_span2.innerHTML = 'from: ';
    this.start_date = document.createElement("input");
    if (this.maphandler.view_only) {
      this.start_date.disabled = true;
    }
    this.start_date.style = 'width: 105px;'
    this.dates.appendChild(this.start_date);
    this.start_date.type = 'date';
    this.start_date.id = 'start_date';
    this.start_date.value = undefined;
    this.start_date.onchange = () => {
      backend_communication.call_google_function('POST',
          'set_start_date', {'parameters': {'start_date': this.start_date.value}}, (data) => {
        if (data['status'] === 'OK') {
          this.maphandler.graph.update_dates();
        } else {
          console.log(data);
        }
      });

      // backend_communication.fetch('/travel/set_start_date/',{'parameters': {'start_date': this.start_date.value}}, (data) => {
      //   if (data['status'] === 'OK') {
      //     this.maphandler.graph.update_dates();
      //   } else {
      //     console.log(data);
      //   }
      // });
    };
    const date_span3 = document.createElement('span');
    this.dates.appendChild(date_span3);
    date_span3.innerHTML = ' to ';
    this.end_date = document.createElement('span');
    this.dates.appendChild(this.end_date);
    this.end_date.innerHTML = '?';

    // const divider1 = document.createElement('span');
    // divider1.innerHTML = '<hr>';
    // this.html.appendChild(divider1);

    // this.route_span = document.createElement('span');
    // this.html.appendChild(this.route_span);

    const divider2 = document.createElement('span');
    divider2.innerHTML = '<hr>';
    this.html.appendChild(divider2);

    this.season_div = document.createElement('div');
    this.html.appendChild(this.season_div);

    const divider3 = document.createElement('span');
    divider3.innerHTML = '<hr>';
    this.html.appendChild(divider3);

    this.costs_div = document.createElement('div');
    this.html.appendChild(this.costs_div);

    const divider4 = document.createElement('span');
    divider4.innerHTML = '<hr>';
    this.html.appendChild(divider4);
  }

  update_route = (source_visit) => {
    if (source_visit !== undefined) {
      this.source_visit = source_visit;
    } else {
      source_visit = this.source_visit;
    }

    const country_scores = [];
    let current_visit = source_visit;
    country_scores.push({'name': current_visit.place.country.name, 'season': current_visit.place.season.description,
      'place': current_visit.place, 'entry_date': current_visit.entry_date.value, 'exit_date': undefined,
      'days': Object.values(current_visit.month_days).reduce((a, b) => a + b, 0),
      'sum_score': Object.entries(current_visit.month_days).map(([month,days]) => current_visit.place.season[month]*days).reduce((a, b) => a + b, 0)});
    const full_score = {'days': country_scores[0]['days'], 'sum_score': country_scores[0]['sum_score']};
    while (current_visit.next_edge.value !== undefined) {
      const next_visit = current_visit.next_edge.value.destination;
      if (next_visit.place.country !== current_visit.place.country || next_visit.place.season.description !== current_visit.place.season.description) {
        country_scores[country_scores.length - 1].exit_date = current_visit.exit_date.value;
        country_scores.push({'name': next_visit.place.country.name, 'season': next_visit.place.season.description, 'place': next_visit.place,
          'entry_date': next_visit.entry_date.value, 'exit_date': undefined,
          'days': 0, 'sum_score': 0});
      }
      const days = Object.values(next_visit.month_days).reduce((a, b) => a + b, 0);
      const sum_score = Object.entries(next_visit.month_days).map(([month, days]) => next_visit.place.season[month]*days).reduce((a, b) => a + b, 0);
      country_scores[country_scores.length - 1]['days'] += days;
      country_scores[country_scores.length - 1]['sum_score'] += sum_score;
      full_score['days'] += days;
      full_score['sum_score'] += sum_score;
      current_visit = next_visit;
    }
    country_scores[country_scores.length - 1].exit_date = current_visit.exit_date.value;
    const start_date = new Date(this.start_date.value);
    const end_date = current_visit.exit_date.value;
    const nr_days_last_month = new Date(new Date(new Date(end_date).setMonth(end_date.getMonth() + 1)).setDate(0)).getDate();
    const total_days = Math.round((end_date - start_date) / (1000 * 60 * 60 * 24));
    const nr_months = Math.round(((end_date.getFullYear() - start_date.getFullYear()) * 12 +
      end_date.getMonth() - start_date.getMonth() + Math.min(1, (end_date.getDate() - start_date.getDate()) / nr_days_last_month)) * 10) / 10;
    this.end_date.innerHTML = `${current_visit.exit_date.value.toLocaleDateString('en-US')} (${nr_months} months).` //, ${total_days} days).`;
    this.create_seasonality_table(country_scores, full_score);
    this.create_costs_table();
  }

  create_costs_table = () => {
    const costs_title = document.createElement('h3');
    this.costs_div.innerHTML = '';
    this.costs_div.appendChild(costs_title);
    const title_text = document.createElement('span');
    costs_title.appendChild(title_text);

    const costs_div = document.createElement('div');
    this.costs_div.appendChild(costs_div);

    add_collapsible(title_text, costs_div, '80vh');

    const country_costs = {cross_country: {accommodation: 0, food: 0, miscellaneous: 0, transport: 0, activities: 0, nights: 0}};
    let rent_until_edge = undefined;
    let covered_places = new Set();
    let covered_countries = new Set();
    let current_country = this.maphandler.graph.sorted_covered_visits[0].place.country.name;
    // console.log(current_country);
    this.maphandler.graph.sorted_covered_visits.forEach(visit => {
      // console.log(visit.place.get_id());
      if (!(visit.place.country.name in country_costs)) {
        country_costs[visit.place.country.name] = {accommodation: 0, food: 0, miscellaneous: 0, transport: 0, activities: 0, nights: 0};
      }

      country_costs[visit.place.country.name].nights += visit.nights.value;

      if (visit === rent_until_edge?.rent_until) {
        rent_until_edge = undefined;
      }
      if (rent_until_edge !== undefined) {
        if (rent_until_edge.includes_accommodation) {
          country_costs[visit.place.country.name].transport += 0.5 * rent_until_edge.route.cost.value * visit.nights.value;
          country_costs[visit.place.country.name].accommodation += 0.5 * rent_until_edge.route.cost.value * visit.nights.value;
        } else {
          country_costs[visit.place.country.name].transport += rent_until_edge.route.cost.value * visit.nights.value;
        }
      }
      if (rent_until_edge === undefined || !rent_until_edge.includes_accommodation) {
        country_costs[visit.place.country.name].accommodation += visit.nights.value * visit.place.costs.accommodation;
      }

      country_costs[visit.place.country.name].food += visit.nights.value * visit.place.costs.food;
      country_costs[visit.place.country.name].miscellaneous += visit.nights.value * visit.place.costs.miscellaneous;

      if (!covered_places.has(visit.place)) {
        covered_places.add(visit.place);
        visit.place.activities.forEach(activity => {
          if (activity.included) {
            country_costs[visit.place.country.name].activities += activity.cost;
          }
        });
        visit.place.notes.forEach(note => {
          if (note.included) {
            country_costs[visit.place.country.name].miscellaneous += note.cost;
          }
        });
      }

      if (!covered_countries.has(visit.place.country)) {
        covered_countries.add(visit.place.country);
        visit.place.country.notes.forEach(note => {
          if (note.included) {
            country_costs[visit.place.country.name].miscellaneous += note.cost;
          }
        });
      }

      const edge = visit.next_edge.value;
      if (edge?.rent_until !== undefined) {
        rent_until_edge = edge;
      }

      if (edge !== undefined && rent_until_edge === undefined) {
        if (edge.destination.place.country.name !== current_country) {
          current_country = edge.destination.place.country.name;
          country_costs.cross_country.transport += edge.route.cost.value;
          country_costs.cross_country.nights += edge.route.nights.value;
        } else if (edge.route.nights.value > 0) {
          if (edge.route.route_type.value === 'boat') {
            country_costs[visit.place.country.name].transport += 0.25 * edge.route.cost.value;
            country_costs[visit.place.country.name].accommodation += 0.25 * edge.route.cost.value;
            country_costs[visit.place.country.name].food += 0.25 * edge.route.cost.value;
            country_costs[visit.place.country.name].activities += 0.25 * edge.route.cost.value;
          } else {
            country_costs[visit.place.country.name].transport += 0.4 * edge.route.cost.value;
            country_costs[visit.place.country.name].accommodation += 0.4 * edge.route.cost.value;
            country_costs[visit.place.country.name].food += 0.2 * edge.route.cost.value;
          }
        } else {
          country_costs[visit.place.country.name].transport += edge.route.cost.value;
        }
      }
    });
    console.log(country_costs.cross_country)
    const cost_cats = ['accommodation', 'transport', 'food', 'activities', 'miscellaneous'];
    const total_cost = Object.fromEntries([...cost_cats, 'nights'].map(
        k => [k, Object.values(country_costs).reduce((n, v) => n + v[k], 0)]));

    console.log(total_cost);
    const total_total_cost = total_cost.accommodation + total_cost.food + total_cost.miscellaneous + total_cost.transport + total_cost.activities;
    const total_avg_cost = (total_cost.accommodation + total_cost.food + total_cost.miscellaneous + total_cost.transport + total_cost.activities - country_costs.cross_country.transport) / total_cost.nights;
    title_text.innerHTML = `Costs (€${Math.round(total_total_cost/100)/10}k, i.e., €${Math.round(total_avg_cost)}/d + €${Math.round(country_costs.cross_country.transport/100)/10}k cross)`;

    const chart_div = document.createElement('div');
    costs_div.appendChild(chart_div);

    const costs_table = new HTMLTable(['season-table']);
    costs_div.appendChild(costs_table.table);
    const row1 = costs_table.add_header(['costs-title-row', 'cell5']);
    costs_table.add_cell(0, ['cost-cell-title']).innerHTML = '';
    costs_table.row_cells[0][0].style = 'width: 35px;'; // border-right: 1px solid black';
    costs_table.add_cell(0, ['cost-cell-title']).innerHTML = 'Accom.';
    costs_table.add_cell(0, ['cost-cell-title']).innerHTML = 'Transport';
    costs_table.add_cell(0, ['cost-cell-title']).innerHTML = 'Food';
    costs_table.add_cell(0, ['cost-cell-title']).innerHTML = 'Activities';
    costs_table.add_cell(0, ['cost-cell-title']).innerHTML = 'Misc.';
    costs_table.add_cell(0, ['cost-cell-title']).innerHTML = 'Σ';
    costs_table.add_cell(0, ['cost-cell-title']).innerHTML = '💤'; //🌙
    const row2 = costs_table.add_row(['costs-row']);
    row2.style = 'border-bottom: 1px solid black;'
    costs_table.add_cell(1, ['activity-cell', 'cost']).innerHTML = `Tot.`;
    costs_table.row_cells[1][0].style = 'align: left; border-right: 1px solid black';
    costs_table.add_cell(1, ['activity-cell', 'cost']).innerHTML = `€${Math.round(total_cost.accommodation/100)/10}k`;
    costs_table.add_cell(1, ['activity-cell', 'cost']).innerHTML = `€${Math.round((total_cost.transport - country_costs.cross_country.transport)/100)/10}k`;
    costs_table.add_cell(1, ['activity-cell', 'cost']).innerHTML = `€${Math.round(total_cost.food/100)/10}k`;
    costs_table.add_cell(1, ['activity-cell', 'cost']).innerHTML = `€${Math.round(total_cost.activities/100)/10}k`;
    costs_table.add_cell(1, ['activity-cell', 'cost']).innerHTML = `€${Math.round(total_cost.miscellaneous/100)/10}k`;
    costs_table.add_cell(1, ['activity-cell', 'cost']).innerHTML = `€${Math.round((total_cost.accommodation + total_cost.food + total_cost.activities + total_cost.miscellaneous + total_cost.transport - country_costs.cross_country.transport) /100)/10}k`;
    costs_table.add_cell(1, ['activity-cell', 'cost']).innerHTML = total_cost.nights;
    const row3 = costs_table.add_row(['costs-row']);
    row3.style = 'border-bottom: 1px solid black;'
    costs_table.add_cell(2, ['activity-cell', 'cost']).innerHTML = `Avg.`;
    costs_table.row_cells[2][0].style = 'align: left; border-right: 1px solid black';
    costs_table.add_cell(2, ['activity-cell', 'cost']).innerHTML = `€${Math.round(total_cost.accommodation / total_cost.nights)}/d`;
    costs_table.add_cell(2, ['activity-cell', 'cost']).innerHTML = `€${Math.round((total_cost.transport - country_costs.cross_country.transport) / total_cost.nights)}/d`;
    costs_table.add_cell(2, ['activity-cell', 'cost']).innerHTML = `€${Math.round(total_cost.food / total_cost.nights)}/d`;
    costs_table.add_cell(2, ['activity-cell', 'cost']).innerHTML = `€${Math.round(total_cost.activities / total_cost.nights)}/d`;
    costs_table.add_cell(2, ['activity-cell', 'cost']).innerHTML = `€${Math.round(total_cost.miscellaneous / total_cost.nights)}/d`;
    costs_table.add_cell(2, ['activity-cell', 'cost']).innerHTML = `€${Math.round((total_cost.accommodation + total_cost.food + total_cost.activities + total_cost.miscellaneous + total_cost.transport - country_costs.cross_country.transport) / total_cost.nights)}/d`;
    costs_table.add_cell(2, ['activity-cell', 'cost']).innerHTML = ``;

    const opacity = 0.5;
    const colors = {'accommodation': `rgba(102, 153, 204, ${opacity})`, 'transport': `rgba(227, 67, 64, ${opacity})`,
    'food': `rgba(255, 140, 66, ${opacity})`, 'activities': `rgba(252, 186, 3, ${opacity})`, 'miscellaneous': `rgba(112, 112, 112, ${opacity})`};
    const colors_list = [colors.accommodation, colors.transport, colors.food, colors.activities, colors.miscellaneous, 'rgba(204,202,202,0.5)', 'rgba(204,202,202,0.5)'];
    costs_table.row_cells[0].slice(1).forEach((cell, index) => cell.style.background = colors_list[index]);

    const red = 'rgb(222, 25, 26)', green = 'rgb(15, 166, 40)', yellow = 'rgb(255, 255, 255)'; //'rgb(248, 161, 28)';
    Object.entries(country_costs).filter(([country, _]) => !['cross_country', 'Netherlands'].includes(country)).forEach(([country, costs], index) => {
      const country_row = costs_table.add_row(['costs-row']);
      costs_table.add_cell(3+index, ['activity-cell', 'cost']).innerHTML = `${country_flags[country]}${country_abbreviations[country]}`;
      costs_table.row_cells[3+index][0].style = 'align: left; border-right: 1px solid black';
      const cat_dirs = {'accommodation': [total_cost.accommodation / total_cost.nights - 20, 40], 'transport': [total_cost.transport / total_cost.nights - 15, 30],
        'food': [total_cost.food / total_cost.nights - 15, 30], 'activities': [total_cost.activities / total_cost.nights - 10, 20], 'miscellaneous': [total_cost.miscellaneous / total_cost.nights - 3, 6]}
      cost_cats.forEach(cat => {
        const average = costs[cat] / costs.nights;
        const cell = costs_table.add_cell(3+index, ['activity-cell', 'cost']);
        cell.innerHTML = `€${Math.round(average)}/d`;
        const score = Math.min(1, Math.max(0, 1-(average - cat_dirs[cat][0])/cat_dirs[cat][1]));
        const rgb_new = (score < 0.5) ? interpolate_color(red, yellow, score*2) : interpolate_color(yellow, green, (score-0.5)*2);
        const rgb_string = `rgb(${rgb_new.r}, ${rgb_new.g}, ${rgb_new.b}, 0.3)`;
        cell.style.background = rgb_string;
      });
      const average = (costs.accommodation + costs.food + costs.activities + costs.miscellaneous + costs.transport) / costs.nights;
      const score = Math.min(1, Math.max(0, 1-(average - 90)/60));
      const rgb_new = (score < 0.5) ? interpolate_color(red, yellow, score*2) : interpolate_color(yellow, green, (score-0.5)*2);
      const rgb_string = `rgb(${rgb_new.r}, ${rgb_new.g}, ${rgb_new.b}, 0.3)`;
      costs_table.add_cell(3+index, ['activity-cell', 'cost']).innerHTML = `€${Math.round(average)}/d`;
      costs_table.row_cells[3+index][6].style.background = rgb_string;
      costs_table.add_cell(3+index, ['activity-cell', 'cost']).innerHTML = `${costs.nights}`;
    });

    const make_plot = (categories) => {
      const traces = Object.fromEntries(categories.map(cat => [cat, new Object({'x': [], 'y': [], 'name': cat, 'type': 'bar', 'orientation': 'v', marker: { color: colors[cat], width: 1 }})]));
      Object.entries(country_costs).filter(([country, _]) => !['cross_country', 'Netherlands'].includes(country)).forEach(([country, costs]) => {
        categories.forEach(cat => {
          traces[cat]['x'].push(`${country_flags[country]}${country_abbreviations[country]}`);
          traces[cat]['y'].push(Math.round(costs[cat] / costs.nights));
        });
      });
      const layout = { barmode: 'stack', margin: { l: 30, r: 10, t: 10, b: 50}, height: 250, showlegend: false, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)'};
      Plotly.newPlot(chart_div, Object.values(traces), layout);
    };

    make_plot(cost_cats);

    costs_table.row_cells[0].slice(1, 6).forEach((cell, index) => {
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', () => make_plot([cost_cats[index], ...cost_cats.slice(0, index), ...cost_cats.slice(index+1, 10)]));
    });

    console.log(total_cost);

  }

  create_seasonality_table = (country_scores, full_score) => {
    const season_title = document.createElement('h3');
    // season_title.innerHTML = `Seasonality (${Math.round((full_score.sum_score / full_score.days) * 100)/10})`;
    this.season_div.innerHTML = '';
    this.season_div.appendChild(season_title);
    const title_text = document.createElement('span');
    season_title.appendChild(title_text);
    title_text.innerHTML = `Seasonality (${Math.round((full_score.sum_score / full_score.days) * 100)/10})`;
    const season_table_container = document.createElement('div');
    season_table_container.style = 'width: 100%;'
    this.season_div.appendChild(season_table_container);
    add_collapsible(season_title, season_table_container, '50vh');
    // season_table_container.style.maxHeight = '0px';

    const season_table = new HTMLTable(['season-table']);
    season_table_container.appendChild(season_table.table);
    season_table.add_header(['title-row']);
    ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', ''].forEach((month) => {
        season_table.add_cell(0).innerHTML = month;
    });

    country_scores.forEach((country_score, index) => {
      if (country_score['days'] > 0) {
        const place = country_score['place'];
        [['number-row']].forEach((classes) => season_table.add_row(classes));
        const cell1 = season_table.add_cell(season_table.rows.length - 1, []);
        const full = `${place.country.name}` + ((place.season.description === null || place.season.description === 'default') ? '' : ` (${place.season.description})`) +
            `:\n${country_score['entry_date'].toDateString()} - ${country_score['exit_date'].toDateString()}`;
        cell1.innerHTML = `${country_flags[place.country.name]}${country_abbreviations[place.country.name]}` + ((place.season.description === null || place.season.description === 'default') ? '' : `-${place.season.description_abbreviation}`)
        cell1.title = full;
        // cell1.innerHTML = `<abbr title="${full}">${country_flags[place.country.name]}${country_abbreviations[place.country.name]}` + ((place.season.description === null || place.season.description === 'default') ? '' : `-${place.season.description_abbreviation}`) + '</abbr>';
        cell1.style = 'text-align: left; cursor: pointer;';
        cell1.addEventListener('mouseover', (event) => {
          Object.values(this.maphandler.places.value).filter(p => p.season === place.season).forEach(p => p.marker.pill.table.classList.add('season'));
        });
        cell1.addEventListener('mouseleave', (event) => {
          Object.values(this.maphandler.places.value).filter(p => p.season === place.season).forEach(p => p.marker.pill.table.classList.remove('season'));
        });
        cell1.addEventListener('click', (event) => {
          const coordinates = Object.values(this.maphandler.places.value).filter(p => p.season === place.season).map(p => p.coordinates);
          this.maphandler.map.flyTo({'center': [coordinates.map(c => c.lat).reduce((a, b) => a + b) / coordinates.length, coordinates.map(c => c.lng).reduce((a, b) => a + b) / coordinates.length]});
        });
        this.create_season_row(season_table, place, [[country_score['entry_date'], country_score['exit_date']]], country_score);
      }
    });
  }

  create_season_row = (season_table, place, entries, score, d=0) => {
    const red = 'rgb(222, 25, 26)', green = 'rgb(15, 166, 40)', yellow = 'rgb(248, 161, 28)';
    const cells = [];
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach((month, month_index) => {
      const cell = season_table.add_cell(season_table.rows.length - 1, ['season-cell']);
      cells.push(cell);
      const season_score = place.season[month.toLowerCase()];
      const reason = place.season[`${month.toLowerCase()}_reason`];
      cell.title = `${Math.round(season_score * 10)} (${reason})`
      const rgb_new = (season_score <= 0.5) ? interpolate_color(red, yellow, season_score*2) : interpolate_color(yellow, green, (season_score-0.5)*2);
      const rgb_string = `rgb(${rgb_new.r}, ${rgb_new.g}, ${rgb_new.b}, 0.3)`
      const rgb_string_opa = `rgb(${rgb_new.r}, ${rgb_new.g}, ${rgb_new.b}, 0.8)`
      cell.style = `background: ${rgb_string};`;

      entries.forEach(([entry_date, exit_date]) => {
        if (entry_date.getMonth() === month_index && exit_date.getMonth() === month_index) {
        const entry_percent = Math.max(0, Math.round(entry_date.getDate()/ (new Date(entry_date.getFullYear(), month_index+1, 0)).getDate() * 100) - d);
        const exit_percent = Math.min(100, Math.round(exit_date.getDate()/(new Date(exit_date.getFullYear(), month_index+1, 0)).getDate()*100) + d);
        cell.style = `background: linear-gradient(to right, ${rgb_string} ${entry_percent}%, ${rgb_string_opa} ${entry_percent}%, ${rgb_string_opa} ${exit_percent}%, ${rgb_string} ${exit_percent}%);`
      } else if (entry_date.getMonth() === month_index) {
        const entry_percent = Math.max(0, Math.round(entry_date.getDate()/(new Date(entry_date.getFullYear(), month_index+1, 0)).getDate()*100) - d);
        cell.style = `background: linear-gradient(to right, ${rgb_string} ${entry_percent}%, ${rgb_string_opa} ${entry_percent}%);`;
      } else if (exit_date.getMonth() === month_index) {
        const exit_percent = Math.min(100, Math.round(exit_date.getDate()/(new Date(exit_date.getFullYear(), month_index+1, 0)).getDate()*100) + d);
        // cell.style = `background: linear-gradient(to right, ${rgb_string} ${exit_percent - d}%, black ${exit_percent - d}%, black ${exit_percent}%, ${rgb_string} ${exit_percent}%);`
        cell.style = `background: linear-gradient(to right, ${rgb_string_opa} ${exit_percent}%, ${rgb_string} ${exit_percent}%);`
      } else if (entry_date.getMonth() < month_index && exit_date.getMonth() > month_index) {
        cell.style = `background: ${rgb_string_opa};`
      }
      });
    });
    if (score !== undefined) {
      const scorie = score.sum_score / score.days;
      const rgb_new = (scorie <= 0.5) ? interpolate_color(red, yellow, scorie*2) : interpolate_color(yellow, green, (scorie-0.5)*2);
      const rgb_string = `rgb(${rgb_new.r}, ${rgb_new.g}, ${rgb_new.b}, 0.3)`
      const cell = season_table.add_cell(season_table.rows.length - 1, []);
      cell.style = `text-align: right; background: ${rgb_string}; border-left: 2px solid #5f5f5f; color: #5f5f5f`;
      cells.push(cell);
      cell.innerHTML = Math.round(scorie * 100) / 10;
    }

    return cells;
  }
}