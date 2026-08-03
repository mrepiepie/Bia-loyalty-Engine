const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

const regex = /const allLogos = \[\s*\{[\s\S]*?name:\s*'SHUKRAN'[\s\S]*?\}\s*\];/;

const newAllLogos = `const allLogos = [
        {
            name: 'ADNOC', id: 1,
            svg: \`<img src="https://logo.clearbit.com/adnoc.ae" alt="ADNOC" style="width: 70px; height: 70px; object-fit: contain; border-radius: 50%;" onerror="this.src='https://ui-avatars.com/api/?name=ADNOC&background=0D8ABC&color=fff&rounded=true&bold=true'"/>\`
        },
        {
            name: 'VISA', id: 2,
            svg: \`<img src="https://logo.clearbit.com/visa.com" alt="VISA" style="width: 70px; height: 70px; object-fit: contain; border-radius: 8px;" onerror="this.src='https://ui-avatars.com/api/?name=VISA&background=1A1F71&color=fff&rounded=true&bold=true'"/>\`
        },
        {
            name: 'TOYOTA', id: 3,
            svg: \`<img src="https://logo.clearbit.com/toyota.com" alt="TOYOTA" style="width: 70px; height: 70px; object-fit: contain;" onerror="this.src='https://ui-avatars.com/api/?name=TOYOTA&background=EB0A1E&color=fff&rounded=true&bold=true'"/>\`
        },
        {
            name: 'IKEA', id: 4,
            svg: \`<img src="https://logo.clearbit.com/ikea.com" alt="IKEA" style="width: 70px; height: 70px; object-fit: contain;" onerror="this.src='https://ui-avatars.com/api/?name=IKEA&background=003399&color=FFCC00&rounded=true&bold=true'"/>\`
        },
        {
            name: 'EBAY', id: 5,
            svg: \`<img src="https://logo.clearbit.com/ebay.com" alt="EBAY" style="width: 70px; height: 70px; object-fit: contain;" onerror="this.src='https://ui-avatars.com/api/?name=EBAY&background=fff&color=E53238&rounded=true&bold=true'"/>\`
        },
        {
            name: 'BOSE', id: 6,
            svg: \`<img src="https://logo.clearbit.com/bose.com" alt="BOSE" style="width: 70px; height: 70px; object-fit: contain;" onerror="this.src='https://ui-avatars.com/api/?name=BOSE&background=000&color=fff&rounded=true&bold=true'"/>\`
        },
        {
            name: 'H&M', id: 7,
            svg: \`<img src="https://logo.clearbit.com/hm.com" alt="H&M" style="width: 70px; height: 70px; object-fit: contain; border-radius: 50%;" onerror="this.src='https://ui-avatars.com/api/?name=HM&background=E50010&color=fff&rounded=true&bold=true'"/>\`
        },
        {
            name: 'SHUKRAN', id: 8,
            svg: \`<img src="https://logo.clearbit.com/landmarkgroup.com" alt="Landmark Shukran" style="width: 70px; height: 70px; object-fit: contain; border-radius: 8px;" onerror="this.src='https://ui-avatars.com/api/?name=SHUKRAN&background=C8102E&color=FFD700&rounded=true&bold=true'"/>\`
        }
    ];`;

if (regex.test(appJs)) {
    appJs = appJs.replace(regex, newAllLogos);
    fs.writeFileSync('public/app.js', appJs);
    console.log('Replaced all logos with ultra-reliable Clearbit CDN links and fallbacks!');
} else {
    console.log('Regex failed.');
}
