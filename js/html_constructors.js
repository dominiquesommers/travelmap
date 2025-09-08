
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
    this.context_menu.style = 'position: fixed; z-index: 10000; user-select: none; display: none; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);';
    this.mark_as_paid_button = document.createElement('button');
    this.context_menu.appendChild(this.mark_as_paid_button);
    this.is_paid = paid;
    this.mark_as_paid_button.innerHTML = this.is_paid ? 'Mark as <b>unpaid</b>' : 'Mark as <b>paid</b>';
    this.mark_as_paid_button.classList.add('mark-as-paid');
    this.span = document.createElement('span');
    this.estimated_cost = new HTMLNumber(undefined,css_classes, (value) => change_callback(value, 'estimated'), view_only);
    this.estimated_cost_sup = document.createElement('sup');
    this.estimated_cost_sup.innerHTML = '(est.)';
    this.estimated_cost_sup.style = 'user-select: none; cursor: text;';
    this.estimated_cost_sup.classList.add('hidden', 'opacity-50');
    this.actual_cost = new HTMLNumber(undefined,css_classes, (value) => change_callback(value, 'actual'), view_only);
    this.actual_cost.span.style = 'margin-left: 2px; cursor: pointer;';
    this.actual_cost.span.classList.add('hidden');
    this.actual_cost_sup = document.createElement('sup');
    this.actual_cost_sup.innerHTML = '✔';
    this.actual_cost_sup.style = 'user-select: none; cursor: text;';
    this.actual_cost_sup.classList.add('hidden', 'text-green-600');
    this.span.appendChild(this.estimated_cost.span);
    this.span.appendChild(this.estimated_cost_sup);
    this.span.appendChild(this.actual_cost.span);
    this.span.appendChild(this.actual_cost_sup);
    this.mark_as_paid_button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    this.span.addEventListener('contextmenu', (event) => {
      if (view_only) {
        return;
      }
      if (event instanceof PointerEvent) event.preventDefault();
      this.context_menu.style.display = 'block';
      this.mark_as_paid_button.innerHTML = this.is_paid ? 'Mark as <b>unpaid</b>' : 'Mark as <b>paid</b>';
      this.context_menu.style.top = `0px`;
      this.context_menu.style.left = `0px`;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = this.mark_as_paid_button.offsetWidth;
      const menuHeight = this.mark_as_paid_button.offsetHeight;
      const rect = this.span.getBoundingClientRect();
      let leftPosition = rect.left;
      let topPosition = rect.top + rect.height;
      if (topPosition + menuHeight > viewportHeight) {
        topPosition = viewportHeight - menuHeight - 5;
      }
      if (leftPosition + menuWidth > viewportWidth) {
        leftPosition = viewportWidth - menuWidth - 5;
      }
      this.context_menu.style.top = `${topPosition}px`;
      this.context_menu.style.left = `${leftPosition}px`;
    });

    const set_properties = () => {
      if (this.is_paid) {
        document.getElementById('floating-divs').appendChild(this.context_menu);
        this.estimated_cost.span.classList.add('line-through', 'opacity-50');
        this.estimated_cost_sup.classList.remove('hidden');
        this.actual_cost.span.classList.remove('hidden');
        this.actual_cost_sup.classList.remove('hidden');
      } else {
        if (document.getElementById('floating-divs').contains(this.context_menu)) {
          document.getElementById('floating-divs').removeChild(this.context_menu);
        }
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
  constructor(value=undefined, css_classes=[], change_callback=(value)=>{}, view_only=false, on_open=()=>{}) {
    this.value = value;
    this.span = document.createElement('span');
    if (value !== undefined) {
      this.span.innerHTML = Number(value);
    }
    this.span.inputMode = 'numeric';
    this.span.style.userSelect = 'text';
    this.span.style.cursor = 'pointer';
    this.span.style.padding = '0px 3px';
    css_classes?.forEach(css_class => this.span.classList.add(css_class));
    this.on_open = on_open;
    this.change_callback = change_callback;

    this.span.addEventListener('keypress', (event) => {
	    if (isNaN(String.fromCharCode(event.which)) || event.code === 'Space') event.preventDefault();
      if (event.key === 'Enter') {
        this.span.contentEditable = false;
        event.preventDefault();
        this.on_enter();
      }
    });

    this.double_click = (event) => {
      if (this.span.contentEditable === 'true') {
        return;
      }
      this.on_open();
      this.span.style.userSelect = 'text';
      this.span.style.cursor = 'text';
      event.preventDefault();
      event.stopPropagation();
      if (view_only) { return; }
      this.span.contentEditable = true;
      this.span.focus();
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(this.span);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    this.span.addEventListener('dblclick', (event) => {
      this.double_click(event);
    });

    this.add_blur();

    ['copy', 'cut', 'paste'].forEach((event) => {
      this.span.addEventListener(event, () => { return false; })
    })
  }

  add_blur() {
    this.span.addEventListener('blur', (event) => {
      this.saveAndCloseEditor();
    });
  }

  on_enter() {}

  saveAndCloseEditor() {
    this.span.innerHTML = Number(this.span.innerHTML);
    this.span.contentEditable = false;
    this.span.style.userSelect = 'none';
    this.span.style.cursor = 'pointer';
    if (Number(this.value) !== Number(this.span.innerHTML)) {
      const old_value = (this.value === undefined) ? undefined : Number(this.value);
      this.change_callback(Number(this.span.innerHTML), old_value);
      this.value = Number(this.span.innerHTML);
    }
  }
}


class ClickableCell {
  constructor(cell, css_classes=[], on_open=()=>{}, on_close=()=>{}, view_only=false) {
    cell.style.cursor = 'pointer';
    this.context_menu = document.createElement('div');
    css_classes?.forEach(css_class => this.context_menu.classList.add(css_class));
    this.context_menu.style = 'position: fixed; z-index: 10000; user-select: none; max-width: 200px;';
    this.context_menu.classList.add("hidden", "bg-grey", //"bg-lightgrey",
        "border", "border-gray-200", "rounded-lg", "shadow-xl");

    const update_menu_position = () => {
      if (this.context_menu.classList.contains('hidden')) {
        return;
      }
      this.context_menu.style.top = `0px`;
      this.context_menu.style.left = `0px`;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = this.context_menu.offsetWidth;
      const menuHeight = this.context_menu.offsetHeight;
      const rect = cell.getBoundingClientRect();
      let leftPosition = rect.left + (rect.width / 4);
      // let topPosition = rect.top - 4; // + rect.height;
      let topPosition = rect.top + (rect.height / 4);
      if (topPosition + menuHeight > viewportHeight) {
        topPosition = viewportHeight - menuHeight - 5;
      }
      if (leftPosition + menuWidth > viewportWidth) {
        leftPosition = viewportWidth - menuWidth - 5;
      }
      this.context_menu.style.top = `${topPosition}px`;
      this.context_menu.style.left = `${leftPosition}px`;
    }

    cell.addEventListener(('ontouchstart' in window) ? 'touchend' : 'click', (event) => {
      event.preventDefault();
      document.getElementById('floating-divs').appendChild(this.context_menu);
      this.context_menu.classList.remove('hidden');
      on_open();
      update_menu_position();
    });

    this.context_menu.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    document.addEventListener(('ontouchstart' in window) ? 'touchend' : 'click', (event) => {
      event.preventDefault();
      if (!cell.contains(event.target) && !this.context_menu.contains(event.target)) {
        if (document.getElementById('floating-divs').contains(this.context_menu)) {
          document.getElementById('floating-divs').removeChild(this.context_menu);
          this.context_menu.classList.add('hidden');
          on_close();
        }
      }
      event.stopPropagation();
    });
  }
}


class HTMLText {
  constructor(inner='', css_classes=[], change_callback=()=>{}, sp='p', enter_enter=false,
              view_only=false, on_close=()=>{}) {
    this.span = document.createElement(sp);
    this.span.contentEditable = false;
    css_classes?.forEach(css_class => this.span.classList.add(css_class));
    this.span.style = 'width: 100%; white-space: initial; word-wrap: break-word; padding: 0px 2px 0px 0px;' // -webkit-user-select: none;'
    if (!view_only) {
      this.span.classList.add('pointer');
    }
    this.change_callback = change_callback;

    this.span.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' && (enter_enter || event.shiftKey)) {
        this.span.contentEditable = false;
        event.preventDefault();
      }
    });

    this.double_click = (event, select_all=false) => {
      if (this.span.contentEditable === 'true') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (view_only) { return; }
      this.span.contentEditable = true;
      this.span.style.cursor = 'text';
      if (document.activeElement !== this.span) {
        this.span.innerHTML = this.value;
      }
      this.span.focus();
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(this.span);
      if (!select_all) {
        range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }

    this.span.addEventListener('dblclick', (event) => {
      this.double_click(event);
    });

    this.span.addEventListener('blur', (event) => {
      this.span.contentEditable = false;
      this.span.style.cursor = 'pointer';
      if (this.value !== this.span.innerHTML) {
        this.change_callback(this.span.innerHTML, this.value);
      }
      this.process();
      on_close();
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
}


class HTMLDonableText extends HTMLText {
  constructor(inner = '', css_classes = [], change_callback = () => {}, sp = 'p', enter_enter = false, view_only = false) {
    super(inner, css_classes, change_callback, sp, enter_enter, view_only);
    this.span.addEventListener('contextmenu', (event) => {
      console.log('TODO implement mark as done button.');
      event.preventDefault();
      event.stopPropagation();
    });
  }
}


class HTMLSelectableText extends HTMLText {
  constructor(inner='', options=[], on_open=()=>{}, on_close=()=>{}, order_change_callback=()=>{}, select_callback=()=>{}, delete_option_callback=()=>{},
              disable_text_edit=false, css_classes=[], text_change_callback=()=>{}, sp='p', enter_enter=false, view_only=false) {
    super(inner, css_classes, text_change_callback, sp, enter_enter, Boolean(view_only | disable_text_edit));
    this.css_classes = css_classes;
    this.context_menu = document.createElement('div');
    // this.context_menu.style = 'position: fixed; z-index: 10000; user-select: none; display: none; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);';
    this.context_menu.style = 'position: fixed; z-index: 10000; user-select: none;';
    this.span.style['user-select'] = 'none';
    this.context_menu.classList.add("hidden", "bg-grey", "border", "border-gray-200", "rounded-lg", "shadow-xl");
    this.options = {};
    this.list = document.createElement('lu');
    this.list.classList.add("list-none");
    this.context_menu.appendChild(this.list);
    options.forEach(([id, v, el]) => {
      this.add_option(id, v, el);
    });
    this.animationFrameId = null;

    new Sortable(this.list, {
        animation: 150,
        ghostClass: 'bg-gray-300',
        onEnd: (evt) => {
          const draggedItem = evt.item;
          if (draggedItem) {
            const newValue = draggedItem.getAttribute('data-value');
            if (newValue) {
              console.log(`TODO: dragged ${newValue} ${draggedItem.textvalue}.`, this.options[newValue]);
              const newOrder = Array.from(this.list.children).map(item =>
                  [item.getAttribute('data-value'), item.textvalue, this.options[item.getAttribute('data-value')]]);
              console.log(`TODO: updated order ${newOrder}.`)
              order_change_callback([newValue, draggedItem.textvalue, this.options[newValue]], newOrder);
            }
          }
        }
    });

    const update_menu_position = () => {
      if (this.context_menu.classList.contains('hidden')) {
          if (this.animationFrameId) {
              cancelAnimationFrame(this.animationFrameId);
              this.animationFrameId = null;
          }
          return;
      }
      this.context_menu.style.top = `0px`;
      this.context_menu.style.left = `0px`;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = this.list.offsetWidth;
      const menuHeight = this.list.offsetHeight;
      const rect = this.span.getBoundingClientRect();
      let leftPosition = rect.left - 6;
      // let topPosition = rect.top - 4; // + rect.height;
      let topPosition = rect.top + rect.height;
      if (topPosition + menuHeight > viewportHeight) {
        topPosition = viewportHeight - menuHeight - 5;
      }
      if (leftPosition + menuWidth > viewportWidth) {
        leftPosition = viewportWidth - menuWidth - 5;
      }
      this.context_menu.style.top = `${topPosition}px`;
      this.context_menu.style.left = `${leftPosition}px`;

      this.animationFrameId = requestAnimationFrame(update_menu_position);
    }

    this.span.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      document.getElementById('floating-divs').appendChild(this.context_menu);
      this.context_menu.classList.remove('hidden');
      on_open();
      update_menu_position();

      const computedStyle = window.getComputedStyle(this.span);
      const propertiesToCopy = ['font-size', 'font-weight', 'color'];
      this.list.querySelectorAll('li').forEach(item => {
          const optionSpan = item.querySelector('span:not(.delete-btn)');
          if (optionSpan) {
              optionSpan.style.cssText = '';
              propertiesToCopy.forEach(prop => {
                  optionSpan.style[prop] = computedStyle.getPropertyValue(prop);
              });
          }
      });
    });

    this.context_menu.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    this.context_menu.addEventListener('click', (e) => {
      const clickedItem = e.target.closest('li');
      if (clickedItem) {
        const clicked_value = clickedItem.getAttribute('data-value');
        if (clicked_value) {
          if (e.target.getAttribute('data-action') === 'delete') {
            console.log('Delete', clicked_value, clickedItem.textvalue, this.options[clicked_value]);
            delete_option_callback([clicked_value, clickedItem.textvalue, this.options[clicked_value], clickedItem]);
            // clickedItem.remove();
            e.stopPropagation();
          } else {
            this.span.innerHTML = clickedItem.textvalue;
            this.value = clickedItem.textvalue;
            console.log('TODO: selected', clicked_value, clickedItem.textvalue, this.options[clicked_value]);
            select_callback([clicked_value, clickedItem.textvalue, this.options[clicked_value]]);
            if (document.getElementById('floating-divs').contains(this.context_menu)) {
              document.getElementById('floating-divs').removeChild(this.context_menu);
              this.context_menu.classList.add('hidden');
            }
          }
        }
        on_close();
      }
    });

    document.addEventListener('click', (e) => {
      if (!this.span.contains(e.target) && !this.context_menu.contains(e.target)) {
        if (document.getElementById('floating-divs').contains(this.context_menu)) {
          document.getElementById('floating-divs').removeChild(this.context_menu);
        }
        this.context_menu.classList.add('hidden');
        on_close();
      }
    });
  }

  reset = () => {
    while (this.list.firstChild) {
      this.list.removeChild(this.list.lastChild);
    }
    this.options = {};
  }

  add_option = (id, v, option_el=undefined) => {
    this.options[id] = (option_el !== undefined) ? option_el : v;
    const option = document.createElement('li');
    option.classList.add("menu-item", 'left-right-aligned');
    this.css_classes?.forEach(css_class => option.classList.add(css_class));

    option.dataset.value = id;
    option.textvalue = v;
    const option_span = document.createElement('span');
    option_span.classList.add('left-span');
    // option_span.style = window.getComputedStyle(this.span);
    option_span.innerHTML = v;
    option.appendChild(option_span);
    const option_delete = document.createElement('sub');
    option_delete.classList.add('pointer', 'right-span', 'delete-btn');
    option_delete.setAttribute('data-action', 'delete')
    option_delete.innerHTML = ' 🗑️';
    // option_delete.innerHTML = 'X';
    option.appendChild(option_delete);
    this.list.appendChild(option);
    return option_span;
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

  add_row = (css_classes=[], index=-1) => {
    // const row = document.createElement('tr');
    // console.log('inserting row in', index);
    const row = this.table_body.insertRow(index);
    for (const css_class of css_classes) {
      row.classList.add(css_class);
    }
    // this.table_body.appendChild(row);
    if (index === undefined || index === -1) {
      this.rows.push(row);
      this.row_cells.push([]);
    } else {
      this.rows.splice(index, 0, row);
      this.row_cells.splice(index, 0, []);
    }
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

  delete_row = (row_index) => {
    this.table_body.deleteRow(row_index);
    this.rows.splice(row_index, 1);
    this.row_cells.splice(row_index, 1);
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