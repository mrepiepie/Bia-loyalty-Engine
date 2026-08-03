const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public', 'images', 'logos');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const options = {
    headers: {
        'User-Agent': 'BiaLoyaltyApp/1.0 (contact@example.com)'
    }
};

const logos = [
    { name: 'adnoc.png', url: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/83/ADNOC_logo.svg/320px-ADNOC_logo.svg.png' },
    { name: 'visa.svg', url: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg' },
    { name: 'toyota.svg', url: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Toyota_carlogo.svg' },
    { name: 'ikea.svg', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Ikea_logo.svg' },
    { name: 'ebay.svg', url: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg' },
    { name: 'bose.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Bose_logo.svg/320px-Bose_logo.svg.png' },
    { name: 'hm.svg', url: 'https://upload.wikimedia.org/wikipedia/commons/5/53/H%26M-Logo.svg' },
    { name: 'landmark.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Landmark_Group_logo.svg/320px-Landmark_Group_logo.svg.png' }
];

logos.forEach(logo => {
    const dest = path.join(dir, logo.name);
    https.get(logo.url, options, (res) => {
        if (res.statusCode === 200) {
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded ${logo.name}`);
            });
        } else {
            console.error(`Failed to download ${logo.name}: ${res.statusCode}`);
        }
    }).on('error', (err) => {
        console.error(`Error downloading ${logo.name}: ${err.message}`);
    });
});
