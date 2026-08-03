const fs = require('fs');
const si = require('simple-icons');

async function run() {
    try {
        let appJs = fs.readFileSync('public/app.js', 'utf8');

        // Extract Simple Icons SVGs and apply brand colors
        const visaSvg = si.siVisa.svg.replace('<svg ', '<svg fill="#1A1F71" width="70" height="70" ');
        const toyotaSvg = si.siToyota.svg.replace('<svg ', '<svg fill="#EB0A1E" width="70" height="70" ');
        const ikeaSvg = si.siIkea.svg.replace('<svg ', '<svg fill="#0051BA" width="70" height="70" ');
        const ebaySvg = si.siEbay.svg.replace('<svg ', '<svg fill="#E53238" width="70" height="70" ');
        const boseSvg = si.siBose.svg.replace('<svg ', '<svg fill="#FFFFFF" width="70" height="70" '); 
        const hmSvg = '<svg width="70" height="70" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#E50010"/><text x="50" y="65" fill="#fff" font-family="Arial" font-size="30" font-weight="bold" text-anchor="middle">H&amp;M</text></svg>';

        // Use Google Favicons for regional brands that lack open source SVGs
        const adnocFallback = '<img src="https://www.google.com/s2/favicons?domain=adnoc.ae&sz=128" alt="ADNOC" style="width: 60px; height: 60px; object-fit: contain; border-radius: 50%;" />';
        const shukranFallback = '<img src="https://www.google.com/s2/favicons?domain=landmarkgroup.com&sz=128" alt="Landmark Shukran" style="width: 60px; height: 60px; object-fit: contain; border-radius: 8px;" />';

        // Use JSON.stringify to perfectly escape the strings so we NEVER have syntax errors!
        const newAllLogos = [
            "const allLogos = [",
            "    {",
            "        name: 'ADNOC', id: 1,",
            "        svg: " + JSON.stringify(adnocFallback),
            "    },",
            "    {",
            "        name: 'VISA', id: 2,",
            "        svg: " + JSON.stringify(visaSvg),
            "    },",
            "    {",
            "        name: 'TOYOTA', id: 3,",
            "        svg: " + JSON.stringify(toyotaSvg),
            "    },",
            "    {",
            "        name: 'IKEA', id: 4,",
            "        svg: " + JSON.stringify(ikeaSvg),
            "    },",
            "    {",
            "        name: 'EBAY', id: 5,",
            "        svg: " + JSON.stringify(ebaySvg),
            "    },",
            "    {",
            "        name: 'BOSE', id: 6,",
            "        svg: " + JSON.stringify(boseSvg),
            "    },",
            "    {",
            "        name: 'H&M', id: 7,",
            "        svg: " + JSON.stringify(hmSvg),
            "    },",
            "    {",
            "        name: 'SHUKRAN', id: 8,",
            "        svg: " + JSON.stringify(shukranFallback),
            "    }",
            "];"
        ].join("\n");

        const regex = /const allLogos = \[\s*\{[\s\S]*?name:\s*'SHUKRAN'[\s\S]*?\}\s*\];/;
        if (regex.test(appJs)) {
            appJs = appJs.replace(regex, newAllLogos);
            fs.writeFileSync('public/app.js', appJs);
            console.log('Successfully injected ultra high-quality SVGs directly into app.js!');
        } else {
            console.log('Regex failed.');
        }
    } catch (e) {
        console.error(e);
    }
}

run();
