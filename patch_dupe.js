const fs = require('fs');

// Patch app.js to hide maintenance rules from the Database UI form
let appJs = fs.readFileSync('public/app.js', 'utf8');
appJs = appJs.replace(
    /container\.innerHTML = '';\s*data\.forEach\(s => {/g,
    `container.innerHTML = '';
        data.forEach(s => {
            if (s.key === "maintenance_mode" || s.key === "maintenance_end_time" || s.key === "welcome_points") return;`
);
fs.writeFileSync('public/app.js', appJs);

// Patch server.js to remove welcome_points from default seeds
let serverJs = fs.readFileSync('server.js', 'utf8');
serverJs = serverJs.replace(
    /\['welcome_points', '200', 'Points awarded to a newly enrolled student'\]\n\s*\];/g,
    '] /* removed duplicate welcome_points */ ;'
);
serverJs = serverJs.replace(
    /,\n\s*\['welcome_points', '200', 'Points awarded to a newly enrolled student'\]/g,
    ''
);
fs.writeFileSync('server.js', serverJs);

// Bump Cache
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace(/app\.js\?v=1\.3\.[0-9]+/g, 'app.js?v=1.3.16');
fs.writeFileSync('public/index.html', html, 'utf8');

console.log('Patch complete.');
