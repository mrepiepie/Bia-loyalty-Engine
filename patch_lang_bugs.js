const fs = require('fs');

// Fix index.html FOUC
let index = fs.readFileSync('public/index.html', 'utf8');

const headScript = `
    <!-- FOUC Prevention for Arabic Translation -->
    <script>
        (function() {
            const savedLang = localStorage.getItem('bia-lang');
            if (savedLang === 'ar') {
                document.cookie = 'googtrans=/en/ar; path=/';
                document.cookie = 'googtrans=/en/ar; domain=' + window.location.hostname + '; path=/';
                document.documentElement.lang = 'ar';
                document.documentElement.dir = 'rtl';
                document.write('<style id="fouc-style">body { opacity: 0 !important; }</style>');
                
                // Remove the opacity block once translated, or after 1.5s max
                const checkTranslation = setInterval(() => {
                    if (document.documentElement.classList.contains('translated-rtl') || document.documentElement.classList.contains('translated-ltr')) {
                        clearInterval(checkTranslation);
                        const s = document.getElementById('fouc-style');
                        if (s) s.remove();
                        document.body.style.opacity = '1';
                    }
                }, 50);
                
                setTimeout(() => {
                    clearInterval(checkTranslation);
                    const s = document.getElementById('fouc-style');
                    if (s) s.remove();
                    if(document.body) document.body.style.opacity = '1';
                }, 1500);
            } else {
                // Ensure English is clean
                document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
                document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + window.location.hostname + '; path=/';
            }
        })();
    </script>
    <!-- Google Translate Script -->
`;

index = index.replace('<!-- Google Translate Script -->', headScript.trim());
fs.writeFileSync('public/index.html', index, 'utf8');


// Fix app.js toggleLanguage
let app = fs.readFileSync('public/app.js', 'utf8');

const newToggle = `function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    localStorage.setItem('bia-lang', currentLang);
    
    if (currentLang === 'ar') {
        document.cookie = 'googtrans=/en/ar; path=/';
        document.cookie = 'googtrans=/en/ar; domain=' + window.location.hostname + '; path=/';
        const combo = document.querySelector('.goog-te-combo');
        if (combo) {
            combo.value = 'ar';
            combo.dispatchEvent(new Event('change'));
            updateLangUI();
        } else {
            window.location.reload();
        }
    } else {
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + window.location.hostname + '; path=/';
        window.location.reload();
    }
}`;

app = app.replace(/function toggleLanguage\(\) \{[\s\S]*?updateLangUI\(\);\s*\}/, newToggle);

fs.writeFileSync('public/app.js', app, 'utf8');
console.log('Fixed FOUC and Toggle');
