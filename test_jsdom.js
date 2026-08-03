const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="app"></div><div id="login-overlay"></div></body></html>`, { runScripts: 'dangerously' });

try {
    const code = fs.readFileSync('public/app.js', 'utf8');
    dom.window.eval(code);
    console.log('JSDOM Execution OK');
} catch(e) {
    console.error('Execution Error:', e);
}
