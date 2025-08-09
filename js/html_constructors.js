
class SVGHandler {
  constructor() {
    this.svgs = {};
  };

  get_svg = (width, height, id) => {
    xml.firstChild.setAttribute('width', width);
    xml.firstChild.setAttribute('height', height);
    xml.firstChild.setAttribute('height', id);
  };

  load_svg = (filename, callback= (xml) => {}) => {
    if (Object.keys(this.svgs).includes(filename)) {
      callback(this.svgs[filename]);
    } else {
      const request = new XMLHttpRequest();
      request.open('GET', filename);
      request.setRequestHeader('Content-Type', 'image/svg+xml');
      request.addEventListener('load', (event) => {
        const xml = (new DOMParser()).parseFromString(event.target.responseText, 'image/svg+xml');
        this.svgs[filename] = xml;
        callback(xml);
      });

      request.send();
    }
  };
}

class HTMLCost {
  constructor(css_classes=[], change_callback=(value)=>{}, paid=false, view_only=false) {
    this.context_menu = document.createElement('div');
    this.context_menu.style = 'position: fixed; z-index: 10000; display: none; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);';
    this.mark_as_paid_button = document.createElement('button');
    this.context_menu.appendChild(this.mark_as_paid_button);
    this.is_paid = paid;
    this.mark_as_paid_button.innerHTML = this.is_paid ? 'Mark as <b>unpaid</b>' : 'Mark as <b>paid</b>';
    this.mark_as_paid_button.classList.add('mark-as-paid');
    this.span = document.createElement('span');
    document.getElementById('mark-as-paid-buttons').appendChild(this.context_menu);
    this.estimated_cost = new HTMLNumber(css_classes, (value) => change_callback(value, 'estimated'), view_only);
    this.estimated_cost_sup = document.createElement('sup');
    this.estimated_cost_sup.innerHTML = '(est.)'
    this.estimated_cost_sup.classList.add('hidden', 'opacity-50');
    this.actual_cost = new HTMLNumber(css_classes, (value) => change_callback(value, 'actual'), view_only);
    this.actual_cost.span.style = 'margin-left: 2px;';
    this.actual_cost.span.classList.add('hidden');
    this.actual_cost_sup = document.createElement('sup');
    this.actual_cost_sup.innerHTML = '✔';
    this.actual_cost_sup.classList.add('hidden', 'text-green-600');
    this.span.appendChild(this.estimated_cost.span);
    this.span.appendChild(this.estimated_cost_sup);
    this.span.appendChild(this.actual_cost.span);
    this.span.appendChild(this.actual_cost_sup);
    const open_context_menu = (event) => {
      if (view_only) {
        return;
      }
      event.preventDefault();
      this.context_menu.style.display = 'block';
      this.mark_as_paid_button.innerHTML = this.is_paid ? 'Mark as <b>unpaid</b>' : 'Mark as <b>paid</b>';
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = this.mark_as_paid_button.offsetWidth;
      const menuHeight = this.mark_as_paid_button.offsetHeight;
      let topPosition = event.clientY;
      let leftPosition = event.clientX;
      if (topPosition + menuHeight > viewportHeight) {
        topPosition = viewportHeight - menuHeight - 5;
      }
      if (leftPosition + menuWidth > viewportWidth) {
        leftPosition = viewportWidth - menuWidth - 5;
      }
      this.context_menu.style.top = `${topPosition}px`;
      this.context_menu.style.left = `${leftPosition}px`;
    }
    this.mark_as_paid_button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    this.span.addEventListener('contextmenu', open_context_menu);
    let touchTimer;
    this.span.addEventListener('touchstart', (event) => {
      event.preventDefault();
      touchTimer = setTimeout(() => {
        open_context_menu(event);
      }, 750);
    });
    this.span.addEventListener('touchend', () => {
      clearTimeout(touchTimer);
    });


    const set_properties = () => {
      if (this.is_paid) {
        this.estimated_cost.span.classList.add('line-through', 'opacity-50');
        this.estimated_cost_sup.classList.remove('hidden');
        this.actual_cost.span.classList.remove('hidden');
        this.actual_cost_sup.classList.remove('hidden');
      } else {
        this.estimated_cost.span.classList.remove('line-through', 'opacity-50');
        this.estimated_cost_sup.classList.add('hidden');
        this.actual_cost.span.classList.add('hidden');
        this.actual_cost_sup.classList.add('hidden');
      }
    }
    set_properties();

    this.mark_as_paid_button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.is_paid = !this.is_paid;
      change_callback(this.is_paid, 'paid');
      set_properties();
      this.context_menu.style.display = 'none';
    });

    document.addEventListener('click', (event) => {
      if (!this.context_menu.contains(event.target) && !this.span.contains(event.target)) {
        this.context_menu.style.display = 'none';
      }
    });
    document.addEventListener('contextmenu', (event) => {
      if (!this.context_menu.contains(event.target) && !this.span.contains(event.target)) {
        this.context_menu.style.display = 'none';
      }
    });
  }
}

class HTMLNumber {
  constructor(css_classes=[], change_callback=(value)=>{}, view_only=false) {
    this.span = document.createElement('span');
    // this.span.contentEditable = true;
    css_classes?.forEach(css_class => this.span.classList.add(css_class));
    this.change_callback = change_callback;
    this.span.addEventListener('keypress', (event) => {
	    if (isNaN(String.fromCharCode(event.which)) || event.code === 'Space') event.preventDefault();
      if (event.key === 'Enter') {
        this.span.contentEditable = false;
        event.preventDefault();
      }
    });

    this.span.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (view_only) { return; }
      this.span.contentEditable = true;
      this.span.focus();
    });

    // this.span.addEventListener('click', (event) => this.listen_for_double_click(this.span));
    this.span.addEventListener('blur', (event) => {
      this.span.innerHTML = Number(this.span.innerHTML);
      this.span.contentEditable = false;
      this.change_callback(Number(this.span.innerHTML));
    });
    ['copy', 'cut', 'paste'].forEach((event) => {
      this.span.addEventListener(event, () => { return false; })
    })
  }

  listen_for_double_click = (element) => {
      element.contentEditable = true;
      setTimeout(() => {
        if (document.activeElement !== element) {
          element.contentEditable = false;
        }
      }, 300);
    }
}

class HTMLText {
  constructor(inner='', css_classes=[], change_callback=()=>{}, sp='p', enter_enter=false, view_only=false) {
    this.span = document.createElement(sp);
    this.span.contentEditable = false;
    css_classes?.forEach(css_class => this.span.classList.add(css_class));
    this.span.style = 'width: 100%; white-space: initial; word-wrap: break-word; padding: 3px; -webkit-user-select: none;'
    this.change_callback = change_callback;

    if (enter_enter) {
      this.span.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        this.span.contentEditable = false;
        event.preventDefault();
      }
    });
    }

    this.span.addEventListener('dblclick', (event) => {
      event.preventDefault();
      if (view_only) { return; }
      this.span.contentEditable = true;
      console.log(document.activeElement, this.value);
      if (document.activeElement !== this.span) {
        this.span.innerHTML = this.value;
      }
      this.span.focus();
      console.log('stopprop5');
      event.preventDefault();
      event.stopPropagation();
    });


    // this.span.addEventListener('click', (event) => this.listen_for_double_click(event, this.span));
    this.timer;
    this.span.addEventListener('touchstart', (event) => this.listen_for_hold(event, this.span));
    this.span.addEventListener('touchend', (event) => clearTimeout(this.timer));
    this.span.addEventListener('blur', (event) => {
      console.log('blur');
      this.span.contentEditable = false;
      if (this.value !== this.span.innerHTML) {
        this.change_callback(this.span.innerHTML, this.value);
      }
      this.process();
    });
    this.value = inner;
    this.span.innerHTML = inner;
    const expression = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;
    this.link_regex = new RegExp(expression);
    this.url_regex = new RegExp(/url\(([^)]+)\)/gi);
    this.process();
    this.span.addEventListener('paste', (e) => {
      e.preventDefault();
      var text = (e.originalEvent || e).clipboardData.getData('text/plain');
      document.execCommand("insertHTML", false, text);
    });
  }

  process = () => {
    this.value = this.span.innerHTML;
    this.span.innerHTML = '';
    let current_index = 0;
    let urls = Array.from(this.value.matchAll(this.url_regex));
    urls.forEach((match) => {
      if (match[0].length === 0) return;
        this.span.innerHTML += this.value.slice(current_index, match.index);
        const splitted = match[0].slice(4, -1).split(/,(.*)/s);
        if (splitted.length === 1) throw new Error(`No separator found in url, ${this.value}.`);
        const link = splitted[0].replaceAll(' ', '').match(this.link_regex);
        if (link === null) throw new Error('Url not valid.');
        const short = splitted[1].trim();
        const link_el = document.createElement('a')
        link_el.href = (link[0].startsWith('https://') || link[0].startsWith('http://')) ? link[0] : `https://${link[0]}`;
        link_el.target  = '_blank';
        link_el.innerHTML = short;
        this.span.appendChild(link_el);
        current_index = match.index + match[0].length;
    });
    this.span.innerHTML += this.value.slice(current_index);
  }

  listen_for_double_click = (event, element) => {
    if (event.target !== element) {
      return;
    }
    element.contentEditable = true;
    if (document.activeElement !== element) {
      this.span.innerHTML = this.value;
    }
    setTimeout(() =>{
      if (document.activeElement !== element) {
        element.contentEditable = false;
        this.process();
      }
    }, 300);
  }

  listen_for_hold = (event, element) => {
    console.log('lisstne')
    this.timer = setTimeout(() => {
      console.log('holded.')
      element.contentEditable = true;
      if (document.activeElement !== element) {
        this.span.innerHTML = this.value;
      }
    }, 1000);
  }
}

const transport_icons = {
  'train': '🚂', //'&#128646',
  'flying': '✈️', //'&#128745'
  'driving': '🚙', // '&#128664',
  'boat': '⛵️', //'&#128755',
  'bus': '🚌', //'&#128656',
  undefined: '&#128640'
}

const activity_icons = {
  'jungle': '🦎', //🌿🍃',
  'canoe': '🚣',
  'canoe-dolphins': '️🚣',
  'safari': '🐆',
  'water-safari': '🐳',
  'hiking': '🥾️',
  'surfing': '🏄',
  'beach': '🏖️',
  // 'Parks & Recreation': '🏖️',
  'Adventure & Views': '🌉',
  'Wildlife & Animals': '🐨',
  'Tours & Water Activities': '🚢',
  'Museums & Culture': '🏛️',
  'Art & Culture': '🖼️',
  'Parks & Recreation': '🌳',
  'Island & Water Activities': '🐬',
  // 'Art & Culture': '🎨',
  'Shopping & Dining': '🛍️',
  undefined: '▫️'
}

const note_icons = {
  'visa': '🪪',
  undefined: '▫️'
}

class HTMLSelect {
  constructor(options=[], css_classes=[], change_callback=(selected) => {}, view_only=false) {
    this.select = document.createElement('select');
    if (view_only) {
      this.select.disabled = true;
    }
    css_classes?.forEach(css_class => this.select.classList.add(css_class));
    this.options = [];
    options.forEach((option) => {
      const select = document.createElement('option');
      this.options.push(select);
      select.value = option[0];
      select.innerHTML = option[1];
      this.select.appendChild(select);
    });
    this.select.addEventListener('change', () => {
      change_callback(this.select.value);
    });
  }
}


class HTMLTable {
  constructor(css_classes=[], view_only=false) {
    this.table = document.createElement('table');
    this.table_header = document.createElement('thead');
    this.table.appendChild(this.table_header);
    this.table_body = document.createElement('tbody');
    this.table.appendChild(this.table_body);
    css_classes?.forEach(css_class => this.table.classList.add(css_class));
    this.rows = [];
    this.row_cells = [];
  }

  add_header = (css_classes=[]) => {
    const row = document.createElement('tr');
    for (const css_class of css_classes) {
      row.classList.add(css_class);
    }
    this.table_header.appendChild(row);
    this.rows.push(row);
    this.row_cells.push([]);
    return row;
  };

  add_row = (css_classes=[]) => {
    const row = document.createElement('tr');
    for (const css_class of css_classes) {
      row.classList.add(css_class);
    }
    this.table_body.appendChild(row);
    this.rows.push(row);
    this.row_cells.push([]);
    return row;
  };

  add_cell = (row_index, css_classes=[], col_span=0, row_span=0) => {
    const cell = document.createElement('td');
    for (const css_class of css_classes) {
      cell.classList.add(css_class);
    }
    if (col_span > 1) {
      cell.colSpan = col_span;
    }
    if (row_span > 1) {
      cell.rowSpan = row_span;
    }

    this.rows[row_index].appendChild(cell);
    this.row_cells[row_index].push(cell);
    return cell;
  };

  clear_row = (row_index) => {
    this.row_cells[row_index] = [];
    while (this.rows[row_index].firstChild) {
      this.rows[row_index].removeChild(this.rows[row_index].lastChild);
    }
  }
}


class SortableHTMLList {
  constructor(edit, callback=(elements, prev_elements, dragged_element) => {}, view_only=false) {
    this.container = document.createElement('div');
    this.container.classList.add('select-options');

    this.list = document.createElement('ul');
    this.container.appendChild(this.list);
    this.list.classList.add('sortable-list');

    this.options = [];

    this.dragged_item = null;
    edit.addEventListener('click', (event) => {
      if (view_only) { return; }
      this.container.classList.toggle('show')
    });
    this.callback = callback;

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.custom-select')) {
        if (this.container.classList.contains('show')) {
          this.container.classList.remove('show');
        }
      }
    });
  }

  reset = () => {
    while (this.list.firstChild) {
      this.list.removeChild(this.list.lastChild);
    }
    this.options = [];
  }

  add_option = (option_html, reference) => {
    const option = document.createElement('li');
    option.draggable = true;
    this.list.appendChild(option);
    option.appendChild(option_html);
    this.options.push(option);
    option.reference = reference;

    option.addEventListener('dragstart', this.handle_drag_start);
    option.addEventListener('dragover', this.handle_drag_over);
    option.addEventListener('dragenter', this.handle_drag_enter);
    option.addEventListener('dragleave', this.handle_drag_leave);
    option.addEventListener('dragend', this.handle_drag_end);
    option.addEventListener('drop', this.handle_drop);
  }

  handle_drag_start = (event) => {
    console.log(event);
    console.log(event.target);
    this.dragged_item = event.target; // TODO get the item from event.
    this.dragged_item.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', this.innerHTML);
  }

  handle_drag_enter = (event) => {
    event.target.classList.add('over');
  }

  handle_drag_leave = (event) => {
    event.target.classList.remove('over');
  }

  handle_drag_end = (event) => {
    event.target.classList.remove('dragging');
  }

  handle_drag_over = (event) => {
    event.preventDefault();
  }

  handle_drop = (event) => {
    event.stopPropagation();
    console.log(event.target);
    console.log(this.dragged_item);
    console.log(this.dragged_item.reference);
    const original_order = Array.from(this.list.children).map((li) => li.reference);
    var target = event.target;
    while (!(target.nodeType === 1 && target.tagName === 'LI')) {
      target = target.parentNode;
    }
    if (this.dragged_item !== target) {
      const dragged_index = Array.from(this.list.children).indexOf(this.dragged_item);
      const drop_index = Array.from(this.list.children).indexOf(target);

      if (dragged_index < drop_index) {
        this.list.insertBefore(this.dragged_item, target.nextSibling);
      } else {
        this.list.insertBefore(this.dragged_item, target);
      }
    }
    target.classList.remove('over');
    this.callback(Array.from(this.list.children).map((li) => li.reference), original_order, this.dragged_item.reference);
    // next_visit.innerHTML = Array.from(list.querySelectorAll('li'))[0].innerHTML;
  }


  /*
    const list = document.createElement('ul');
    edges_div.appendChild(list);
    list.id = 'sortable-list';

    const options = [];
    for (var i = 1; i < 4; i += 1) {
      const op = document.createElement('li');
      op.draggable = true;
      list.appendChild(op);
      op.innerHTML = `Optie ${i}`;
      options.push(op);
    }

    this.table = document.createElement('table');
    for (const css_class of css_classes) {
      this.table.classList.add(css_class);
    }
    this.options = [];
    this.rows = [];
    this.row_cells = [];
  }
 */
}


class HTMLConstructor {
  constructor() {
  }
}

get_rgb = (color) => {
  let [r, g, b] = color.replace('rgb(', '').replace(')', '').split(',').map(str => Number(str));
  return { r, g, b }
}

interpolate_color = (color1, color2, value) => {
  const rgb1 = get_rgb(color1), rgb2 = get_rgb(color2);
  const colorVal = (prop) => Math.round(rgb1[prop] * (1 - value) + rgb2[prop] * value);
  return { r: colorVal('r'), g: colorVal('g'), b: colorVal('b') }
}

add_collapsible = (from, to, max_height, ease_duration=0.5) => {
  from.style = 'cursor: pointer;'
  to.style = `max-height: ${max_height}; transition: max-height ${ease_duration}s ease-out; overflow-y: auto;`
  from.addEventListener('click', () => {
    if (to.style.maxHeight !== '0px') {
      to.style.maxHeight = '0px';
    } else {
      to.style.maxHeight = max_height;
    }
  });
}