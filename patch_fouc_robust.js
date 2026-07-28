const fs = require('fs');
let index = fs.readFileSync('public/index.html', 'utf8');

const newFoucScript = `
    <!-- FOUC Prevention for Arabic Translation -->
    <script>
        (function() {
            const savedLang = localStorage.getItem('bia-lang');
            if (savedLang === 'ar') {
                window.isWaitingForTranslation = true;
                document.cookie = 'googtrans=/en/ar; path=/';
                document.cookie = 'googtrans=/en/ar; domain=' + window.location.hostname + '; path=/';
                document.documentElement.lang = 'ar';
                document.documentElement.dir = 'rtl';
                
                document.write('<style id="fouc-style">body { opacity: 0 !important; background-color: #0b0c10 !important; transition: opacity 0.4s ease; }</style>');
                
                let isRevealed = false;
                const reveal = () => {
                    if (isRevealed) return;
                    isRevealed = true;
                    const s = document.getElementById('fouc-style');
                    if (s) s.remove();
                    if (document.body) document.body.style.opacity = '1';
                    window.dispatchEvent(new Event('translationDone'));
                };

                // Hard failsafe in case Google Translate fails
                setTimeout(reveal, 2500);

                // Wait for body to be available to observe Google Translate mutations
                const waitForBody = setInterval(() => {
                    if (document.body) {
                        clearInterval(waitForBody);
                        
                        let mutTimer;
                        const observer = new MutationObserver(() => {
                            // Debounce DOM mutations by 150ms. 
                            // When mutations stop for 150ms, Google Translate is done traversing.
                            clearTimeout(mutTimer);
                            mutTimer = setTimeout(() => {
                                if (document.documentElement.classList.contains('translated-rtl') || document.documentElement.classList.contains('translated-ltr')) {
                                    observer.disconnect();
                                    reveal();
                                }
                            }, 150);
                        });
                        
                        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
                    }
                }, 10);
            } else {
                // Ensure English is clean
                document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
                document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + window.location.hostname + '; path=/';
            }
        })();
    </script>
`;

index = index.replace(/<!-- FOUC Prevention for Arabic Translation -->[\s\S]*?<\/script>/, newFoucScript.trim());
fs.writeFileSync('public/index.html', index, 'utf8');
console.log('Fixed FOUC timing vulnerability');
