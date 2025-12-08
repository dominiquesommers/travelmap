
class Observable {
  constructor(value, setter=(value, old_value) => { return value; } ) {
    this._value = value;
    this._old_value = undefined;
    this._setter = setter;
    this._subscribers = new Set();
    this._pause = false;
    this._value_set_while_paused = false;
  }
  get value() {
    return this._value;
  }

  pause = () => {
    this._pause = true;
    this._value_set_while_paused = false;
  }

  unpause = (perform_callback) => {
    this._pause = false;
    if (perform_callback && this._value_set_while_paused) {
      this._subscribers?.forEach((callback) => {
        callback(this._value, this._old_value);
      });
    }
    this._value_set_while_paused = false;
  }

  get subscribers() {
    return this._subscribers;
  }

  set value(new_value) {
    this._old_value = this._value;
    try {
      this._value = this._setter(new_value, this._old_value);
      if (this._pause) {
        this._value_set_while_paused = true;
      } else {
        this._subscribers?.forEach((callback) => {
          callback(this._value, this._old_value);
        });
      }
    } catch (error) {
      if (error instanceof ValidationError) {
      } else {
        throw error;
      }
      // // TODO handle 'check errors' differently than actual/unexpected errors.
      // console.log(`${name}: ${message}`);
    }
  }

  subscribe = (callback) => {
    this._subscribers.add(callback);
  }

  unsubscribe = (callback) => {
    this._subscribers.delete(callback);
  }
}


class ValidationError extends Error {
  constructor(message) {
    super(message); // (1)
    this.name = "ValidationError"; // (2)
  }
}
