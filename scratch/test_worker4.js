fetch('https://sfltrade.asaphgabrielsousa.workers.dev/?url=https://httpbin.org/headers', {
  headers: {
    'Origin': 'http://localhost:5173'
  }
}).then(r => r.text()).then(text => console.log(text)).catch(e => console.error(e));
