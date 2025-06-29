
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
      const sum_score = Object.entries(next_visit.month_days).map(([month,days]) => next_visit.place.season[month]*days).reduce((a, b) => a + b, 0);
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
        visit.place.activities.forEach(activity => {
          if (activity.included) {
            country_costs[visit.place.country.name].activities += activity.cost;
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

      covered_places.add(visit.place);
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
    this.title = document.createElement('h2');
    this.title.style = 'white-space: initial;'
    this.html.appendChild(this.title);
    const place_name = new HTMLText(`${this.place.name}`, [], (value) => {
      const args = {'parameters': {'place_id': this.place.id, 'column': `name`, 'value': value}};
      backend_communication.call_google_function('POST',
          'update_place', args, (data) => {
        console.log(data);
        if (data['status'] !== 'OK') console.log(data);
      });
      // backend_communication.fetch('/travel/update_place/', args, (data) => {
      //   if (data['status'] !== 'OK') console.log(data);
      // });
    }, 'span', true).span;
    this.title.appendChild(place_name);
    const country_span = document.createElement('span');
    this.title.appendChild(country_span);
    country_span.innerHTML = `, ${this.place.country.name} ${country_flags[this.place.country.name]}`;

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
    const season_title = document.createElement('h3');
    this.season_div.appendChild(season_title);
    const title = document.createElement('span');
    season_title.appendChild(title);
    title.innerHTML = 'Time to visit';

    const season_div = document.createElement('div');
    this.season_div.appendChild(season_div);

    add_collapsible(title, season_div, '10vh');

    const season_span = document.createElement('span');
    season_div.appendChild(season_span);
    season_span.innerHTML = 'Selected season: '
    if (this.place.country.seasons.length > 1) {
      const seasons = [];
      this.place.country.seasons.sort((a, b) => a.id - b.id).forEach((season) => {
        seasons.push([season.id, (season.description === null) ? 'Default' : season.description]);
      })
      this.season_select = new HTMLSelect(seasons, [], this.season_changed).select;
      this.season_select.value = this.place.season.id;
      season_span.appendChild(this.season_select);
    } else {
      season_span.innerHTML += (this.place.season.description === null) ? 'Default' : this.place.season.description;
    }
    this.season_table_div = document.createElement('div');
    season_div.appendChild(this.season_table_div);
  }

  add_season_table = () => {
    this.season_table_div.innerHTML = '';
    const season_table = new HTMLTable(['season-table']);
    this.season_table_div.appendChild(season_table.table);
    season_table.add_row(['title-row']);
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach((month) => {
        season_table.add_cell(0).innerHTML = month;
    });
    [['number-row']].forEach((classes) => season_table.add_row(classes));
    const visiting_visits = this.place.visits.value.filter((visit) => visit.entry_date.value !== undefined && visit.exit_date.value !== undefined);
    const entries = visiting_visits.sort((a, b) => a.entry_date.value - b.entry_date.value).map((visit) => [visit.entry_date.value, visit.exit_date.value])
    const cells = this.place.map_handler.overview.create_season_row(season_table, this.place, entries, undefined, 15);
    cells[0].style.height = '22px';

  }

  season_changed = (event) => {
    const args = { 'parameters': {'place_id': this.place.id, 'column': 'season_id', 'value': this.season_select.value}};

    backend_communication.call_google_function('POST',
          'update_place', args, (data) => {
      console.log(data);
      if (data['status'] === 'OK') {
        console.log(this.place.country.seasons);
        this.place.season = this.place.country.seasons.filter(s => s.id === Number(this.season_select.value))[0];
        this.place.map_handler.overview.update_route();
        this.add_season_table();
        console.log(this.place);
      } else {
        console.log(data);
        this.season_select.value = this.place.season.id;
      }
    });


    // backend_communication.fetch('/travel/update_place/', args, (data) => {
    //   if (data['status'] === 'OK') {
    //     console.log(this.place.country.seasons);
    //     this.place.season = this.place.country.seasons.filter(s => s.id === Number(this.season_select.value))[0];
    //     this.place.map_handler.overview.update_route();
    //     this.add_season_table();
    //     console.log(this.place);
    //   } else {
    //     console.log(data);
    //     this.season_select.value = this.place.season.id;
    //   }
    // });
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
    // this.cost = new HTMLNumber([], () => this.accommodation_cost_changed(Number(this.cost.innerHTML))).span;
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
      const cost_span = new HTMLNumber([], (value) => {
        const args = {'parameters': {'place_id': this.place.id, 'column': `${cost_type}_cost`, 'value': value}};
        backend_communication.call_google_function('POST',
          'update_place', args, (data) => {
          console.log(data);
          if (data['status'] !== 'OK') console.log(data)
        });

        // backend_communication.fetch('/travel/update_place/', args, (data) => {
        //   if (data['status'] !== 'OK') console.log(data)
        // });
      }).span;
      cost_span.innerHTML = this.place.costs[cost_type];
      cost_cell.appendChild(cost_span);
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
    title.innerHTML = 'Activities:'
    const magic_activity = document.createElement('span');
    magic_activity.style = 'font-size: 20px;'
    activities_title.appendChild(magic_activity);
    magic_activity.classList.add('pointer');
    magic_activity.innerHTML = ' 🧙‍'; //'<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" x="0" y="0" viewBox="0 0 32 32" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M20 29H6a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3zM6 11a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1zM10 8a1 1 0 0 1-1-1V6a3 3 0 0 1 3-3h1a1 1 0 0 1 0 2h-1a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1zM26 23h-1a1 1 0 0 1 0-2h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 2 0v1a3 3 0 0 1-3 3zM28 8a1 1 0 0 1-1-1V6a1 1 0 0 0-1-1h-1a1 1 0 0 1 0-2h1a3 3 0 0 1 3 3v1a1 1 0 0 1-1 1zM28 16a1 1 0 0 1-1-1v-4a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1zM21 5h-4a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M16 20h-6a1 1 0 0 1 0-2h6a1 1 0 0 1 0 2z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M13 23a1 1 0 0 1-1-1v-6a1 1 0 0 1 2 0v6a1 1 0 0 1-1 1z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    magic_activity.addEventListener('click', () => {
      console.log('Not implemented anymore.');
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
    });

    const activities_container = document.createElement('div');
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
      this.add_activity(activity.id, activity.included, activity.description, activity.category, activity.cost);
    });

    const add_activity_container = document.createElement('div');
    activities_container.appendChild(add_activity_container);
    add_activity_container.style = 'padding: 3px; width: 100%; text-align: center;'
    const add_activity = document.createElement('span');
    add_activity_container.appendChild(add_activity);
    add_activity.classList.add('pointer');
    add_activity.innerHTML = '➕'; //'<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" x="0" y="0" viewBox="0 0 32 32" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M20 29H6a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3zM6 11a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1zM10 8a1 1 0 0 1-1-1V6a3 3 0 0 1 3-3h1a1 1 0 0 1 0 2h-1a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1zM26 23h-1a1 1 0 0 1 0-2h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 2 0v1a3 3 0 0 1-3 3zM28 8a1 1 0 0 1-1-1V6a1 1 0 0 0-1-1h-1a1 1 0 0 1 0-2h1a3 3 0 0 1 3 3v1a1 1 0 0 1-1 1zM28 16a1 1 0 0 1-1-1v-4a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1zM21 5h-4a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M16 20h-6a1 1 0 0 1 0-2h6a1 1 0 0 1 0 2z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M13 23a1 1 0 0 1-1-1v-6a1 1 0 0 1 2 0v6a1 1 0 0 1-1 1z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
    add_activity.addEventListener('click', () => this.add_activity(undefined,false, 'Edit description to save'));
  }

  add_activity = (id=undefined, checked=false, description='', category=undefined, cost=0, emoji=undefined) => {
    if (description === undefined) description = '';
    let activity_id = id;
    const row_index = this.activities_table.rows.length;
    const row = this.activities_table.add_row(['activity-row']);
    const check_cell = this.activities_table.add_cell(row_index, ['activity-cell']);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    check_cell.appendChild(checkbox);
    checkbox.checked = checked;
    checkbox.addEventListener('change', () => {
      const args = {'parameters': {'activity_id': activity_id, 'column': 'included', 'value': checkbox.checked}};
      backend_communication.call_google_function('POST',
          'update_activity', args, (data) => {
        if (data['status'] !== 'OK') console.log(data)
      });
      // backend_communication.fetch('/travel/update_activity/', args, (data) => {
      //   if (data['status'] !== 'OK') console.log(data)
      // });
    });
    const description_span = new HTMLText(description, ['activity-description'], (value, old_value) => {
      if (activity_id === undefined && old_value === 'Edit description to save') {
        // console.log('NEW and edited wiehoe.')
        const args = {'parameters': {'place_id': this.place.id, 'description': value, 'category': category_select.value, 'cost': Number(cost_span.innerHTML), 'included': checkbox.checked}};
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
        // backend_communication.fetch('/travel/add_activity/', args, (data) => {
        //   if (data['status'] === 'OK') {
        //     activity_id = data['id'];
        //     checkbox.checked = true;
        //     checkbox.dispatchEvent(new Event('change'));
        //   } else {
        //     console.log(data);
        //   }
        // });
      } else {
        const args = {'parameters': {'activity_id': activity_id, 'column': 'description', 'value': value}};
        backend_communication.call_google_function('POST',
            'update_activity', args, (data) => {
          if (data['status'] !== 'OK') console.log(data);
        });
        // backend_communication.fetch('/travel/update_activity/', args, (data) => {
        //   if (data['status'] !== 'OK') console.log(data)
        // });
      }
      // console.log('updated activity:', value, old_value);
    }).span;
    const description_cell = this.activities_table.add_cell(row_index, ['activity-description-cell']);
    description_cell.appendChild(description_span);
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
      // backend_communication.fetch('/travel/update_activity/', args, (data) => {
      //   if (data['status'] !== 'OK') console.log(data)
      // });
    }).select;
    category_select.value = category;
    category_cell.appendChild(category_select);
    const cost_cell = this.activities_table.add_cell(row_index, ['activity-cell', 'cost']);
    const cost_span = new HTMLNumber([], (value) => {
      // console.log(`Activity cost changed: ${Number(value)}`);
      const args = {'parameters': {'activity_id': activity_id, 'column': 'cost', 'value': value}};
      backend_communication.call_google_function('POST',
            'update_activity', args, (data) => {
        if (data['status'] !== 'OK') console.log(data);
      });
      // backend_communication.fetch('/travel/update_activity/', args, (data) => {
      //   if (data['status'] !== 'OK') console.log(data)
      // });
    }).span;
    cost_span.innerHTML = cost;
    cost_cell.appendChild(cost_span);
    const delete_cell = this.activities_table.add_cell(row_index, ['activity-cell', 'delete']);
    const delete_icon = document.createElement('span');
    delete_cell.appendChild(delete_icon);
    delete_icon.classList.add('pointer');
    delete_icon.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this activity?')) {
        // console.log(`Delete activity from row ${row_index}!`);
        const args = {'parameters': {'activity_id': activity_id}};
        backend_communication.call_google_function('POST',
              'remove_activity', args, (data) => {
          if (data['status'] === 'OK') {
            this.activities_table.table.deleteRow(row.rowIndex);
          } else {
            console.log(data)
          }
        });
        // backend_communication.fetch('/travel/remove_activity/', args, (data) => {
        //   if (data['status'] === 'OK') {
        //     this.activities_table.table.deleteRow(row.rowIndex);
        //   } else {
        //     console.log(data)
        //   }
        // });
      }
    });
    delete_icon.innerHTML = '🗑️'; //<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="m62.205 150 26.569 320.735C90.678 493.865 110.38 512 133.598 512h244.805c23.218 0 42.92-18.135 44.824-41.265L449.795 150H62.205zm118.781 302c-7.852 0-14.458-6.108-14.956-14.063l-15-242c-.513-8.276 5.771-15.395 14.033-15.908 8.569-.601 15.381 5.757 15.908 14.033l15 242c.531 8.57-6.25 15.938-14.985 15.938zM271 437c0 8.291-6.709 15-15 15s-15-6.709-15-15V195c0-8.291 6.709-15 15-15s15 6.709 15 15v242zm89.97-241.062-15 242c-.493 7.874-7.056 14.436-15.908 14.033-8.262-.513-14.546-7.632-14.033-15.908l15-242c.513-8.276 7.764-14.297 15.908-14.033 8.262.513 14.546 7.632 14.033 15.908zM451 60h-90V45c0-24.814-20.186-45-45-45H196c-24.814 0-45 20.186-45 45v15H61c-16.569 0-30 13.431-30 30 0 16.567 13.431 30 30 30h390c16.569 0 30-13.433 30-30 0-16.569-13.431-30-30-30zm-120 0H181V45c0-8.276 6.724-15 15-15h120c8.276 0 15 6.724 15 15v15z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>';
  }

  change_description_callback = (value, old_value) => {

  }
}

class RouteOverview {
  constructor(route) {
    this.route = route;
    this.create_elements();
    this.html_table = this.create_table();
  };

  create_elements = () => {
    this.html = document.createElement('div');
    this.html.innerHTML = this.route.get_id();
  }

  create_table = () => {

  }
}