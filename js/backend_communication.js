class Communication {
  constructor() {
    this.GCF_URL = 'https://travelmap-307804410649.europe-west1.run.app/';
  }

  add_url_search_params = (params, args) => {
    for (const [key, value] of Object.entries(args)) {
      if (Array.isArray(value)) {
          value.forEach(item => params.append(key, item));
      } else {
          params.append(key, value);
      }
    }
    return params;
  }

  call_google_function = async (http_method, backend_method, args, callback) => {
    let params = new URLSearchParams({
        backend_method: backend_method
    });
    let callback_data = {'status': 'Waiting'};
    try {
      let response;
      if (http_method === 'GET') {
        params = this.add_url_search_params(params, args);
        response = await fetch(`${this.GCF_URL}?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (http_method === 'POST') {
        response = await fetch(`${this.GCF_URL}?${params.toString()}`, {
            method: 'POST',
            headers: {  'Content-Type': 'application/json' },
            body: JSON.stringify(args)
        });
      }
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
      }
      callback_data = await response.json();
      callback_data['status'] = 'OK';
      console.log('GCF Response Data:', callback_data);
    } catch (error) {
      console.error('Error calling Google Cloud Function:', error);
      callback_data['status'] = 'NOT OK';
      callback_data['error'] = error;
    } finally {
      console.log(`--- ${http_method} Call to GCF Finished ---`);
      callback(callback_data);
    }
  }

  getCookie = (name) => { //get the csrf token.
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }


  fetch = (backend_method, args, callback) => {
    return
    fetch(backend_method, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': this.getCookie('csrftoken'), // Important for Django security
      },
      body: JSON.stringify({data: args}),
    })
    .then((response) => response.json())
    .then(callback
        // (data) => {
        // console.log('Response from server:', data);
        // var coords = data.message.geometry.coordinates;
        // console.log(coords);
      // }
    );
  };
}

const backend_communication = new Communication();