fetch('https://sfltrade.asaphgabrielsousa.workers.dev/?url=https://httpbin.org/headers', {
  headers: {
    'x-api-key': 'test-key',
    'Authorization': 'Bearer token',
    'Origin': 'https://asaphgabriel.github.io'
  }
}).then(r => r.text()).then(text => console.log(text)).catch(e => console.error(e));
