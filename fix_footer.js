const fs = require('fs');

let content = fs.readFileSync('public/index.html', 'utf8');

const bad_chunk = `                    <div class="footer-language-row" id="lang-toggle-btn" style="cursor: pointer; padding: 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
                        <span class="lang-arabic" id="lang-toggle-text">عربي / Arabic</span>
                        <div id="google_translate_element"></div>
                    </div>

                                <div class="uae-green-stripe"></div>
                                <div class="uae-white-stripe"></div>
                                <div class="uae-black-stripe"></div>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down lang-chevron"></i>
                    </div>`;

const good_chunk = `                    <div class="footer-language-row" id="lang-toggle-btn" style="cursor: pointer; padding: 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
                        <span class="lang-arabic" id="lang-toggle-text">عربي / Arabic</span>
                        <div id="google_translate_element"></div>
                        <div class="flag-container">
                            <div class="uae-flag-box">
                                <div class="uae-red-stripe"></div>
                                <div class="uae-green-stripe"></div>
                                <div class="uae-white-stripe"></div>
                                <div class="uae-black-stripe"></div>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down lang-chevron"></i>
                    </div>`;

if (content.includes(bad_chunk)) {
    content = content.replace(bad_chunk, good_chunk);
    fs.writeFileSync('public/index.html', content, 'utf8');
    console.log("Fixed!");
} else {
    console.log("Could not find bad chunk");
}
