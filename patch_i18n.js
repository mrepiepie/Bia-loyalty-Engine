const fs = require('fs');

let index = fs.readFileSync('public/index.html', 'utf8');
let app = fs.readFileSync('public/app.js', 'utf8');

// 1. Inject Google Translate script in index.html head
const gtScript = `
    <!-- Google Translate Script -->
    <script type="text/javascript">
        function googleTranslateElementInit() {
            new google.translate.TranslateElement({pageLanguage: 'en', includedLanguages: 'ar,en', autoDisplay: false}, 'google_translate_element');
        }
    </script>
    <script type="text/javascript" src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
    <style>
        /* Hide the default Google Translate widget */
        .goog-te-banner-frame.skiptranslate { display: none !important; }
        body { top: 0px !important; }
        #google_translate_element { display: none !important; }
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
if (!index.includes('google_translate_element')) {
    index = index.replace('</head>', gtScript + '\n</head>');
}

// 2. Add notranslate to admin dashboard
index = index.replace('id="admin-dashboard-section" class="dashboard-section"', 'id="admin-dashboard-section" class="dashboard-section notranslate"');

// 3. Add notranslate to points-balance
index = index.replace('<span class="points-count" id="points-balance">0</span>', '<span class="points-count notranslate" id="points-balance">0</span>');

// 4. Update the Footer language switcher to trigger translation
const langSwitcherTarget = `<div class="footer-language-row">
                        <span class="lang-arabic">S</span>`;
// Wait, the user image shows an Arabic word `عربي` in the footer.
// Let's replace the whole footer-language-row
const langSwitcherHTML = `
                    <div class="footer-language-row" id="lang-toggle-btn" style="cursor: pointer; padding: 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
                        <span class="lang-arabic" id="lang-toggle-text">عربي / Arabic</span>
                        <div id="google_translate_element"></div>
                    </div>
`;
// Let's just find the existing block.
index = index.replace(/<div class="footer-language-row">[\s\S]*?<\/div>/, langSwitcherHTML);

// 5. Add a language toggle to the student dashboard
const studentDashToggle = `
                          <div class="header-profile" onclick="toggleStudentDropdown()">
                              <img src="images/avatar_placeholder.jpg" alt="Profile" class="profile-avatar" id="student-avatar-img">
                              <span class="profile-name" id="student-name-display">Student</span>
                              <i class="fa-solid fa-chevron-down profile-dropdown-icon"></i>
                          </div>
                          <!-- Language Toggle Button -->
                          <div class="lang-toggle-dashboard" id="dash-lang-toggle" style="margin-left: 15px; cursor: pointer; background: rgba(255,255,255,0.1); padding: 5px 10px; border-radius: 8px; font-size: 0.8rem;">
                             <i class="fa-solid fa-globe"></i> <span id="dash-lang-text">عربي</span>
                          </div>
`;
index = index.replace(/<div class="header-profile" onclick="toggleStudentDropdown\(\)">[\s\S]*?<\/div>/, studentDashToggle);

fs.writeFileSync('public/index.html', index, 'utf8');

// App.js updates for Google Translate toggle
let appendJS = `
// ----------------------------------------------------
// LANGUAGE TRANSLATION ENGINE (GOOGLE TRANSLATE BINDING)
// ----------------------------------------------------
let currentLang = localStorage.getItem('bia-lang') || 'en';

window.addEventListener('load', () => {
    // Initial check for saved language
    setTimeout(() => {
        if (currentLang === 'ar') {
            triggerGoogleTranslate('ar');
        }
    }, 1000);

    const footerBtn = document.getElementById('lang-toggle-btn');
    if (footerBtn) {
        footerBtn.addEventListener('click', toggleLanguage);
    }
    
    const dashBtn = document.getElementById('dash-lang-toggle');
    if (dashBtn) {
        dashBtn.addEventListener('click', toggleLanguage);
    }
    
    updateLangUI();
});

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    localStorage.setItem('bia-lang', currentLang);
    triggerGoogleTranslate(currentLang);
    updateLangUI();
}

function updateLangUI() {
    const textFooter = document.getElementById('lang-toggle-text');
    const textDash = document.getElementById('dash-lang-text');
    
    if (currentLang === 'en') {
        if (textFooter) textFooter.innerText = 'عربي / Arabic';
        if (textDash) textDash.innerText = 'عربي';
        document.documentElement.lang = 'en';
        document.body.classList.remove('rtl-mode');
    } else {
        if (textFooter) textFooter.innerText = 'English';
        if (textDash) textDash.innerText = 'English';
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

if (!app.includes('LANGUAGE TRANSLATION ENGINE')) {
    app += appendJS;
}

// Add notranslate to feed points in app.js
app = app.replace(/<span class="feed-pts \$\{ev\.type\}">\$\{ev\.pts\}<\/span>/g, '<span class="feed-pts notranslate ${ev.type}">${ev.pts}</span>');
// Add notranslate to reward cards
app = app.replace(/<span class="reward-cost">\$\{r\.cost\} Points <span class="reward-cash">\(\$\{r\.cash\}\)<\/span><\/span>/g, '<span class="reward-cost notranslate">${r.cost} Points <span class="reward-cash">(${r.cash})</span></span>');

fs.writeFileSync('public/app.js', app, 'utf8');

console.log('Patched index.html and app.js');
