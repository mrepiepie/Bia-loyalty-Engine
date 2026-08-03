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

fs.writeFileSync('public/app.js', appJs);
console.log('Fixed broken logos for ADNOC and BOSE');
