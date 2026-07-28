const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

const escapeHtmlFunc = `function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

`;

appJs = escapeHtmlFunc + appJs;
fs.writeFileSync('public/app.js', appJs, 'utf8');
console.log('Added escapeHTML to app.js');
