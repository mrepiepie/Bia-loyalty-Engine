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
            
            // Clean, professional, stable CSS
            if (!document.getElementById('partner-offset-styles')) {
                const style = document.createElement('style');
                style.id = 'partner-offset-styles';
                style.textContent = \`
                    .partner-offset-card {
                        position: relative;
                        background: rgba(20, 20, 22, 0.95);
                        border-radius: 12px;
                        transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s cubic-bezier(0.25, 1, 0.5, 1);
                        display: flex;
                        flex-direction: column;
                        box-shadow: 
                            6px 6px 0 0 var(--partner-color),
                            inset 0 0 0 1px rgba(255,255,255,0.1);
                        text-decoration: none;
                        color: inherit;
                        height: 100%;
                    }
                    .partner-offset-card:hover {
                        transform: translate(-4px, -4px);
                        box-shadow: 
                            10px 10px 0 0 var(--partner-color),
                            inset 0 0 0 1px rgba(255,255,255,0.2);
                    }
                    /* Optional subtle tint on hover */
                    .partner-offset-card::after {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: var(--partner-color);
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        pointer-events: none;
                        border-radius: 12px;
                        z-index: 1;
                    }
                    .partner-offset-card:hover::after {
                        opacity: 0.05;
                    }
                    .partner-image-banner {
                        width: 100%;
                        height: 200px;
                        object-fit: cover;
                        border-radius: 12px 12px 0 0;
                        border-bottom: 2px solid var(--partner-color);
                    }
                \`;
                document.head.appendChild(style);
            }

            grid.innerHTML = data.map((partner, i) => {
                const pColor = partner.logoColor || '#ffb829';
                
                return \`
                <div class="partner-offset-card" id="partner-card-\${i}" style="--partner-color: \${pColor};">
                    
                    <!-- Top Banner Image -->
                    <div style="width:100%; position:relative;">
                        <img src="\${partner.image}" alt="\${partner.name}" class="partner-image-banner">
                        <span class="section-badge" style="position:absolute; top:1rem; right:1rem; font-size:0.75rem; background:rgba(0,0,0,0.85); backdrop-filter:blur(4px); border:1px solid \${pColor}; color:\${pColor}; z-index: 20; padding: 4px 10px; border-radius: 20px; font-weight: 600; letter-spacing: 0.5px;">\${partner.badge || 'PARTNER'}</span>
                    </div>
                    
                    <!-- Content Area (Always visible, stable height) -->
                    <div style="padding:1.5rem; display:flex; flex-direction:column; flex:1; position:relative; z-index: 20;">
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="margin-bottom:0.5rem; font-size:1.4rem; color: #fff;">\${partner.title}</h4>
                            <p style="font-size:0.95rem; color:var(--text-muted); line-height: 1.5; margin-bottom: 1rem;">\${partner.name} Collaborator</p>
                            <p style="font-size:0.95rem; color:#e0e0e0; line-height: 1.6;">\${partner.subtitle}</p>
                        </div>
                        
                        <!-- Rewards -->
                        <div style="margin-top:auto; display:flex; flex-direction:column;">
                            <strong style="font-size:0.85rem; color:\${pColor}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.75rem;">Available Rewards</strong>
                            <div style="display:flex; flex-direction:column; gap:0.5rem;">
                            \${(partner.rewards || []).map(r => {
                                const name = r.tier || r.name || 'Reward';
                                const pts = r.points || r.cost || 0;
                                return \`
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:0.85rem 1rem; border-radius:8px; border:1px solid rgba(255,255,255,0.05); transition: background 0.2s;">
                                    <span style="font-size:0.9rem; font-weight: 500; color: #fff;">\${name}</span>
                                    <span style="font-size:0.95rem; color:\${pColor}; font-weight: 700;">\${pts} pts</span>
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
console.log('Applied highly professional, non-glitchy solid offset hover effect!');
