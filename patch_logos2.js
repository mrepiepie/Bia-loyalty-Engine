const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

// Match precisely up to the 'SHUKRAN' block to avoid greedy matching destroying the file
const regex = /const allLogos = \[\s*\{[\s\S]*?name:\s*'SHUKRAN'[\s\S]*?\}\s*\];/;

const newAllLogos = `const allLogos = [
        {
            name: 'ADNOC', id: 1,
            svg: \`<img src="https://upload.wikimedia.org/wikipedia/commons/2/23/ADNOC_Logo.svg" alt="ADNOC" style="width: 80px; height: auto; object-fit: contain;" />\`
        },
        {
            name: 'VISA', id: 2,
            svg: \`<img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="VISA" style="width: 90px; height: auto; object-fit: contain;" />\`
        },
        {
            name: 'TOYOTA', id: 3,
            svg: \`<img src="https://upload.wikimedia.org/wikipedia/commons/9/9d/Toyota_carlogo.svg" alt="TOYOTA" style="width: 80px; height: auto; object-fit: contain;" />\`
        },
        {
            name: 'IKEA', id: 4,
            svg: \`<img src="https://upload.wikimedia.org/wikipedia/commons/c/c5/Ikea_logo.svg" alt="IKEA" style="width: 90px; height: auto; object-fit: contain;" />\`
        },
        {
            name: 'EBAY', id: 5,
            svg: \`<img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg" alt="EBAY" style="width: 90px; height: auto; object-fit: contain;" />\`
        },
        {
            name: 'BOSE', id: 6,
            svg: \`<img src="https://upload.wikimedia.org/wikipedia/commons/8/87/Bose_logo.svg" alt="BOSE" style="width: 90px; height: auto; object-fit: contain;" />\`
        },
        {
            name: 'H&M', id: 7,
            svg: \`<img src="https://upload.wikimedia.org/wikipedia/commons/5/53/H%26M-Logo.svg" alt="H&M" style="width: 70px; height: auto; object-fit: contain;" />\`
        },
        {
            name: 'SHUKRAN', id: 8,
            svg: \`<img src="https://landmarkgroup.com/themes/custom/landmark/logo.svg" alt="Landmark Shukran" style="width: 90px; height: auto; object-fit: contain; filter: brightness(0) invert(1);" />\`
        }
    ];`;

if (regex.test(appJs)) {
    appJs = appJs.replace(regex, newAllLogos);
    fs.writeFileSync('public/app.js', appJs);
    console.log('SAFELY replaced generated SVGs with real brand logos from Wikimedia Commons!');
} else {
    console.log('Could not find allLogos array to replace (Regex failed).');
}
