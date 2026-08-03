const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

const regex = /async function loadDynamicPartners\(\) \{[\s\S]*?(?=\nasync function|\nfunction|\n\/\/)/;

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
            
            // Inject custom CSS for the offset reveal effect
            if (!document.getElementById('partner-offset-styles')) {
                const style = document.createElement('style');
                style.id = 'partner-offset-styles';
                style.textContent = \`
                    .partner-offset-card {
                        position: relative;
                        background: var(--bg-card);
                        border: 2px solid transparent;
                        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                    }
                    .partner-offset-card::before {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        box-shadow: 
                            8px 8px 0 0 var(--partner-color),
                            inset 8px 8px 0 0 var(--partner-color);
                        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
                        pointer-events: none;
                        z-index: 10;
                    }
                    .partner-offset-card:hover {
                        transform: translateY(-5px);
                        z-index: 50;
                    }
                    .partner-offset-card:hover::before {
                        box-shadow: 
                            0 0 0 0 var(--partner-hover),
                            inset 100vw 100vh 0 0 var(--partner-hover);
                    }
                    .partner-info-reveal {
                        max-height: 0;
                        opacity: 0;
                        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
                        overflow: hidden;
                    }
                    .partner-offset-card:hover .partner-info-reveal {
                        max-height: 500px;
                        opacity: 1;
                        padding-top: 1.5rem;
                    }
                    .partner-offset-card:hover .partner-image-banner {
                        height: 120px;
                    }
                    .partner-image-banner {
                        width: 100%;
                        height: 250px;
                        transition: height 0.4s cubic-bezier(0.25, 1, 0.5, 1);
                        object-fit: cover;
                    }
                \`;
                document.head.appendChild(style);
            }

            grid.innerHTML = data.map((partner, i) => {
                const pColor = partner.logoColor || '#ffb829';
                // Create a slightly darker/transparent version for the hover fill
                const pHover = pColor + '1A'; // 10% opacity hex
                
                return \`
                <div class="card glassmorphic partner-offset-card" id="partner-card-\${i}" style="--partner-color: \${pColor}; --partner-hover: \${pHover}; padding:0; gap:0; cursor: pointer;">
                    
                    <!-- Top Banner Image -->
                    <div style="width:100%; position:relative; background:\${pColor};">
                        <img src="\${partner.image}" alt="\${partner.name}" class="partner-image-banner" style="mix-blend-mode: normal;">
                        <span class="section-badge" style="position:absolute; top:1.5rem; right:1.5rem; font-size:0.75rem; background:rgba(0,0,0,0.8); backdrop-filter:blur(4px); border:1px solid \${pColor}; color:\${pColor}; z-index: 20;">\${partner.badge || 'PARTNER'}</span>
                    </div>
                    
                    <!-- Content Area -->
                    <div style="padding:1.5rem; display:flex; flex-direction:column; flex:1; position:relative; z-index: 20;">
                        <div>
                            <h4 style="margin-bottom:0.5rem; font-size:1.4rem;">\${partner.title}</h4>
                            <p style="font-size:0.95rem; color:var(--text-muted); line-height: 1.5;">\${partner.name} Collaborator</p>
                        </div>
                        
                        <!-- Hidden info that reveals on hover -->
                        <div class="partner-info-reveal">
                            <p style="font-size:0.95rem; color:var(--text-main); line-height: 1.5; margin-bottom:1.5rem;">\${partner.subtitle}</p>
                            
                            <strong style="font-size:0.9rem; color:\${pColor};">Available Rewards</strong>
                            <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.75rem;">
                            \${(partner.rewards || []).map(r => {
                                const name = r.tier || r.name || 'Reward';
                                const pts = r.points || r.cost || 0;
                                return \`
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.6); padding:0.75rem; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
                                    <span style="font-size:0.9rem; font-weight: 500;">\${name}</span>
                                    <span style="font-size:0.9rem; color:var(--text-emerald); font-weight: 600;">\${pts} pts</span>
                                </div>
                                \`;
                            }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            \`}).join('');
        }

        const container = document.getElementById('dynamic-partnerships-container');
        if (container) {
            container.innerHTML = '';
        }

    } catch (error) {
        console.error('Failed to load dynamic partners:', error);
    }
}`;

appJs = appJs.replace(regex, newLoadDynamicPartners + "\n\n");
fs.writeFileSync('public/app.js', appJs);
console.log('Applied Offset Box-Shadow hover effect and expanding content layout!');
