const fs = require('fs');

let index = fs.readFileSync('public/index.html', 'utf8');
let app = fs.readFileSync('public/app.js', 'utf8');

// Aggressive CSS to hide Google Translate widget and iframe
const newCss = `
    <!-- Google Translate Script -->
    <script type="text/javascript">
        function googleTranslateElementInit() {
            new google.translate.TranslateElement({pageLanguage: 'en', includedLanguages: 'ar,en', autoDisplay: false}, 'google_translate_element');
        }
    </script>
    <script type="text/javascript" src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
    <style>
        /* AGGRESSIVELY HIDE GOOGLE TRANSLATE BANNER */
        iframe.skiptranslate,
        .goog-te-banner-frame.skiptranslate, 
        .goog-te-gadget-icon,
        .goog-tooltip,
        .goog-tooltip:hover,
        .goog-text-highlight { 
            display: none !important; 
            box-shadow: none !important;
            background-color: transparent !important;
        }
        body { 
            top: 0px !important; 
            position: static !important;
        }
        #goog-gt-tt { display: none !important; }
        #google_translate_element { display: none !important; }

        /* Style for the language toggle to match user's image exactly */
        .footer-lang-button {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.2);
            background: transparent;
            color: #fff;
            font-family: inherit;
            font-size: 0.9rem;
            transition: all 0.2s ease;
        }
        .footer-lang-button:hover {
            background: rgba(255,255,255,0.1);
        }

        /* RTL Overrides when Arabic is active */
        html[lang="ar"] { direction: rtl; }
        html[lang="ar"] body { font-family: 'Cairo', 'Tajawal', sans-serif !important; }
        html[lang="ar"] .partnerships-layout-container { flex-direction: row-reverse; }
        html[lang="ar"] .landing-nav-links { flex-direction: row-reverse; }
        html[lang="ar"] .hero-stats { flex-direction: row-reverse; }
        html[lang="ar"] .footer-container { flex-direction: row-reverse; text-align: right; }
        html[lang="ar"] .footer-social-icons { justify-content: flex-start; }
    </style>
`;

index = index.replace(/<!-- Google Translate Script -->[\s\S]*?<\/style>/, newCss.trim());

// Restore the button structure exactly like the user's image
const oldBtn = /<div class="footer-language-row" id="lang-toggle-btn"[\s\S]*?<i class="fa-solid fa-chevron-down lang-chevron"><\/i>\s*<\/div>/;

const newBtn = `<div class="footer-language-row">
                        <button class="footer-lang-button" id="lang-toggle-btn">
                            <span class="lang-text" id="lang-toggle-text">English</span>
                            <div class="flag-container">
                                <div class="uae-flag-box">
                                    <div class="uae-red-stripe"></div>
                                    <div class="uae-green-stripe"></div>
                                    <div class="uae-white-stripe"></div>
                                    <div class="uae-black-stripe"></div>
                                </div>
                            </div>
                            <i class="fa-solid fa-chevron-down lang-chevron"></i>
                        </button>
                        <div id="google_translate_element"></div>
                    </div>`;

index = index.replace(oldBtn, newBtn);
fs.writeFileSync('public/index.html', index, 'utf8');

// Update app.js to reflect the new text toggles
app = app.replace(`if (textFooter) textFooter.innerText = 'عربي / Arabic';`, `if (textFooter) textFooter.innerText = 'English';`);
app = app.replace(`if (textFooter) textFooter.innerText = 'English';`, `if (textFooter) textFooter.innerText = 'عربي';`); // Swapped so English shows "English" and Arabic shows "Arabic" or "عربي"
app = app.replace(`if (textDash) textDash.innerText = 'عربي';`, `if (textDash) textDash.innerText = 'English';`);
app = app.replace(`if (textDash) textDash.innerText = 'English';`, `if (textDash) textDash.innerText = 'عربي';`); // Swap dash text too.
// Wait, the previous replacement might break if I just blindly replace them. Let me write a proper replacement for updateLangUI in app.js
const regexUpdateUI = /function updateLangUI\(\) \{[\s\S]*?\}/;
const newUpdateUI = `function updateLangUI() {
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
}`;
app = app.replace(regexUpdateUI, newUpdateUI);
fs.writeFileSync('public/app.js', app, 'utf8');

console.log('Fixed Google Translate UI and banner');
