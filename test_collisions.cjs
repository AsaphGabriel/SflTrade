const https = require('https');
https.get('https://sfl.world/api/v1/nfts', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    let data = JSON.parse(body);
    let ids = {};
    let collisions = [];
    data.collectibles.forEach(c => {
        ids[c.id] = {name: c.name, type: 'col'};
    });
    data.wearables.forEach(w => {
        if (ids[w.id]) {
            collisions.push(`ID ${w.id} -> Collectible: ${ids[w.id].name} | Wearable: ${w.name}`);
        }
    });
    console.log(`Found ${collisions.length} collisions!`);
    console.log(collisions.slice(0, 10));
  });
});
