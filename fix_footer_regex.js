const fs = require('fs');

let content = fs.readFileSync('public/index.html', 'utf8');

const regex = /<div class="footer-language-row" id="lang-toggle-btn"[\s\S]*?<div class="uae-green-stripe"><\/div>/;

const replacement = `<div class="footer-language-row" id="lang-toggle-btn" style="cursor: pointer; padding: 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
                        <span class="lang-arabic" id="lang-toggle-text">عربي / Arabic</span>
                        <div id="google_translate_element"></div>
                        <div class="flag-container">
                            <div class="uae-flag-box">
                                <div class="uae-red-stripe"></div>
                                <div class="uae-green-stripe"></div>`;

if (content.match(regex)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('public/index.html', content, 'utf8');
    console.log("Fixed!");
} else {
    console.log("Could not find regex match");
}
