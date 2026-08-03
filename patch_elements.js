const fs = require('fs');

let c = fs.readFileSync('public/app.js', 'utf8');

c = c.replace(/document\.getElementById\('btn-simulate-lms'\)\.addEventListener/g, 'const btnSim = document.getElementById(\'btn-simulate-lms\');\nif (btnSim) btnSim.addEventListener');

c = c.replace(/document\.getElementById\('btn-trigger-cron'\)\.addEventListener/g, 'const btnCron = document.getElementById(\'btn-trigger-cron\');\nif (btnCron) btnCron.addEventListener');

fs.writeFileSync('public/app.js', c);
console.log('Successfully patched missing elements!');
