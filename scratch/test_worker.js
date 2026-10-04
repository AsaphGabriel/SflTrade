fetch('https://sfltrade.asaphgabrielsousa.workers.dev/?url=https://httpbin.org/headers', {
  headers: {
    'x-api-key': 'test-key',
    'Authorization': 'Bearer token'
  }
}).then(r => r.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(e => console.error(e));
