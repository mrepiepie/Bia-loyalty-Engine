const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

const regex = /\.partner-grid-item\s*\{\s*position:\s*relative;\s*height:\s*260px;\s*\/\*\s*Small\s*preview\s*size\s*\*\/\s*width:\s*100%;\s*\}/g;

const replacement = `.partner-grid-item {
                        position: relative;
                        height: 260px; /* Small preview size */
                        width: 100%;
                        z-index: 1;
                    }
                    /* THIS FIXES THE OVERLAP GLITCH! Brings parent wrapper to front on hover */
                    .partner-grid-item:hover {
                        z-index: 1000;
                    }`;

if (appJs.match(regex)) {
    appJs = appJs.replace(regex, replacement);
    fs.writeFileSync('public/app.js', appJs);
    console.log('Fixed CSS z-index stacking context for popout cards!');
} else {
    console.log('Regex failed to match. Check app.js for exact spacing.');
}
