const fs = require('fs');

// Patch app.js to hide maintenance settings from rules form
let appJs = fs.readFileSync('public/app.js', 'utf8');

const oldRenderLoop = `        data.forEach(s => {
            const limit = CLIENT_SETTINGS_LIMITS[s.key];`;
const newRenderLoop = `        data.forEach(s => {
            if (s.key === 'maintenance_mode' || s.key === 'maintenance_end_time') return; // Hide internal system variables
            const limit = CLIENT_SETTINGS_LIMITS[s.key];`;

appJs = appJs.replace(oldRenderLoop, newRenderLoop);
fs.writeFileSync('public/app.js', appJs, 'utf8');
console.log('Patched app.js to hide maintenance fields');
