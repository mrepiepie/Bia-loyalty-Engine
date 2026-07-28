const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace('app.js?v=1.3.13', 'app.js?v=1.3.14');
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Bumped cache version to 1.3.14');
