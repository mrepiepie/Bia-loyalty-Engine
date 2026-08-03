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
            
            // Clean, theme-aware static CSS with elegant image zoom (No ugly popouts!)
            if (!document.getElementById('partner-clean-styles')) {
                const style = document.createElement('style');
                style.id = 'partner-clean-styles';
                style.textContent = \`
                    #landing-partners-grid {
                        gap: 2.5rem !important; /* Nice breathing room */
                    }
                    .partner-clean-card {
                        position: relative;
                        background: var(--bg-card, #ffffff);
                        border-radius: 16px;
                        border: 1px solid rgba(150, 150, 150, 0.2);
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        text-decoration: none;
                        color: var(--text-main, #333);
                        overflow: hidden;
                    }
                    .partner-clean-card:hover {
                        transform: translateY(-8px);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                    }
                    .dark-theme .partner-clean-card {
                        border-color: rgba(255, 255, 255, 0.08);
                        background: var(--bg-card, #1c1c1e);
                    }
                    .dark-theme .partner-clean-card:hover {
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                    }
                    
                    /* Image container setup to allow zoom without spilling out */
                    .partner-image-wrapper {
                        width: 100%;
                        height: 200px;
                        position: relative;
                        overflow: hidden;
                        border-radius: 16px 16px 0 0;
                        border-bottom: 1px solid rgba(150, 150, 150, 0.1);
                    }
                    .partner-image-banner {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
                    }
                    /* The elegant cinematic zoom effect on the image when hovering the card */
                    .partner-clean-card:hover .partner-image-banner {
                        transform: scale(1.08);
                    }
                    
                    .partner-content-area {
                        padding: 1.5rem;
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                    }
                    .partner-reward-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: rgba(150, 150, 150, 0.05);
                        padding: 0.85rem 1rem;
                        border-radius: 8px;
                        border: 1px solid rgba(150, 150, 150, 0.1);
                    }
                    .dark-theme .partner-reward-item {
                        background: rgba(255, 255, 255, 0.03);
                        border-color: rgba(255, 255, 255, 0.05);
                    }
                \`;
                document.head.appendChild(style);
            }

            grid.innerHTML = data.map((partner, i) => {
                const pColor = partner.logoColor || 'var(--primary)';
                
                return \`
                <div class="partner-clean-card" id="partner-card-\${i}">
                    
                    <!-- Top Banner Image Wrapper -->
                    <div class="partner-image-wrapper">
                        <img src="\${partner.image}" alt="\${partner.name}" class="partner-image-banner">
                        <span style="position:absolute; top:1rem; right:1rem; font-size:0.75rem; background:\${pColor}; color:#fff; padding: 4px 12px; border-radius: 20px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); z-index: 10;">\${partner.badge || 'PARTNER'}</span>
                    </div>
                    
                    <!-- Content Area (Fully Visible Always) -->
                    <div class="partner-content-area">
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="margin-bottom:0.4rem; font-size:1.4rem; color: var(--text-main);">\${partner.title}</h4>
                            <p style="font-size:0.9rem; color:var(--text-muted); font-weight:500; margin-bottom: 1rem; text-transform:uppercase; letter-spacing:0.5px;">\${partner.name} Collaborator</p>
                            <p style="font-size:0.95rem; color:var(--text-muted); line-height: 1.6;">\${partner.subtitle}</p>
                        </div>
                        
                        <!-- Rewards -->
                        <div style="margin-top:auto; display:flex; flex-direction:column;">
                            <strong style="font-size:0.85rem; color:var(--text-main); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.75rem; opacity:0.8;">Available Rewards</strong>
                            <div style="display:flex; flex-direction:column; gap:0.5rem;">
                            \${(partner.rewards || []).map(r => {
                                const name = r.tier || r.name || 'Reward';
                                const pts = r.points || r.cost || 0;
                                return \`
                                <div class="partner-reward-item">
                                    <span style="font-size:0.9rem; font-weight: 500; color: var(--text-main);">\${name}</span>
                                    <span style="font-size:0.95rem; color:var(--text-emerald, #10b981); font-weight: 700;">\${pts} pts</span>
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
console.log('Restored clean layout and removed popout hover!');
