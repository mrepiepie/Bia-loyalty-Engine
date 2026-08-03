const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

// Replace the broken ADNOC logo with a reliable thumbnail PNG
appJs = appJs.replace(
    /https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/2\/23\/ADNOC_Logo\.svg/g,
    'https://upload.wikimedia.org/wikipedia/en/thumb/8/83/ADNOC_logo.svg/220px-ADNOC_logo.svg.png'
);

// Replace the broken BOSE logo with a reliable thumbnail PNG
appJs = appJs.replace(
    /https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/8\/87\/Bose_logo\.svg/g,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Bose_logo.svg/320px-Bose_logo.svg.png'
);

// Remove the logo caption (company name) entirely from the carousel items
appJs = appJs.replace(
    /item\.innerHTML = \`<div class="logo-slot-svg">\$\{logo\.svg\}<\/div><span class="logo-slot-name">\$\{logo\.name\}<\/span>\`;/g,
    'item.innerHTML = `<div class="logo-slot-svg" style="display:flex; justify-content:center; align-items:center; height:100%; width:100%;">${logo.svg}</div>`;'
);

// Also remove any existing gap inline styling for the slot if we don't have text anymore to center it perfectly
appJs = appJs.replace(
    /justify-content:center;gap:0\.5rem;/g,
    'justify-content:center;'
);

fs.writeFileSync('public/app.js', appJs);
console.log('Fixed broken logos and removed company name captions from carousel!');
