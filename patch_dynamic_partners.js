const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

const regex = /async function loadDynamicPartners\(\) \{[\s\S]*?(?=\nasync function|\nfunction|\n\/\/)/;
const replacement = `async function loadDynamicPartners() {
    try {
        const response = await fetch('/api/partners');
        const data = await response.json();
        appPartners = data;

        // Populate new simple grid
        const grid = document.getElementById('landing-partners-grid');
        if (grid) {
            if (!data || data.length === 0) {
                grid.innerHTML = '<div style="text-align: center; color: var(--text-muted); grid-column: 1 / -1; padding: 2rem;">No partners available at the moment.</div>';
                return;
            }
            grid.innerHTML = data.map(partner => \`
                <div class="card spotlight-card glassmorphic" style="display:flex; flex-direction:column; padding:1.5rem; gap:1rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <img src="\${partner.image}" alt="\${partner.name}" style="height:40px; border-radius:8px; object-fit:contain; background:\${partner.logoColor || 'rgba(255,255,255,0.1)'};">
                        <span class="section-badge badge-blue" style="font-size:0.7rem;">\${partner.badge || 'PARTNER'}</span>
                    </div>
                    <div>
                        <h4 style="margin-bottom:0.25rem;">\${partner.title}</h4>
                        <p style="font-size:0.85rem; color:var(--text-muted);">\${partner.subtitle}</p>
                    </div>
                    <div style="margin-top:auto; display:flex; flex-direction:column; gap:0.5rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:1rem;">
                        <strong style="font-size:0.8rem; color:#dfb15b;">Available Rewards</strong>
                        \${(partner.rewards || []).map(r => \`
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:0.5rem; border-radius:4px;">
                                <span style="font-size:0.8rem;">\${r.tier}</span>
                                <span style="font-size:0.8rem; color:var(--text-emerald);">\${r.points} pts</span>
                            </div>
                        \`).join('')}
                    </div>
                </div>
            \`).join('');
        }

        // Keep old container for backward compatibility if needed
        const container = document.getElementById('dynamic-partnerships-container');
        if (container) {
            container.innerHTML = '';
        }

    } catch (error) {
        console.error('Failed to load dynamic partners:', error);
    }
}`;

appJs = appJs.replace(regex, replacement);
fs.writeFileSync('public/app.js', appJs);
console.log('Fixed loadDynamicPartners');
