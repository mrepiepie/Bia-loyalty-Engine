const fs = require('fs');

// Patch app.js
let app = fs.readFileSync('public/app.js', 'utf8');
app = app.replace(
    'data.forEach(s => {',
    'data.forEach(s => {\n            if (s.key === "maintenance_mode" || s.key === "maintenance_end_time" || s.key === "welcome_points") return;'
);
fs.writeFileSync('public/app.js', app, 'utf8');

// Patch server.js
let server = fs.readFileSync('server.js', 'utf8');
server = server.replace(
    'const welcomePoints = parseInt(settings.welcome_points) || 200;',
    'const welcomePoints = parseInt(settings.new_joiner_points) || 200;'
);
fs.writeFileSync('server.js', server, 'utf8');

console.log('Patched app.js and server.js');
