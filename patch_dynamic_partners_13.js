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
            
            // Netflix-style popup CSS: solid backgrounds and bigger grid gaps
            if (!document.getElementById('partner-netflix-styles')) {
                const style = document.createElement('style');
                style.id = 'partner-netflix-styles';
                style.textContent = \`
                    #landing-partners-grid {
                        gap: 2.5rem !important; /* MUCH more breathing room between cards */
                    }
                    .partner-grid-item {
                        position: relative;
                        height: 270px; /* Small preview size */
                        width: 100%;
                    }
                    .partner-popout-card {
                        position: absolute;
                        top: 0; left: 0; right: 0;
                        background: #ffffff; /* SOLID background, no transparency */
                        border-radius: 16px;
                        border: 1px solid rgba(150, 150, 150, 0.2);
                        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
                        overflow: hidden;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                        z-index: 10;
                        display: flex;
                        flex-direction: column;
                        color: var(--text-main, #333);
                    }
                    .dark-theme .partner-popout-card {
                        border-color: rgba(255, 255, 255, 0.08);
                        background: #0d0d0d; /* SOLID dark background, no transparency */
                    }
                    
                    /* Hover effect: Scale up and pull to absolute front */
                    .partner-popout-card:hover {
                        z-index: 9999;
                        transform: scale(1.1);
                        box-shadow: 0 40px 80px rgba(0, 0, 0, 0.9);
                        border-color: var(--partner-color);
                    }
                    
                    .partner-image-banner {
                        width: 100%;
                        height: 200px;
                        object-fit: cover;
                        border-bottom: 1px solid rgba(150, 150, 150, 0.1);
                    }
                    
                    .partner-preview-header {
                        padding: 1.25rem 1.5rem; /* slightly more vertical breathing room */
                        background: inherit;
                    }
                    
                    /* The hidden text that reveals on hover */
                    .partner-content-reveal {
                        max-height: 0;
                        opacity: 0;
                        padding: 0 1.5rem;
                        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
                        background: inherit;
                    }
                    
                    .partner-popout-card:hover .partner-content-reveal {
                        max-height: 800px;
                        opacity: 1;
                        padding: 0 1.5rem 1.5rem 1.5rem;
                    }
                    
                    .partner-reward-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: rgba(150, 150, 150, 0.08);
                        padding: 0.85rem 1rem;
                        border-radius: 8px;
                        border: 1px solid rgba(150, 150, 150, 0.1);
                    }
                    .dark-theme .partner-reward-item {
                        background: rgba(255, 255, 255, 0.05);
                        border-color: rgba(255, 255, 255, 0.08);
                    }
                \`;
                document.head.appendChild(style);
            }

            grid.innerHTML = data.map((partner, i) => {
                const pColor = partner.logoColor || 'var(--primary)';
                
                return \`
                <!-- Grid Placeholder to prevent layout shift -->
                <div class="partner-grid-item" onmouseenter="this.style.zIndex='9999'" onmouseleave="this.style.zIndex=''">
                    <!-- Absolute Card that can scale and expand without glitching grid -->
                    <div class="partner-popout-card" id="partner-card-\${i}" style="--partner-color: \${pColor};">
                        
                        <!-- Top Banner Image -->
                        <div style="width:100%; position:relative; background: #000;">
                            <img src="\${partner.image}" alt="\${partner.name}" class="partner-image-banner">
                            <span style="position:absolute; top:1rem; right:1rem; font-size:0.75rem; background:\${pColor}; color:#fff; padding: 4px 12px; border-radius: 20px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(0,0,0,0.4); z-index: 10;">\${partner.badge || 'PARTNER'}</span>
                        </div>
                        
                        <!-- Preview Header (Always visible) -->
                        <div class="partner-preview-header">
                            <h4 style="margin-bottom:0.2rem; font-size:1.3rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${partner.title}</h4>
                            <p style="font-size:0.85rem; color:var(--text-muted); font-weight:500; text-transform:uppercase; letter-spacing:0.5px;">\${partner.name}</p>
                        </div>
                        
                        <!-- Hidden Content Area (Reveals on hover) -->
                        <div class="partner-content-reveal">
                            <p style="font-size:0.95rem; color:var(--text-muted); line-height: 1.5; margin-bottom: 1.5rem;">\${partner.subtitle}</p>
                            
                            <!-- Rewards -->
                            <div style="display:flex; flex-direction:column;">
                                <strong style="font-size:0.8rem; color:var(--text-main); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; opacity:0.8;">Available Rewards</strong>
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
console.log('Added bigger gaps to grid!');
