const fs = require('fs');

let appJs = fs.readFileSync('public/app.js', 'utf8');
appJs = appJs.replace('const res = await fetch(`${API_BASE}/admin/announcements`);', 'const res = await fetch(`${API_BASE}/announcements`);');
fs.writeFileSync('public/app.js', appJs);
console.log('Fixed announcements API call');
