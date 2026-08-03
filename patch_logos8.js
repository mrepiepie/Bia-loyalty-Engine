const fs = require('fs');
const si = require('simple-icons');

async function run() {
    try {
        let appJs = fs.readFileSync('public/app.js', 'utf8');

        // Extract Simple Icons SVGs and apply brand colors
        // Make sure to escape any single quotes inside the SVG just in case!
        const visaSvg = si.siVisa.svg.replace('<svg ', '<svg fill="#1A1F71" width="70" height="70" ').replace(/'/g, "\\'");
        const toyotaSvg = si.siToyota.svg.replace('<svg ', '<svg fill="#EB0A1E" width="70" height="70" ').replace(/'/g, "\\'");
        const ikeaSvg = si.siIkea.svg.replace('<svg ', '<svg fill="#0051BA" width="70" height="70" ').replace(/'/g, "\\'");
        const ebaySvg = si.siEbay.svg.replace('<svg ', '<svg fill="#E53238" width="70" height="70" ').replace(/'/g, "\\'");
        const boseSvg = si.siBose.svg.replace('<svg ', '<svg fill="#FFFFFF" width="70" height="70" ').replace(/'/g, "\\'"); 
        const hmSvg = '<svg width="70" height="70" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#E50010"/><text x="50" y="65" fill="#fff" font-family="Arial" font-size="30" font-weight="bold" text-anchor="middle">H&amp;M</text></svg>';

        // Use Google Favicons for regional brands that lack open source SVGs
        const adnocFallback = "https://www.google.com/s2/favicons?domain=adnoc.ae&sz=128";
        const shukranFallback = "https://www.google.com/s2/favicons?domain=landmarkgroup.com&sz=128";

        const newAllLogos = [
            "const allLogos = [",
            "    {",
            "        name: 'ADNOC', id: 1,",
            "        svg: '<img src=\"" + adnocFallback + "\" alt=\"ADNOC\" style=\"width: 60px; height: 60px; object-fit: contain; border-radius: 50%;\" />'",
            "    },",
            "    {",
            "        name: 'VISA', id: 2,",
            "        svg: '" + visaSvg + "'",
            "    },",
            "    {",
            "        name: 'TOYOTA', id: 3,",
            "        svg: '" + toyotaSvg + "'",
            "    },",
            "    {",
            "        name: 'IKEA', id: 4,",
            "        svg: '" + ikeaSvg + "'",
            "    },",
            "    {",
            "        name: 'EBAY', id: 5,",
            "        svg: '" + ebaySvg + "'",
            "    },",
            "    {",
            "        name: 'BOSE', id: 6,",
            "        svg: '" + boseSvg + "'",
            "    },",
            "    {",
            "        name: 'H&M', id: 7,",
            "        svg: '" + hmSvg + "'",
            "    },",
            "    {",
            "        name: 'SHUKRAN', id: 8,",
            "        svg: '<img src=\"" + shukranFallback + "\" alt=\"Landmark Shukran\" style=\"width: 60px; height: 60px; object-fit: contain; border-radius: 8px;\" />'",
            "    }",
            "];"
        ].join("\n"); // FIXED THE NEWLINE!

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
