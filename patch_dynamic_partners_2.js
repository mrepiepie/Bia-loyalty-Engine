const fs = require('fs');

// 1. Fix app.js
let appJs = fs.readFileSync('public/app.js', 'utf8');

// Fix scroll toggleActions so it doesn't vanish on scroll
appJs = appJs.replace(/toggleActions:\s*["']play reverse play reverse["']/g, 'toggleActions: "play none none none"');

// Rewrite loadDynamicPartners to fix the grid size, undefined rewards, and add GSAP hover
const newLoadDynamicPartners = `async function loadDynamicPartners() {
    try {
        const response = await fetch('/api/partners');
        const data = await response.json();
        appPartners = data;

        const grid = document.getElementById('landing-partners-grid');
        if (grid) {
            if (!data || data.length === 0) {
                grid.innerHTML = '<div style="text-align: center; color: var(--text-muted); grid-column: 1 / -1; padding: 2rem;">No partners available at the moment.</div>';
                return;
            }
            grid.innerHTML = data.map((partner, i) => \`
                <div class="card spotlight-card glassmorphic partner-grid-card" id="partner-card-\${i}" style="display:flex; flex-direction:column; padding:2rem; gap:1.5rem; transition: border-color 0.3s; cursor: pointer;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <img src="\${partner.image}" alt="\${partner.name}" style="height:50px; border-radius:8px; object-fit:contain; background:\${partner.logoColor || 'rgba(255,255,255,0.1)'}; padding:4px;">
                        <span class="section-badge badge-blue" style="font-size:0.75rem;">\${partner.badge || 'PARTNER'}</span>
                    </div>
                    <div>
                        <h4 style="margin-bottom:0.5rem; font-size:1.3rem;">\${partner.title}</h4>
                        <p style="font-size:0.95rem; color:var(--text-muted); line-height: 1.5;">\${partner.subtitle}</p>
                    </div>
                    <div style="margin-top:auto; display:flex; flex-direction:column; gap:0.5rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:1.5rem;">
                        <strong style="font-size:0.9rem; color:#dfb15b;">Available Rewards</strong>
                        \${(partner.rewards || []).map(r => {
                            const name = r.tier || r.name || 'Reward';
                            const pts = r.points || r.cost || 0;
                            return \`
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:0.75rem; border-radius:6px;">
                                <span style="font-size:0.9rem; font-weight: 500;">\${name}</span>
                                <span style="font-size:0.9rem; color:var(--text-emerald); font-weight: 600;">\${pts} pts</span>
                            </div>
                            \`;
                        }).join('')}
                    </div>
                </div>
            \`).join('');

            // Apply GSAP hover animations
            document.querySelectorAll('.partner-grid-card').forEach(card => {
                card.addEventListener('mouseenter', () => {
                    gsap.to(card, { 
                        scale: 1.05, 
                        z: 50,
                        boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                        borderColor: "rgba(255,255,255,0.3)",
                        duration: 0.4, 
                        ease: "power3.out" 
                    });
                });
                card.addEventListener('mouseleave', () => {
                    gsap.to(card, { 
                        scale: 1, 
                        z: 0,
                        boxShadow: "0 0 0 rgba(0,0,0,0)",
                        borderColor: "rgba(255,255,255,0.05)",
                        duration: 0.4, 
                        ease: "power3.out" 
                    });
                });
            });
        }

        const container = document.getElementById('dynamic-partnerships-container');
        if (container) {
            container.innerHTML = '';
        }

    } catch (error) {
        console.error('Failed to load dynamic partners:', error);
    }
}`;

appJs = appJs.replace(/async function loadDynamicPartners\(\) \{[\s\S]*?(?=\nasync function|\nfunction|\n\/\/)/, newLoadDynamicPartners + "\n\n");
fs.writeFileSync('public/app.js', appJs);


// 2. Fix index.html grid size
let indexHtml = fs.readFileSync('public/index.html', 'utf8');
indexHtml = indexHtml.replace(/grid-template-columns: repeat\(auto-fill, minmax\(300px, 1fr\)\)/g, 'grid-template-columns: repeat(auto-fit, minmax(380px, 1fr))');
// Optional: If 'reveal-on-scroll' is still buggy for the whole section, just rely on the new GSAP fix in app.js
fs.writeFileSync('public/index.html', indexHtml);

console.log('Applied GSAP animations, increased card sizes, and fixed undefined rewards!');
