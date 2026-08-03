const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

const regex = /grid\.innerHTML = data\.map\(\(partner, i\) => \`[\s\S]*?\`\)\.join\(''\);/;

const replacement = `grid.innerHTML = data.map((partner, i) => \`
                <div class="card spotlight-card glassmorphic partner-grid-card" id="partner-card-\${i}" style="display:flex; flex-direction:column; padding:0; gap:0; transition: border-color 0.3s; cursor: pointer; overflow:hidden;">
                    <!-- Large Banner Image -->
                    <div style="width:100%; height:180px; background:\${partner.logoColor || 'rgba(255,255,255,0.1)'}; position:relative; overflow:hidden;">
                        <img src="\${partner.image}" alt="\${partner.name}" style="width:100%; height:100%; object-fit:cover; mix-blend-mode: normal;">
                        <span class="section-badge badge-blue" style="position:absolute; top:1rem; right:1rem; font-size:0.75rem; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); border:none;">\${partner.badge || 'PARTNER'}</span>
                        <div style="position:absolute; bottom:0; left:0; right:0; height:80px; background:linear-gradient(to top, var(--bg-card), transparent);"></div>
                    </div>
                    
                    <!-- Text and Rewards -->
                    <div style="padding:1.5rem; display:flex; flex-direction:column; flex:1; gap:1.5rem; z-index:2; position:relative; margin-top:-20px;">
                        <div>
                            <h4 style="margin-bottom:0.5rem; font-size:1.4rem;">\${partner.title}</h4>
                            <p style="font-size:0.95rem; color:var(--text-muted); line-height: 1.5;">\${partner.subtitle}</p>
                        </div>
                        <div style="margin-top:auto; display:flex; flex-direction:column; gap:0.5rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:1.5rem;">
                            <strong style="font-size:0.9rem; color:#dfb15b;">Available Rewards</strong>
                            \${(partner.rewards || []).map(r => {
                                const name = r.tier || r.name || 'Reward';
                                const pts = r.points || r.cost || 0;
                                return \`
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:0.75rem; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
                                    <span style="font-size:0.9rem; font-weight: 500;">\${name}</span>
                                    <span style="font-size:0.9rem; color:var(--text-emerald); font-weight: 600;">\${pts} pts</span>
                                </div>
                                \`;
                            }).join('')}
                        </div>
                    </div>
                </div>
            \`).join('');`;

appJs = appJs.replace(regex, replacement);
fs.writeFileSync('public/app.js', appJs);
console.log('Fixed partner card images to be full banners!');
