
class Observable {
  constructor(value, setter=(value, old_value) => { return value; } ) {
    this._value = value;
    this._setter = setter;
    this._subscribers = new Set();
  }
  get value() {
    return this._value;
  }

  get subscribers() {
    return this._subscribers;
  }

  set value(new_value) {
    const old_value = this._value;
    // console.log(`Trying to set value to ${new_value} from ${old_value}`)
    try {
      this._value = this._setter(new_value, old_value);
      // console.log(`Checked and set value to ${new_value}, calling ${this._subscribers.size} callbacks.`)
      this._subscribers?.forEach((callback) => {
        // console.log(callback);
        // if (callb)
        callback(this._value, old_value);
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        // console.log(`${name}: ${message}`);
      } else {
        throw error;
      }
      // // TODO handle 'check errors' differently than actual/unexpected errors.
      // console.log(`${name}: ${message}`);
    }
  }

  subscribe = (callback) => {
    // console.log('Subscribinggggggggggggg');
    // console.log(callback);
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
