import os

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

bad_chunk = """                    <div class="footer-language-row" id="lang-toggle-btn" style="cursor: pointer; padding: 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
                        <span class="lang-arabic" id="lang-toggle-text">عربي / Arabic</span>
                        <div id="google_translate_element"></div>
                    </div>

                                <div class="uae-green-stripe"></div>
                                <div class="uae-white-stripe"></div>
                                <div class="uae-black-stripe"></div>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down lang-chevron"></i>
                    </div>"""

good_chunk = """                    <div class="footer-language-row" id="lang-toggle-btn" style="cursor: pointer; padding: 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
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
                    </div>"""

if bad_chunk in content:
    content = content.replace(bad_chunk, good_chunk)
    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Could not find bad chunk")
