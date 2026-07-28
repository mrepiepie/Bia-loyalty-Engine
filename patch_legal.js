const fs = require('fs');

let index = fs.readFileSync('public/index.html', 'utf8');

const legalModal = `
    <!-- Legal Information Modal -->
    <div id="legal-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(10, 11, 14, 0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 25000; align-items: center; justify-content: center;">
        <div class="card glassmorphic spotlight-card" style="max-width: 600px; width: 90%; padding: 2.25rem; border: 1px solid rgba(223, 177, 91, 0.15); border-radius: 16px; position: relative; background: #0c0d12; box-shadow: 0 20px 50px rgba(0,0,0,0.6); max-height: 85vh; display: flex; flex-direction: column;">
            <button onclick="document.getElementById('legal-modal').style.display='none'" style="position: absolute; top: 1.25rem; right: 1.25rem; background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 1.25rem; transition: color 0.15s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.4)'">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <h3 id="legal-title" style="margin-top: 0; color: #EFECE3; font-family: 'DM Serif Display', serif; font-size: 1.75rem; margin-bottom: 1rem;"><i class="fa-solid fa-scale-balanced" style="color: #dfb15b; font-size: 1.3rem; margin-right: 0.5rem;"></i> Legal</h3>
            <div id="legal-content" style="flex: 1; overflow-y: auto; color: rgba(255,255,255,0.65); line-height: 1.6; font-size: 0.95rem; padding-right: 0.5rem; scrollbar-width: thin; scrollbar-color: rgba(223,177,91,0.2) transparent;">
            </div>
            <div style="margin-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; padding-top: 1rem;">
                <button onclick="document.getElementById('legal-modal').style.display='none'" class="btn btn-primary" style="width: 100%; justify-content: center;">I Understand & Agree</button>
            </div>
        </div>
    </div>
`;

// Insert before the last body tag if not exists
if (!index.includes('legal-modal')) {
    index = index.replace('</body>', legalModal + '\\n</body>');
}

// Replace footer links
index = index.replace('<a href="#">Terms of Use</a>', \`<a href="#" onclick="showLegal('terms'); return false;">Terms of Use</a>\`);
index = index.replace('<a href="#">Privacy Policy</a>', \`<a href="#" onclick="showLegal('privacy'); return false;">Privacy Policy</a>\`);

fs.writeFileSync('public/index.html', index, 'utf8');


let app = fs.readFileSync('public/app.js', 'utf8');

const legalJs = \`
// ----------------------------------------------------
// LEGAL MODALS (TERMS & PRIVACY)
// ----------------------------------------------------
window.showLegal = function(type) {
    const modal = document.getElementById('legal-modal');
    const title = document.getElementById('legal-title');
    const content = document.getElementById('legal-content');
    
    if (!modal || !title || !content) return;
    
    if (type === 'terms') {
        title.innerHTML = '<i class="fa-solid fa-scale-balanced" style="color: #dfb15b; font-size: 1.3rem; margin-right: 0.5rem;"></i> Terms of Use';
        content.innerHTML = \\\`
            <p>Welcome to the Bradford International Alliance (BIA) Loyalty Engine. By accessing our platform, you agree to these core terms:</p>
            <ol style="padding-left: 1.25rem; margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                <li><strong>Account Eligibility:</strong> This platform is strictly restricted to enrolled BIA students in good academic standing.</li>
                <li><strong>Earning Points:</strong> Points are awarded for verified academic milestones, seminar attendance, and approved peer referrals. Any manipulation or abuse of the points system will result in permanent account suspension.</li>
                <li><strong>Voucher Redemption:</strong> Loyalty points have no cash value. They can only be redeemed for approved BIA tuition fee vouchers or partner network rewards via the portal.</li>
                <li><strong>Program Modifications:</strong> Bradford International Alliance reserves the right to modify point allocation values, reward tiers, and program rules at any time without prior notice.</li>
            </ol>
            <p style="margin-top: 1rem;">For detailed academic regulations, please refer to the official BIA Student Handbook.</p>
        \\\`;
    } else {
        title.innerHTML = '<i class="fa-solid fa-shield-halved" style="color: #dfb15b; font-size: 1.3rem; margin-right: 0.5rem;"></i> Privacy Policy';
        content.innerHTML = \\\`
            <p>Bradford International Alliance is committed to protecting your privacy and educational data.</p>
            <ol style="padding-left: 1.25rem; margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                <li><strong>Data Collection:</strong> We collect your academic performance metrics, physical check-in attendance records, and login activity solely for the purpose of operating the Loyalty Engine securely.</li>
                <li><strong>Data Usage:</strong> Your data is used exclusively to calculate your loyalty points, generate tuition vouchers, and personalize your higher educational journey.</li>
                <li><strong>Third-Party Sharing:</strong> BIA does not sell your personal data. Limited academic milestone information may be securely shared with the EduAbroad university network only if you explicitly opt-in for university placement services.</li>
                <li><strong>Security Infrastructure:</strong> All platform data is encrypted using industry-standard protocols. Administrative access is strictly logged and audited in real-time.</li>
            </ol>
            <p style="margin-top: 1rem;">If you have any privacy concerns, please contact the BIA Administration Office.</p>
        \\\`;
    }
    
    modal.style.display = 'flex';
    
    if (window.gsap) {
        gsap.fromTo(modal.querySelector('.card'), 
            { y: 20, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.2)" }
        );
    }
};
\`;

if (!app.includes('window.showLegal')) {
    app += '\\n' + legalJs;
    fs.writeFileSync('public/app.js', app, 'utf8');
}

console.log('Legal modals added');
