const fs = require('fs');

let app = fs.readFileSync('public/app.js', 'utf8');

// The broken code starts at `function updateLangUI()` and ends somewhere around `combo.value = targetLang;` or `triggerGoogleTranslate`.
// Let's just find the start of `function updateLangUI()` and replace from there to the end of the file.
// Since updateLangUI and triggerGoogleTranslate were appended to the very end of app.js, this is safe.

const startIndex = app.indexOf('function updateLangUI()');
if (startIndex !== -1) {
    app = app.substring(0, startIndex); // Delete everything from updateLangUI onwards
}

// Now append the correct version of both functions
const correctCode = `function updateLangUI() {
    const textFooter = document.getElementById('lang-toggle-text');
    const textDash = document.getElementById('dash-lang-text');
    
    if (currentLang === 'en') {
        if (textFooter) textFooter.innerText = 'English';
        if (textDash) textDash.innerText = 'English';
        document.documentElement.lang = 'en';
        document.body.classList.remove('rtl-mode');
    } else {
        if (textFooter) textFooter.innerText = 'عربي';
        if (textDash) textDash.innerText = 'عربي';
        document.documentElement.lang = 'ar';
        document.body.classList.add('rtl-mode');
    }
}

function triggerGoogleTranslate(targetLang) {
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
        combo.value = targetLang;
        combo.dispatchEvent(new Event('change'));
    }
}
`;

app = app + correctCode;

fs.writeFileSync('public/app.js', app, 'utf8');
console.log('Fixed app.js syntax');
