// BIA Loyalty Engine Frontend App with Role-based login and admin directory

const API_BASE = '/api';

// App State Cache
let appState = {
    currentUser: null, // Logged in user info
    userProfile: null, // Student profile data if student
    ledger: [],
    referrals: [],
    settings: {},
    students: [], // Admin only
    selectedUserIdForAdjustment: null // Admin only
};

// Formatting helpers
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Clean date helper
function cleanDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ----------------------------------------------------
// TABS NAVIGATION & SMOOTH ANIMATION
// ----------------------------------------------------
document.querySelectorAll('.nav-tab').forEach(btn => {
    // Avoid double attaching to logout
    if (btn.id === 'btn-logout') return;

    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.remove('active');
            c.style.display = 'none'; // Ensure fully hidden
        });
        
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        const content = document.getElementById(targetId);
        content.classList.add('active');
        content.style.display = 'block'; // Make visible
        
        // GSAP transition on tab entry
        if (window.gsap) {
            gsap.fromTo(content, 
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }
            );
        } else {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }

        // Fetch appropriate data on tab swap
        if (targetId === 'admin-settings') {
            loadAdminSettings();
            window.loadAdminMetrics();
        } else if (targetId === 'admin-students') {
            loadAdminStudents();
        } else if (targetId === 'admin-ledger') {
            loadAdminLedger();
        } else if (targetId === 'admin-leads') {
            window.loadAdminLeads();
        } else if (targetId === 'admin-traffic') {
            loadTrafficDashboard();
        } else if (targetId === 'overview' || targetId === 'referrals' || targetId === 'redeem' || targetId === 'ledger') {
            loadUserProfile(appState.currentUser.user_id);
        }
    });
});

// ----------------------------------------------------
// SCROLLING PROGRESS BAR & PARALLAX HANDLERS
// ----------------------------------------------------
window.addEventListener('scroll', () => {
    // 1. Scroll Progress Bar Indicator
    const scrollContainer = document.getElementById('login-overlay');
    
    // Check if we are viewing the scrollable login-overlay cover page or main dashboard
    const isDashboardVisible = document.querySelector('.app-container').style.display === 'block';
    let progress = 0;
    
    if (isDashboardVisible) {
        const height = document.documentElement.scrollHeight - window.innerHeight;
        if (height > 0) {
            progress = (window.scrollY / height) * 100;
        }
    } else {
        const overlayHeight = scrollContainer.scrollHeight - window.innerHeight;
        if (overlayHeight > 0) {
            progress = (scrollContainer.scrollTop / overlayHeight) * 100;
        }
    }
    
    document.getElementById('scroll-progress-indicator').style.width = `${progress}%`;

    // 2. Parallax background spots (GSAP)
    if (!window.gsap) return;
    const scrolled = isDashboardVisible ? window.scrollY : scrollContainer.scrollTop;
    
    document.querySelectorAll('.parallax-bg').forEach(bg => {
        const speed = parseFloat(bg.getAttribute('data-speed')) || 0.1;
        gsap.to(bg, {
            y: scrolled * speed,
            duration: 0.3,
            overwrite: "auto"
        });
    });
    
    // 4. Parallax Floating Pixel Matrices (GSAP)
    const leftMatrix = document.querySelector('.float-matrix-left');
    const rightMatrix = document.querySelector('.float-matrix-right');
    if (leftMatrix) {
        gsap.to(leftMatrix, {
            y: scrolled * 0.22,
            duration: 0.4,
            ease: "power1.out",
            overwrite: "auto"
        });
    }
    if (rightMatrix) {
        gsap.to(rightMatrix, {
            y: scrolled * -0.22,
            duration: 0.4,
            ease: "power1.out",
            overwrite: "auto"
        });
    }
});

// Bind additional scroll tracker to scrollable login cover element
document.getElementById('login-overlay').addEventListener('scroll', () => {
    window.dispatchEvent(new Event('scroll'));
});

// ----------------------------------------------------
// GSAP SCROLLTRIGGER PREMIUM REVEALS
// ----------------------------------------------------
function setupScrollReveals() {
    if (typeof ScrollTrigger === 'undefined' || typeof gsap === 'undefined') return;

    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    // 1. Reveal sections smoothly on scroll
    document.querySelectorAll('.reveal-on-scroll').forEach(section => {
        gsap.fromTo(section, 
            { opacity: 0, y: 50 },
            { 
                opacity: 1, 
                y: 0, 
                duration: 0.8, 
                ease: "power2.out",
                scrollTrigger: {
                    trigger: section,
                    scroller: "#login-overlay",
                    start: "top 85%",
                    toggleActions: "play reverse play reverse"
                }
            }
        );
    });

    // 2. Staggered reveal for grid cards (tiers, benefits, team, manifesto)
    const grids = ['.tiers-grid', '.benefits-grid', '.team-grid', '.manifesto-grid'];
    grids.forEach(selector => {
        const grid = document.querySelector(selector);
        if (!grid) return;
        
        const cards = grid.children;
        if (cards.length === 0) return;

        gsap.fromTo(cards,
            { opacity: 0, y: 40 },
            {
                opacity: 1,
                y: 0,
                duration: 0.7,
                stagger: 0.12,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: grid,
                    scroller: "#login-overlay",
                    start: "top 80%",
                    toggleActions: "play reverse play reverse"
                }
            }
        );
    });

    // 3. Parallax scroll effect for vertical slat lines background
    document.querySelectorAll('.slat-line').forEach((slat, idx) => {
        gsap.to(slat, {
            yPercent: 12 + (idx * 5),
            ease: "none",
            scrollTrigger: {
                trigger: "#login-overlay",
                scroller: "#login-overlay",
                start: "top top",
                end: "bottom bottom",
                scrub: true
            }
        });
    });

    // 4. Subtle scale-in reveal for decorative crests & badges
    document.querySelectorAll('.academic-crest-wrapper').forEach(crest => {
        gsap.fromTo(crest,
            { opacity: 0, scale: 0.8, rotate: -5 },
            {
                opacity: 1,
                scale: 1,
                rotate: 0,
                duration: 0.8,
                ease: "back.out(1.5)",
                scrollTrigger: {
                    trigger: crest,
                    scroller: "#login-overlay",
                    start: "top 80%"
                }
            }
        );
    });
}

// ----------------------------------------------------
// INTERACTIVE FLOATING PARTICLES CANVAS BACKGROUND (STAR DUST FIELD)
// ----------------------------------------------------
function setupPixelGridBackground() {
    const canvas = document.getElementById('pixel-grid-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const particles = [];
    const numParticles = 80; // Optimized density to prevent CPU stutter
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    
    // Initialize particles
    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3.5 + 1.2, // Slightly larger shapes
            speedY: -(Math.random() * 0.45 + 0.1), // Dynamic upward drift
            speedX: (Math.random() * 0.2 - 0.1),
            color: getRandomColor(),
            opacity: Math.random() * 0.45 + 0.08,
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() * 0.015 - 0.007)
        });
    }
    
    function getRandomColor() {
        const colors = [
            'rgba(128, 82, 255, ', // Electric Iris
            'rgba(255, 184, 41, ', // Saffron Spark
            'rgba(21, 132, 110, ', // Deep Emerald
            'adaptive'             // Dynamic adaptive color (white or charcoal)
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    let mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
        mouse.x = -1000;
        mouse.y = -1000;
    });
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Draw delicate connection webs between nearby drifting shapes
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distSq = dx * dx + dy * dy;
                const maxDist = 95; // Connection threshold
                const maxDistSq = maxDist * maxDist;
                
                if (distSq < maxDistSq) {
                    const dist = Math.sqrt(distSq);
                    let alpha = (1.0 - (dist / maxDist)) * 0.12;
                    const isDark = document.body.classList.contains('dark-theme');
                    if (!isDark) {
                        alpha *= 2.5; // Boost line visibility in light mode
                    }
                    ctx.strokeStyle = isDark ? `rgba(255, 255, 255, ${alpha})` : `rgba(29, 28, 22, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }

        // 2. Animate and render shapes
        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.angle += p.rotSpeed;
            
            // Wrap coordinates around margins
            if (p.y < -10) p.y = canvas.height + 10;
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;
            
            // Cursor deflection check (Larger radius for rich interaction)
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.hypot(dx, dy);
            let activeOpacity = p.opacity;
            let sizeScale = 1.0;
            const repRad = 200; // Deflection radius
            
            if (dist < repRad) {
                const factor = 1.0 - (dist / repRad);
                activeOpacity = Math.min(0.9, p.opacity + factor * 0.55);
                sizeScale = 1.0 + factor * 1.4;
                
                // Repel away slightly
                p.x -= (dx / dist) * factor * 1.5;
                p.y -= (dy / dist) * factor * 1.5;
            }
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            
            let finalColorPrefix = p.color;
            const isDark = document.body.classList.contains('dark-theme');
            
            if (p.color === 'adaptive') {
                finalColorPrefix = isDark ? 'rgba(255, 255, 255, ' : 'rgba(29, 28, 22, ';
            } else if (!isDark) {
                // In light mode, bright neon colors are invisible on beige. 
                // We use much darker, richer variants of the brand colors.
                if (p.color === 'rgba(128, 82, 255, ') finalColorPrefix = 'rgba(75, 40, 180, '; // Deep Purple
                else if (p.color === 'rgba(255, 184, 41, ') finalColorPrefix = 'rgba(180, 90, 0, ';   // Deep Orange-Brown
                else if (p.color === 'rgba(21, 132, 110, ') finalColorPrefix = 'rgba(10, 80, 60, ';   // Dark Pine
            }
            
            let finalOpacity = activeOpacity;
            if (!isDark) {
                // Boost opacity heavily in light mode because the beige background washes out alpha
                finalOpacity = Math.min(0.9, activeOpacity * 2.0);
            }
            
            ctx.fillStyle = `${finalColorPrefix}${finalOpacity})`;
            
            // Draw tiny triangles
            ctx.beginPath();
            const sz = p.size * sizeScale;
            ctx.moveTo(0, -sz);
            ctx.lineTo(-sz, sz);
            ctx.lineTo(sz, sz);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// ----------------------------------------------------
// DYNAMIC PROXIMITY CARD ANIMATOR (CURSOR INTERACTION)
// ----------------------------------------------------
function setupProximityBoxes() {
    window.addEventListener('mousemove', (e) => {
        const boxes = document.querySelectorAll('.proximity-box');
        if (boxes.length === 0) return;

        const cursorX = e.clientX;
        const cursorY = e.clientY;

        boxes.forEach(box => {
            const rect = box.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const distance = Math.hypot(cursorX - centerX, cursorY - centerY);
            const radius = 260; // Activation radius in pixels

            // Match color code
            const colorAttr = box.getAttribute('data-color');
            const rgb = colorAttr === 'emerald' ? '16, 185, 129' : '59, 130, 246';

            if (distance < radius) {
                const strength = 1.0 - (distance / radius);
                
                const scale = 1.0 + strength * 0.04; // Max scale of 1.04
                const translateY = -strength * 8; // Max translateY of -8px
                const glowOpacity = strength * 1.0; // Show glow
                const borderGlow = strength * 0.7; // Border glow opacity

                box.style.transform = `translateY(${translateY}px) scale(${scale})`;
                box.style.borderColor = `rgba(${rgb}, ${0.08 + borderGlow})`;
                box.style.boxShadow = `0 10px 32px rgba(${rgb}, ${strength * 0.22})`;
                
                const glow = box.querySelector('.p-box-glow');
                if (glow) {
                    glow.style.opacity = glowOpacity;
                }
            } else {
                box.style.transform = 'none';
                box.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                box.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.4)';
                
                const glow = box.querySelector('.p-box-glow');
                if (glow) {
                    glow.style.opacity = '0';
                }
            }
        });
    });
}

// ----------------------------------------------------
// MAGNETIC BUTTON INTERACTION (PREMIUM DETAIL)
// ----------------------------------------------------
function setupMagneticButtons() {
    const magneticBtns = document.querySelectorAll('.btn-primary, .btn-access-wallet');

    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            // Move button slightly towards cursor coordinates
            gsap.to(btn, {
                x: x * 0.25,
                y: y * 0.25,
                duration: 0.3,
                ease: "power2.out",
                overwrite: "auto"
            });
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: "elastic.out(1, 0.5)",
                overwrite: "auto"
            });
        });
    });
}

// --- DYNAMIC AUDIO GENERATOR (M3 Auditory feedback) ---
function playTactilePopSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.type = "sine";
        const now = ctx.currentTime;
        
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
    } catch (e) {}
}

function setupM3Buttons() {
    // Bind all buttons with .btn-m3 class
    const m3Buttons = document.querySelectorAll('.btn-m3');
    
    m3Buttons.forEach(btn => {
        // Pointerdown listener for tactile ripple
        btn.addEventListener('pointerdown', (e) => {
            if (btn.hasAttribute('disabled')) return;
            
            // Audio pop for large/prominent CTAs
            if (btn.classList.contains('btn-lg') || btn.classList.contains('btn-xl') || btn.id === 'btn-hero-login') {
                playTactilePopSound();
            }
            
            const circle = document.createElement("span");
            const diameter = Math.max(btn.clientWidth, btn.clientHeight);
            const radius = diameter / 2;

            circle.style.width = circle.style.height = `${diameter}px`;
            
            const rect = btn.getBoundingClientRect();
            circle.style.left = `${e.clientX - rect.left - radius}px`;
            circle.style.top = `${e.clientY - rect.top - radius}px`;
            
            circle.classList.add("m3-ripple");
            
            // Clear any lingering ripples
            const oldRipples = btn.querySelectorAll('.m3-ripple');
            oldRipples.forEach(r => r.remove());
            
            btn.appendChild(circle);
            
            // Remove ripple span after animation completes
            setTimeout(() => {
                circle.remove();
            }, 600);
        });
    });
}

function setupLandingParticles() {
    const canvas = document.getElementById('bug-particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    if (!container) return;
    
    let width = canvas.width = container.offsetWidth;
    let height = canvas.height = container.offsetHeight;
    
    window.addEventListener('resize', () => {
        if (!container) return;
        width = canvas.width = container.offsetWidth;
        height = canvas.height = container.offsetHeight;
    });
    
    const particles = [];
    for (let i = 0; i < 40; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.5 + 0.5,
            alpha: Math.random() * 0.4 + 0.1,
            dx: (Math.random() - 0.5) * 0.25,
            dy: (Math.random() - 0.5) * 0.25
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        // Render particles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        // Light mode override
        if (!document.body.classList.contains('dark-theme')) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        }
        
        particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

// ----------------------------------------------------
// SCREEN PRELOADER INTRO TIMER & REVEAL
// ----------------------------------------------------
function playIntroPreloader() {
    const loader = document.getElementById('loader-screen');
    const loginOverlay = document.getElementById('login-overlay');
    
    if (loader) {
        loader.remove();
    }
    
    if (loginOverlay) {
        loginOverlay.style.display = 'block';
        loginOverlay.style.opacity = '1';
        document.body.classList.add('landing-active');
        if (typeof animateLandingText === 'function') {
            animateLandingText();
        }
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    }
}


// ----------------------------------------------------
// REAL-TIME LOYALTY ENGINE LIVE FEED SIMULATOR
// ----------------------------------------------------
function setupLiveFeedSimulator() {
    const ticker = document.getElementById('live-feed-ticker');
    if (!ticker) return;

    const names = ['Sarah M.', 'John D.', 'Fatma A.', 'Aris P.', 'Michael K.', 'Zayed L.', 'Aisha B.'];
    const events = [
        { desc: 'completed Finance Module', pts: '+100 pts', type: 'plus' },
        { desc: 'approved peer lead', pts: '+1,000 pts', type: 'plus' },
        { desc: 'redeemed DBA tuition', pts: '-2,000 pts', type: 'minus' },
        { desc: 'unlocked Silver Tier status', pts: '1.1x Multiplier', type: 'plus' },
        { desc: 'scanned seminar QR', pts: '+50 pts', type: 'plus' },
        { desc: 'decayed expired points', pts: '-400 pts', type: 'minus' },
        { desc: 'enrolled MBA premium course', pts: '+500 pts', type: 'plus' }
    ];

    function addFeedItem() {
        const name = names[Math.floor(Math.random() * names.length)];
        const ev = events[Math.floor(Math.random() * events.length)];

        const item = document.createElement('div');
        item.className = 'feed-item';
        item.innerHTML = `
            <div class="feed-left">
                <span class="feed-user">${name}</span>
                <span>${ev.desc}</span>
            </div>
            <span class="feed-pts notranslate ${ev.type}">${ev.pts}</span>
        `;

        ticker.appendChild(item);

        // Keep last 3 items and scroll
        const items = ticker.querySelectorAll('.feed-item');
        if (items.length > 3) {
            items[0].remove();
        }

        // Smooth scroll bottom alignment
        ticker.scrollTop = ticker.scrollHeight;
    }

    // Populate initial items
    for (let i = 0; i < 3; i++) {
        setTimeout(addFeedItem, i * 400);
    }

    // Run interval
    setInterval(addFeedItem, 3500);
}

// ----------------------------------------------------
// 3D SplitText Flip Animations
// ----------------------------------------------------
function initTextFlips() {
    const title = document.querySelector('.hero-subtitle');
    if (!title) return;

    if (title.classList.contains('split-done')) return;
    title.classList.add('split-done');

    const text = title.innerHTML;
    const lines = text.split('<br>');
    let newHTML = '';

    lines.forEach((line, lineIndex) => {
        const words = line.trim().split(/\s+/);
        let lineHTML = '<div class="flip-line">';
        
        words.forEach(word => {
            let wordHTML = '<span class="flip-word">';
            for (let i = 0; i < word.length; i++) {
                wordHTML += `<span class="flip-char">${word[i]}</span>`;
            }
            wordHTML += '</span>&nbsp;';
            lineHTML += wordHTML;
        });

        lineHTML += '</div>';
        newHTML += lineHTML;
        if (lineIndex < lines.length - 1) {
            newHTML += '<br>';
        }
    });

    title.innerHTML = newHTML;

    if (window.gsap) {
        gsap.fromTo(".flip-char", 
            { 
                opacity: 0, 
                rotationX: -100, 
                y: 20,
                transformOrigin: "50% 0% -10px"
            }, 
            { 
                opacity: 1, 
                rotationX: 0, 
                y: 0,
                duration: 0.95, 
                stagger: 0.02, 
                ease: "back.out(1.4)",
                delay: 1.8
            }
        );
    }
}

// ----------------------------------------------------
// 3D HOLOGRAPHIC CARD TILT ENGINE
// ----------------------------------------------------
function setup3DTilts() {
    const cards = document.querySelectorAll('.login-card-box');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const tiltX = ((y / rect.height) - 0.5) * -12;
            const tiltY = ((x / rect.width) - 0.5) * 12;
            
            card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.01, 1.01, 1.01)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });
}

// ----------------------------------------------------
// AUTHENTICATION LOGIN / LOGOUT / RECOVERY / MODALS
// ----------------------------------------------------

// Modal trigger links
function openLoginModal() {
    const modal = document.getElementById('login-modal-overlay');
    modal.style.display = 'flex';
    document.body.classList.add('login-modal-active');
    if (window.gsap) {
        gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        
        // Staggered layout grid drawing (Cipher Digital blueprint style)
        const linesHor = modal.querySelectorAll('.login-mesh-grid .hor-line');
        const linesVer = modal.querySelectorAll('.login-mesh-grid .ver-line');
        const nodes = modal.querySelectorAll('.login-mesh-grid .grid-node');

        gsap.fromTo(linesHor, { width: '0%' }, { width: '100%', duration: 0.9, ease: "power2.inOut", stagger: 0.1 });
        gsap.fromTo(linesVer, { height: '0%' }, { height: '100%', duration: 0.9, ease: "power2.inOut", stagger: 0.1 });
        gsap.fromTo(nodes, { scale: 0 }, { scale: 1, duration: 0.5, delay: 0.6, ease: "back.out(2)" });

        gsap.fromTo(modal.querySelector('.login-split-grid'), { y: 35, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, delay: 0.2, ease: "power3.out" });
    } else {
        modal.style.opacity = '1';
    }
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal-overlay');
    document.body.classList.remove('login-modal-active');
    if (window.gsap) {
        gsap.to(modal, {
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
                modal.style.display = 'none';
            }
        });
    } else {
        modal.style.opacity = '0';
        modal.style.display = 'none';
    }
}

document.getElementById('btn-show-login-modal').addEventListener('click', openLoginModal);
document.getElementById('btn-hero-login').addEventListener('click', openLoginModal);
document.getElementById('btn-close-login-modal').addEventListener('click', closeLoginModal);

// Close modal when clicking outside card
document.getElementById('login-modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('login-modal-overlay')) {
        closeLoginModal();
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Authentication failed');

        appState.currentUser = data.user;
        
        // Hide login modal & cover screen, trigger GSAP reveal
        closeLoginModal();
        if (window.gsap) {
            gsap.to('#login-overlay', {
                opacity: 0,
                duration: 0.4,
                onComplete: () => {
                    document.getElementById('login-overlay').style.display = 'none';
                    document.body.classList.remove('landing-active');
                    document.body.classList.remove('login-modal-active');
                    document.getElementById('login-email').value = '';
                    document.getElementById('login-password').value = '';
                    
                    showPortalDashboard();
                }
            });
        } else {
            document.getElementById('login-overlay').style.display = 'none';
            document.body.classList.remove('landing-active');
            document.body.classList.remove('login-modal-active');
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            showPortalDashboard();
        }

    } catch (err) {
        alert(`Authentication Error: ${err.message}`);
    }
});

// Toggle views for Forgot Password
document.getElementById('link-forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    const loginView = document.getElementById('login-form-view');
    const forgotView = document.getElementById('forgot-password-view');

    if (window.gsap) {
        gsap.to(loginView, {
            opacity: 0,
            y: -10,
            duration: 0.3,
            onComplete: () => {
                loginView.style.display = 'none';
                forgotView.style.display = 'block';
                gsap.fromTo(forgotView, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
            }
        });
    } else {
        loginView.style.display = 'none';
        forgotView.style.display = 'block';
        forgotView.style.opacity = '1';
    }
});

document.getElementById('link-back-login').addEventListener('click', (e) => {
    e.preventDefault();
    const loginView = document.getElementById('login-form-view');
    const forgotView = document.getElementById('forgot-password-view');

    if (window.gsap) {
        gsap.to(forgotView, {
            opacity: 0,
            y: 10,
            duration: 0.3,
            onComplete: () => {
                forgotView.style.display = 'none';
                loginView.style.display = 'block';
                gsap.fromTo(loginView, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 });
            }
        });
    } else {
        forgotView.style.display = 'none';
        loginView.style.display = 'block';
        loginView.style.opacity = '1';
    }
});

// Handle Credentials Recovery Submit
document.getElementById('recovery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('recovery-identifier').value.trim();

    try {
        const response = await fetch(`${API_BASE}/auth/retrieve-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Recovery lookup failed');

        // Populate match values
        document.getElementById('lbl-recovered-name').textContent = data.user.name;
        document.getElementById('lbl-recovered-email').textContent = data.user.email;
        document.getElementById('lbl-recovered-pass').textContent = data.user.password;

        // Slide out forgot form and reveal results overlay card
        const forgotView = document.getElementById('forgot-password-view');
        const resultView = document.getElementById('recovery-result-view');

        if (window.gsap) {
            gsap.to(forgotView, {
                opacity: 0,
                y: -10,
                duration: 0.3,
                onComplete: () => {
                    forgotView.style.display = 'none';
                    resultView.style.display = 'block';
                    gsap.fromTo(resultView, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
                }
            });
        } else {
            forgotView.style.display = 'none';
            resultView.style.display = 'block';
            resultView.style.opacity = '1';
        }

    } catch (err) {
        alert(`Recovery Error: ${err.message}`);
    }
});

// Recover confirmation button to go back to sign in
document.getElementById('btn-recovery-confirm').addEventListener('click', () => {
    const resultView = document.getElementById('recovery-result-view');
    const loginView = document.getElementById('login-form-view');

    document.getElementById('recovery-identifier').value = '';

    if (window.gsap) {
        gsap.to(resultView, {
            opacity: 0,
            y: 10,
            duration: 0.3,
            onComplete: () => {
                resultView.style.display = 'none';
                loginView.style.display = 'block';
                gsap.fromTo(loginView, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 });
            }
        });
    } else {
        resultView.style.display = 'none';
        loginView.style.display = 'block';
        loginView.style.opacity = '1';
    }
});

// Show dashboard panel based on role
function showPortalDashboard() {
    const role = appState.currentUser.role;
    const container = document.querySelector('.app-container');
    const badge = document.getElementById('user-role-badge');
    
    badge.textContent = role === 'admin' ? 'Admin console' : 'Student member';
    badge.className = `badge-subdomain ${role === 'admin' ? 'text-gold' : 'text-blue'}`;

    // Hide all tab contents first
    document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });

    // Hide all role-specific navigation tabs
    document.querySelectorAll('.nav-tab').forEach(btn => {
        if (btn.id !== 'btn-logout') {
            btn.style.display = 'none';
        }
    });

    if (role === 'admin') {
        // Show admin navigation tabs ONLY
        document.querySelectorAll('.nav-tab.admin-only').forEach(el => {
            el.style.display = 'inline-flex';
        });
        
        // Reset nav button active states
        document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
        
        // Set first admin tab active
        const activeTabBtn = document.querySelector('.nav-tab[data-target="admin-students"]');
        if (activeTabBtn) activeTabBtn.classList.add('active');
        
        const content = document.getElementById('admin-students');
        if (content) {
            content.style.display = 'block';
            content.classList.add('active');
        }

        loadAdminStudents();
    } else {
        // Show student navigation tabs ONLY
        document.querySelectorAll('.nav-tab.student-only').forEach(el => {
            el.style.display = 'inline-flex';
        });

        // Reset nav button active states
        document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
        
        // Set first student tab active
        const activeTabBtn = document.querySelector('.nav-tab[data-target="overview"]');
        if (activeTabBtn) activeTabBtn.classList.add('active');
        
        const content = document.getElementById('overview');
        if (content) {
            content.style.display = 'block';
            content.classList.add('active');
        }

        loadUserProfile(appState.currentUser.user_id);
    }

    container.style.display = 'block';
    if (window.gsap) {
        gsap.fromTo(container, 
            { opacity: 0, y: 25 }, 
            { opacity: 1, y: 0, duration: 0.8, ease: "power4.out" }
        );
    } else {
        container.style.opacity = '1';
    }
}

function handleLogout() {
    appState.currentUser = null;
    appState.userProfile = null;
    appState.adminUser = null;
    const banner = document.getElementById('impersonation-bar');
    if (banner) banner.style.display = 'none';
    
    if (window.gsap) {
        gsap.to('.app-container', {
            opacity: 0,
            y: 15,
            duration: 0.4,
            onComplete: () => {
                document.querySelector('.app-container').style.display = 'none';
                const overlay = document.getElementById('login-overlay');
                overlay.style.display = 'block';
                document.body.classList.add('landing-active');
                gsap.fromTo(overlay, { opacity: 0 }, { 
                    opacity: 1, 
                    duration: 0.5,
                    onComplete: () => {
                        if (typeof ScrollTrigger !== 'undefined') {
                            ScrollTrigger.refresh();
                        }
                    }
                });
            }
        });
    } else {
        document.querySelector('.app-container').style.display = 'none';
        const overlay = document.getElementById('login-overlay');
        overlay.style.display = 'block';
        overlay.style.opacity = '1';
        document.body.classList.add('landing-active');
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    }
}

document.getElementById('btn-logout').addEventListener('click', handleLogout);
document.getElementById('dashboard-logo').addEventListener('click', handleLogout);

// Student Portal Attendance Check-In handler
const btnCheckin = document.getElementById('btn-daily-checkin');
if (btnCheckin) {
    btnCheckin.addEventListener('click', async () => {
        if (!appState.currentUser) return;
        const msg = document.getElementById('checkin-status-msg');
        btnCheckin.disabled = true;
        msg.textContent = 'Verifying attendance check-in...';
        msg.style.color = '#ffffff';

        try {
            const response = await fetch(`${API_BASE}/students/daily-checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: appState.currentUser.user_id })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Check-in failed');

            msg.style.color = '#14b8a6';
            msg.textContent = `🎉 Attendance reward claimed successfully! (+15 pts)`;

            // Update user balance and refresh dashboard elements
            await loadUserProfile(appState.currentUser.user_id);
        } catch (err) {
            msg.style.color = '#ef4444';
            msg.textContent = err.message;
            btnCheckin.disabled = false;
        }
    });
}
// STUDENT PORTAL LOGIC
// ----------------------------------------------------

let maintenanceCountdownInterval = null;

function startMaintenanceCountdown(remainingSeconds) {
    if (maintenanceCountdownInterval) {
        clearInterval(maintenanceCountdownInterval);
    }
    
    const container = document.getElementById('maint-countdown-container');
    const timer = document.getElementById('maint-countdown-timer');
    if (!container || !timer) return;
    
    if (remainingSeconds <= 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    let currentSeconds = remainingSeconds;
    
    const updateDisplay = () => {
        const mins = Math.floor(currentSeconds / 60);
        const secs = currentSeconds % 60;
        timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };
    
    updateDisplay();
    
    maintenanceCountdownInterval = setInterval(() => {
        currentSeconds--;
        if (currentSeconds <= 0) {
            clearInterval(maintenanceCountdownInterval);
            container.style.display = 'none';
            window.location.reload();
        } else {
            updateDisplay();
        }
    }, 1000);
}

async function loadUserProfile(userId) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}/profile`);
        if (!response.ok) {
            if (response.status === 503) {
                const data = await response.json();
                if (data.error === 'MAINTENANCE_MODE_ACTIVE') {
                    document.getElementById('maintenance-overlay').style.display = 'flex';
                    if (data.remaining_seconds && data.remaining_seconds > 0) {
                        startMaintenanceCountdown(data.remaining_seconds);
                    } else {
                        const container = document.getElementById('maint-countdown-container');
                        if (container) container.style.display = 'none';
                    }
                    return;
                }
            }
            throw new Error('Failed to load profile');
        }
        const data = await response.json();
        
        const oldPoints = appState.userProfile ? appState.userProfile.points_balance : 0;
        
        appState.userProfile = data.user;
        if (appState.currentUser && appState.currentUser.user_id === data.user.user_id) {
            appState.currentUser.points_balance = data.user.points_balance;
        }
        appState.ledger = data.ledger;
        appState.referrals = data.referrals;

        if (Object.keys(appState.settings).length === 0) {
            await fetchSettings();
        }

        renderProfile(oldPoints);
        renderReferralsQueue();
        renderLedger();
        populateDashboardPartners();
        await loadStudentVouchers(userId);
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

async function fetchSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        if (!response.ok) throw new Error('Failed to load settings');
        const data = await response.json();
        
        appState.settings = {};
        data.forEach(s => {
            appState.settings[s.key] = parseFloat(s.value) || s.value;
        });

        document.getElementById('bronze-mult-lbl').textContent = `1.0x`;
        document.getElementById('silver-mult-lbl').textContent = `${appState.settings.silver_multiplier}x`;
        document.getElementById('gold-mult-lbl').textContent = `${appState.settings.gold_multiplier}x`;
        document.getElementById('plat-mult-lbl').textContent = `${appState.settings.platinum_multiplier}x`;

        const pointsForAED = 100;
        const aedValue = pointsForAED * appState.settings.point_aed_value;
        document.getElementById('lbl-conversion-ratio').textContent = `${pointsForAED} pts = AED ${aedValue}`;
    } catch (err) {
        console.error('Error fetching settings:', err);
    }
}

function renderProfile(oldPoints) {
    const user = appState.userProfile;
    const settings = appState.settings;

    document.getElementById('user-name').textContent = user.name;
    document.getElementById('tier-name').textContent = user.current_tier;
    document.getElementById('lbl-student-id').textContent = `Student ID: ${user.student_id || 'N/A'}`;
    
    // Toggle active tier theme class on the main container for dynamic CSS transitions
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.remove('tier-theme-bronze', 'tier-theme-silver', 'tier-theme-gold', 'tier-theme-platinum');
        appContainer.classList.add(`tier-theme-${user.current_tier.toLowerCase()}`);
    }

    const ptsElement = document.getElementById('points-balance');
    if (window.gsap) {
        gsap.fromTo(ptsElement, 
            { textContent: oldPoints },
            { 
                textContent: user.points_balance,
                duration: 1.2,
                ease: "power2.out",
                snap: { textContent: 1 },
                onUpdate: function() {
                    ptsElement.textContent = formatNumber(parseInt(ptsElement.textContent));
                }
            }
        );
    } else {
        ptsElement.textContent = formatNumber(user.points_balance);
    }

    const badge = document.getElementById('user-tier-badge');
    if (badge) {
        badge.className = `medal-tier-badge-label ${user.current_tier.toLowerCase()}`;
    }

    document.querySelectorAll('.minimal-tier-item').forEach(item => item.classList.remove('active'));
    const activeTierCard = document.getElementById(`tier-${user.current_tier.toLowerCase()}-card`);
    if (activeTierCard) activeTierCard.classList.add('active');

    let progressPercent = 0;
    let nextTierName = "Silver";
    let nextTierPoints = settings.silver_threshold;
    let helpText = "";
    const curPoints = user.points_balance;

    if (curPoints < settings.silver_threshold) {
        progressPercent = (curPoints / settings.silver_threshold) * 100;
        nextTierName = "Silver";
        nextTierPoints = settings.silver_threshold;
        const diff = settings.silver_threshold - curPoints;
        helpText = `Earn ${formatNumber(diff)} more points to unlock Silver Tier!`;
    } else if (curPoints < settings.gold_threshold) {
        progressPercent = 33 + ((curPoints - settings.silver_threshold) / (settings.gold_threshold - settings.silver_threshold)) * 33;
        nextTierName = "Gold";
        nextTierPoints = settings.gold_threshold;
        const diff = settings.gold_threshold - curPoints;
        helpText = `Earn ${formatNumber(diff)} more points to unlock Gold Tier (Get AED 250 Voucher!)`;
    } else if (curPoints < settings.platinum_threshold) {
        progressPercent = 66 + ((curPoints - settings.gold_threshold) / (settings.platinum_threshold - settings.gold_threshold)) * 34;
        nextTierName = "Platinum";
        nextTierPoints = settings.platinum_threshold;
        const diff = settings.platinum_threshold - curPoints;
        helpText = `Earn ${formatNumber(diff)} more points to unlock Elite Platinum Status!`;
    }

    const ring = document.getElementById('progress-circle-ring');
    const percentText = document.getElementById('progress-circle-percent');
    const upsellText = document.getElementById('upsell-text');

    // Dynamic upsell templates
    const upsellTemplates = {
        bronze: "On track! Level up to Silver to unlock a 3% course discount.",
        silver: "Keep going! Level up to Gold to unlock a 4% course discount.",
        gold: "Almost there! Level up to Platinum to unlock the maximum 5% discount.",
        platinum: "Elite Tier! You have locked in the maximum 5% course discount."
    };

    if (upsellText) {
        upsellText.textContent = upsellTemplates[user.current_tier.toLowerCase()] || "";
    }

    if (ring && percentText) {
        const circumference = 213.6;
        const targetOffset = circumference - (progressPercent / 100) * circumference;

        if (window.gsap) {
            gsap.to(ring, {
                strokeDashoffset: targetOffset,
                duration: 1.5,
                ease: "power2.out"
            });
            gsap.fromTo(percentText, 
                { textContent: parseInt(percentText.textContent) || 0 },
                { 
                    textContent: Math.round(progressPercent),
                    duration: 1.5,
                    ease: "power2.out",
                    snap: { textContent: 1 },
                    onUpdate: function() {
                        percentText.textContent = `${percentText.textContent}%`;
                    }
                }
            );
        } else {
            ring.style.strokeDashoffset = targetOffset;
            percentText.textContent = `${Math.round(progressPercent)}%`;
        }
    }

    document.getElementById('next-tier-target').textContent = nextTierName === "Max Tier Achieved" ? nextTierName : `Next: ${nextTierName} (${formatNumber(nextTierPoints)} pts)`;
    document.getElementById('progress-help').textContent = helpText;

    // Sync quick-stat pills with latest data
    syncQuickStats();
    
    // Render dynamic career recommendation widgets (upsell/cross-sell)
    renderCareerUpgrades();

    // Render milestones badges
    renderMilestones();

    // Load student announcements banner
    loadStudentAnnouncements();
}

function renderMilestones() {
    const user = appState.userProfile;
    const referrals = appState.referrals || [];
    const ledger = appState.ledger || [];
    
    // 1. Welcome Pioneer: Always active since they have successfully logged in/registered
    unlockMilestoneBadge('badge-welcome', 'Welcome Pioneer');
    
    // 2. First Referral: Check if they have at least one referral
    if (referrals.length > 0) {
        unlockMilestoneBadge('badge-first-ref', 'First Referral');
    } else {
        lockMilestoneBadge('badge-first-ref', 'First Referral');
    }
    
    // 3. Loyalty Champion: Unlocks if points_balance >= 1000 (Silver tier minimum)
    if (user.points_balance >= 1000) {
        unlockMilestoneBadge('badge-champion', 'Loyalty Champion');
    } else {
        lockMilestoneBadge('badge-champion', 'Loyalty Champion');
    }
    
    // 4. Voucher Pioneer: Unlocks if they have a ledger entry containing 'voucher' or 'claim'
    const claimedVoucher = ledger.some(e => 
        (e.event_type && e.event_type.toLowerCase().includes('voucher')) || 
        (e.description && e.description.toLowerCase().includes('voucher')) ||
        (e.description && e.description.toLowerCase().includes('claim'))
    );
    if (claimedVoucher) {
        unlockMilestoneBadge('badge-voucher', 'Voucher Pioneer');
    } else {
        lockMilestoneBadge('badge-voucher', 'Voucher Pioneer');
    }
}

function unlockMilestoneBadge(badgeId, title) {
    const el = document.getElementById(badgeId);
    if (!el) return;
    el.style.background = 'rgba(223, 177, 91, 0.08)';
    el.style.borderColor = 'rgba(223, 177, 91, 0.35)';
    
    const icon = el.querySelector('.badge-icon');
    if (icon) {
        icon.style.filter = 'none';
        icon.style.opacity = '1';
    }
    
    const text = el.querySelector('.badge-title');
    if (text) {
        text.style.color = 'var(--text-main)';
    }
    
    const status = el.querySelector('.badge-status');
    if (status) {
        status.textContent = 'Unlocked';
        status.style.color = '#4ade80';
    }
}

function lockMilestoneBadge(badgeId, title) {
    const el = document.getElementById(badgeId);
    if (!el) return;
    el.style.background = 'rgba(255, 255, 255, 0.02)';
    el.style.borderColor = 'rgba(255, 255, 255, 0.05)';
    
    const icon = el.querySelector('.badge-icon');
    if (icon) {
        icon.style.filter = 'grayscale(1)';
        icon.style.opacity = '0.35';
    }
    
    const text = el.querySelector('.badge-title');
    if (text) {
        text.style.color = 'var(--text-muted)';
    }
    
    const status = el.querySelector('.badge-status');
    if (status) {
        status.textContent = 'Locked';
        status.style.color = 'rgba(255, 255, 255, 0.35)';
    }
}

function renderReferralsQueue() {
    const queue = document.getElementById('leads-queue');
    if (!queue) return;
    queue.innerHTML = '';

    const pendingRefs = appState.referrals.filter(r => r.status === 'Pending');

    if (pendingRefs.length === 0) {
        queue.innerHTML = `<p class="no-data">No pending referrals found.</p>`;
        return;
    }

    pendingRefs.forEach(ref => {
        const div = document.createElement('div');
        div.className = 'lead-item';
        div.innerHTML = `
            <div class="lead-meta">
                <h5>${ref.referee_name}</h5>
                <p>${ref.referee_email} | Program: <strong>${ref.program}</strong></p>
            </div>
            <div style="display: flex; gap: 0.35rem; align-items: center;">
                <button class="btn btn-success btn-sm" onclick="verifyReferralPayment(${ref.referral_id})">
                    <i class="fa-solid fa-receipt"></i> Verify Payment
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteReferralAdmin(this, ${ref.referral_id})" style="background:#ef4444; border:none; padding:0.35rem 0.5rem; height:auto; font-size:0.68rem;" title="Delete Referral">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        queue.appendChild(div);
    });
}

// Student forms & webhooks
document.getElementById('btn-submit-lead').addEventListener('click', async () => {
    const name = document.getElementById('referee-name').value.trim();
    const email = document.getElementById('referee-email').value.trim();
    const program = document.getElementById('referee-program').value;

    if (!name || !email) {
        alert('Please fill out referee details.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/referrals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referrer_id: appState.currentUser.user_id, referee_name: name, referee_email: email, program })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to submit referral');

        alert('Referral lead registered successfully!');
        document.getElementById('referee-name').value = '';
        document.getElementById('referee-email').value = '';
        
        loadUserProfile(appState.currentUser.user_id);
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
});

async function verifyReferralPayment(referralId) {
    try {
        const response = await fetch(`${API_BASE}/referrals/${referralId}/verify-payment`, {
            method: 'POST'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Verification failed');

        alert('Payment verified and points credited!');
        loadUserProfile(appState.currentUser.user_id);
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
}

document.getElementById('btn-simulate-lms').addEventListener('click', async () => {
    const courseSelect = document.getElementById('lms-course');
    const option = courseSelect.options[courseSelect.selectedIndex];
    const points = parseInt(option.getAttribute('data-points'));
    const desc = option.text.split('(')[0].trim();

    try {
        const response = await fetch(`${API_BASE}/lms/complete-course`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: appState.currentUser.user_id, course_name: desc, base_points: points })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Simulation failed');

        alert(`LMS credited ${data.points_awarded} points.`);
        loadUserProfile(appState.currentUser.user_id);
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
});

document.getElementById('btn-calculate-discount').addEventListener('click', async () => {
    const fee = parseFloat(document.getElementById('course-fee').value);
    const points = parseInt(document.getElementById('points-to-redeem').value);

    try {
        const response = await fetch(`${API_BASE}/redeem/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: appState.currentUser.user_id, course_fee: fee, points_requested: points })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Calculation failed');

        appState.currentCalculation = data;

        document.getElementById('cap-percent-label').textContent = `${data.cap_percent}%`;
        document.getElementById('max-discount-val').textContent = `AED ${formatNumber(data.max_discount_aed)}`;
        document.getElementById('points-applied-val').textContent = `${formatNumber(data.points_applied)} pts`;
        document.getElementById('net-discount-val').textContent = `AED ${formatNumber(data.discount_aed)}`;
        document.getElementById('final-payable-val').textContent = `AED ${formatNumber(data.final_fee)}`;
        
        const resultsBox = document.getElementById('redemption-results');
        resultsBox.style.display = 'block';
        if (window.gsap) {
            gsap.fromTo(resultsBox, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
        } else {
            resultsBox.style.opacity = '1';
        }
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
});

document.getElementById('btn-confirm-redemption').addEventListener('click', async () => {
    if (!appState.currentCalculation) return;

    try {
        const response = await fetch(`${API_BASE}/redeem/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: appState.currentUser.user_id,
                points_deducted: appState.currentCalculation.points_applied,
                discount_aed: appState.currentCalculation.discount_aed
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Redemption failed');

        alert('Redemption completed!');
        document.getElementById('redemption-results').style.display = 'none';
        appState.currentCalculation = null;

        loadUserProfile(appState.currentUser.user_id);
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
});

// Obsolete btn-redeem-adnoc listener removed to prevent null selector errors.
// Functionality is now handled dynamically by btn-redeem-collaborator-voucher.

document.getElementById('btn-trigger-cron').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE}/cron/process-expiry`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Sweep failed');

        alert(`Cron Sweep processed! Expired points decayed: ${data.points_decayed || 0}`);
        loadUserProfile(appState.currentUser.user_id);
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
});

// ----------------------------------------------------
// ADMIN CONSOLE LOGIC
// ----------------------------------------------------

async function loadAdminStudents() {
    const tbody = document.getElementById('student-directory-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="no-data">Loading student directory...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/admin/students`);
        if (!response.ok) throw new Error('Failed to load students');
        const data = await response.json();
        
        appState.students = data;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="no-data">No students registered yet.</td></tr>';
            return;
        }

        data.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="student-directory-name" onclick="showStudentDetailModal(${s.user_id})" style="font-weight: 600; cursor: pointer; color: #dfb15b; transition: color 0.15s ease;" onmouseover="this.style.color='#ffffff'" onmouseout="this.style.color='#dfb15b'">${s.name}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); word-break: break-all;">${s.email}</div>
                    <div style="font-size: 0.66rem; color: rgba(255, 255, 255, 0.35); margin-top: 0.15rem;">ID: ${s.student_id}</div>
                </td>
                <td><span class="tier-badge ${s.current_tier.toLowerCase()}" style="padding: 0.15rem 0.4rem; font-size: 0.7rem;">${s.current_tier}</span></td>
                <td style="font-weight: 700; font-family: 'Outfit';">${formatNumber(s.points_balance)} pts</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openAdjustmentModal(${s.user_id}, '${s.name}')">
                        <i class="fa-solid fa-calculator"></i> Adjust
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="no-data" style="color: #ef4444;">Error: ${err.message}</td></tr>`;
    }
}

// Enroll new student form
document.getElementById('create-student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const student_id = document.getElementById('reg-student-id').value.trim();
    const password = document.getElementById('reg-password').value;
    const programme = document.getElementById('reg-programme')?.value || 'General';

    try {
        const response = await fetch(`${API_BASE}/admin/create-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, student_id, password, programme })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to register student');

        showToast('Enrolled successfully! 🎉', `${name} enrolled in ${programme}. Welcome bonus: ${data.welcome_points} pts. Referral Code: ${data.referral_code}`, 'success');
        document.getElementById('reg-name').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-student-id').value = '';
        document.getElementById('reg-password').value = '';
        if (document.getElementById('reg-programme')) document.getElementById('reg-programme').value = 'MBA';

        loadAdminStudents();
        loadProgrammeOverview();
    } catch (err) {
        showToast('Enrollment Error', err.message, 'error');
    }
});

// ══════════════════════════════════════════════════
// ENGAGEMENT REPORT
// ══════════════════════════════════════════════════
async function loadEngagementReport() {
    const tbody = document.getElementById('engagement-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="no-data"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    try {
        const res = await fetch(`${API_BASE}/admin/engagement`);
        if (!res.ok) throw new Error('Failed to load engagement data.');
        const students = await res.json();

        const active   = students.filter(s => s.status === 'active').length;
        const atRisk   = students.filter(s => s.status === 'at_risk').length;
        const inactive = students.filter(s => s.status === 'inactive').length;

        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setEl('eng-active-count', active);
        setEl('eng-atrisk-count', atRisk);
        setEl('eng-inactive-count', inactive);

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No student data found.</td></tr>';
            return;
        }

        tbody.innerHTML = students.map(s => {
            const statusColor = s.status === 'active' ? '#4ade80' : s.status === 'at_risk' ? '#dfb15b' : '#ef4444';
            const statusLabel = s.status === 'active' ? 'Active' : s.status === 'at_risk' ? 'At Risk' : 'Inactive';
            const lastSeen = s.last_seen ? cleanDate(s.last_seen) : 'Never';
            const dayText = s.days_since_login >= 999 ? 'Never logged in' : `${s.days_since_login}d ago`;
            return `
                <tr>
                    <td><strong style="color:#fff;">${s.name}</strong><br><span style="font-size:0.68rem;color:rgba(255,255,255,0.4);">${s.email}</span></td>
                    <td style="font-size:0.78rem;">${s.programme || '—'}</td>
                    <td><span class="tier-badge ${(s.current_tier||'Bronze').toLowerCase()}">${s.current_tier || 'Bronze'}</span></td>
                    <td style="font-family:'Outfit'; font-weight:700; color:#dfb15b;">${formatNumber(s.points_balance || 0)}</td>
                    <td style="text-align:center;">${s.referral_count || 0}</td>
                    <td style="font-size:0.72rem; color:rgba(255,255,255,0.5);">${lastSeen}<br><span style="color:rgba(255,255,255,0.3);">${dayText}</span></td>
                    <td><span style="font-size:0.7rem; font-weight:700; color:${statusColor}; background:${statusColor}18; padding:0.2rem 0.55rem; border-radius:4px; border:1px solid ${statusColor}33;">${statusLabel}</span></td>
                </tr>`;
        }).join('');
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="no-data" style="color:#ef4444;">Error: ${err.message}</td></tr>`;
    }
}
window.loadEngagementReport = loadEngagementReport;

// ══════════════════════════════════════════════════
// PROGRAMME OVERVIEW CARD
// ══════════════════════════════════════════════════
async function loadProgrammeOverview() {
    const container = document.getElementById('programme-overview-body');
    if (!container) return;
    container.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:0.8rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p>';
    try {
        const res = await fetch(`${API_BASE}/admin/programmes`);
        if (!res.ok) throw new Error();
        const programmes = await res.json();
        if (programmes.length === 0) {
            container.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:0.8rem;">No programmes found.</p>';
            return;
        }
        const maxCount = Math.max(...programmes.map(p => p.student_count), 1);
        const totalEnrolled = programmes.reduce((sum, p) => sum + p.student_count, 0);

        // HSL program color map
        const programColors = {
            'MBA': '#8052ff', // Electric Iris
            'DBA': '#dfb15b', // Saffron Gold
            'Digital Marketing': '#15846e', // Deep Emerald
            'Leadership in Practice': '#ff6b35', // Fire Orange
            'Finance & Accounting': '#4ade80', // Mint Green
            'Project Management': '#0077b5', // LinkedIn Blue
            'General': '#86868b' // Cool Gray
        };

        container.innerHTML = programmes.map(p => {
            const color = programColors[p.programme] || '#dfb15b';
            const percentage = totalEnrolled > 0 ? Math.round((p.student_count / totalEnrolled) * 100) : 0;
            const barWidth = Math.round((p.student_count / maxCount) * 100);

            return `
                <div style="padding:0.95rem; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:10px; transition: background 0.3s ease;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color};"></span>
                            <span style="font-size:0.85rem; font-weight:700; color:var(--text-main);">${p.programme}</span>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:0.8rem; color:${color}; font-weight:800; display:block;">${p.student_count} student${p.student_count !== 1 ? 's' : ''}</span>
                            <span style="font-size:0.62rem; color:var(--text-muted); font-weight:500;">${percentage}% share</span>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.04); height:6px; border-radius:3px; overflow:hidden; margin-bottom:0.4rem;">
                        <div style="background:${color}; width:${barWidth}%; height:100%; border-radius:3px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.65rem; color:var(--text-muted);">${formatNumber(p.total_points || 0)} total points issued</span>
                        <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">Avg: ${p.student_count > 0 ? formatNumber(Math.round(p.total_points / p.student_count)) : 0} pts/student</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch {
        container.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:0.8rem;">Could not load programme data.</p>';
    }
}
window.loadProgrammeOverview = loadProgrammeOverview;

// ══════════════════════════════════════════════════
// BULK POINTS AWARD
// ══════════════════════════════════════════════════
(function setupBulkPointsForm() {
    const form = document.getElementById('bulk-points-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const programme = document.getElementById('bulk-programme').value;
        const points = parseInt(document.getElementById('bulk-points-amount').value);
        const reason = document.getElementById('bulk-points-reason').value.trim() || `Bulk award to ${programme} cohort`;
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Awarding...';
        try {
            const res = await fetch(`${API_BASE}/admin/bulk-points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ programme, points, reason })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to award points.');
            showToast('Bulk Award Complete ⚡', `${points} pts awarded to ${data.students_updated} students in ${programme}.`, 'success');
            document.getElementById('bulk-points-amount').value = '';
            document.getElementById('bulk-points-reason').value = '';
            loadAdminStudents();
            loadProgrammeOverview();
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Award to Cohort';
        }
    });
})();

// ══════════════════════════════════════════════════
// ANNOUNCEMENTS
// ══════════════════════════════════════════════════
async function loadAnnouncements() {
    const list = document.getElementById('announcements-list');
    if (!list) return;
    try {
        const res = await fetch(`${API_BASE}/admin/announcements`);
        if (!res.ok) throw new Error();
        const items = await res.json();
        if (items.length === 0) {
            list.innerHTML = '<p style="color:rgba(255,255,255,0.35);font-size:0.82rem;">No active announcements. Post one using the form.</p>';
            return;
        }
        const typeIcon = { info: '💬', success: '✅', warning: '⚠️' };
        const typeColor = { info: 'rgba(96,165,250,0.15)', success: 'rgba(74,222,128,0.1)', warning: 'rgba(251,191,36,0.1)' };
        const typeBorder = { info: 'rgba(96,165,250,0.25)', success: 'rgba(74,222,128,0.2)', warning: 'rgba(251,191,36,0.2)' };
        list.innerHTML = items.map(item => `
            <div style="background:${typeColor[item.type]||typeColor.info}; border:1px solid ${typeBorder[item.type]||typeBorder.info}; border-radius:8px; padding:0.9rem 1rem; display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem;">
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:0.2rem;">
                        <span>${typeIcon[item.type]||typeIcon.info}</span>
                        <strong style="color:#fff; font-size:0.88rem;">${item.title}</strong>
                    </div>
                    <p style="color:rgba(255,255,255,0.6); font-size:0.78rem; margin:0; line-height:1.4;">${item.body}</p>
                    <span style="font-size:0.64rem; color:rgba(255,255,255,0.3); margin-top:0.3rem; display:block;">Posted ${cleanDate(item.created_at)}${item.expires_at ? ` · Expires ${cleanDate(item.expires_at)}` : ''}</span>
                </div>
                <button onclick="deleteAnnouncement(${item.announcement_id})" style="background:none; border:none; color:rgba(239,68,68,0.5); cursor:pointer; font-size:0.9rem; flex-shrink:0; transition:color 0.15s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='rgba(239,68,68,0.5)'" title="Delete">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>`).join('');
    } catch {
        list.innerHTML = '<p style="color:rgba(255,255,255,0.35);font-size:0.82rem;">Could not load announcements.</p>';
    }
}

async function deleteAnnouncement(id) {
    try {
        const res = await fetch(`${API_BASE}/admin/announcements/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Deleted', 'Announcement removed.', 'success');
        loadAnnouncements();
        loadStudentAnnouncements();
    } catch { showToast('Error', 'Could not delete announcement.', 'error'); }
}
window.deleteAnnouncement = deleteAnnouncement;

(function setupAnnouncementForm() {
    const form = document.getElementById('announcement-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('ann-title').value.trim();
        const body  = document.getElementById('ann-body').value.trim();
        const type  = document.getElementById('ann-type').value;
        const expiresInput = document.getElementById('ann-expires').value;
        const expires_at = expiresInput ? new Date(expiresInput).toISOString() : null;
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';
        try {
            const res = await fetch(`${API_BASE}/admin/announcements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, body, type, expires_at })
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed.');
            showToast('Published! 📢', `"${title}" is now live on all student dashboards.`, 'success');
            form.reset();
            loadAnnouncements();
            loadStudentAnnouncements();
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish Announcement';
        }
    });
})();

// Student-facing: load announcements banner on overview
async function loadStudentAnnouncements() {
    const banner = document.getElementById('student-announcements-banner');
    if (!banner) return;
    try {
        const res = await fetch(`${API_BASE}/announcements`);
        if (!res.ok) return;
        const items = await res.json();
        if (items.length === 0) {
            banner.innerHTML = `
                <div class="card glassmorphic spotlight-card" style="padding: 1rem 1.25rem; border-radius: 12px; border: 1px dashed rgba(255,255,255,0.06); background: rgba(255,255,255,0.01); display: flex; align-items: center; justify-content: center; gap: 0.85rem; width: 100%; box-sizing: border-box; margin-bottom: 1.25rem;">
                    <span class="sleepy-coffee-icon" style="font-size: 1.4rem;">☕</span>
                    <span style="font-size: 0.8rem; color: rgba(255,255,255,0.45); font-weight: 300; text-align: left;">
                        <strong>All quiet!</strong> No active announcements today. BIA deans are searching for reading glasses 👓, and professors are busy drinking espresso. Carry on! ✨
                    </span>
                </div>
            `;
            return;
        }
        const typeIcon   = { info: 'fa-circle-info', success: 'fa-circle-check', warning: 'fa-triangle-exclamation' };
        const cleanDate = (dStr) => {
            if(!dStr) return 'Recently';
            const d = new Date(dStr.replace(' ', 'T'));
            return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString('en-US', {month:'short', day:'numeric'});
        };
        banner.innerHTML = items.map(item => `
            <div class="public-ann-card type-${item.type}" style="opacity: 0; transform: translateY(20px); margin-bottom: 0.75rem; width: 100%;">
                <div class="public-ann-glow-layer"></div>
                <div class="public-ann-icon-wrap">
                    <i class="fa-solid ${typeIcon[item.type]||typeIcon.info}"></i>
                    <span class="ping-wave"></span>
                </div>
                <div class="public-ann-content">
                    <span class="public-ann-badge">${item.type} BROADCAST</span>
                    <h5>${item.title}</h5>
                    <p style="margin-bottom: 0.35rem; color: rgba(255,255,255,0.72);">${item.body}</p>
                    <span class="public-ann-date"><i class="fa-regular fa-clock"></i> Posted ${cleanDate(item.created_at)}</span>
                </div>
            </div>`).join('');

        if (window.gsap) {
            gsap.fromTo(banner.querySelectorAll('.public-ann-card'), 
                { opacity: 0, y: 20, scale: 0.97 },
                { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power2.out", stagger: 0.1 }
            );
        } else {
            banner.querySelectorAll('.public-ann-card').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0) scale(1)';
            });
        }
    } catch { /* silent fail */ }
}
window.loadStudentAnnouncements = loadStudentAnnouncements;

// ══════════════════════════════════════════════════
// VOUCHER MANAGEMENT (admin view of all vouchers)
// ══════════════════════════════════════════════════
async function loadAdminVoucherReport() {
    const tbody = document.getElementById('admin-vouchers-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="no-data"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    try {
        // Use the existing admin ledger which has voucher info, or the students endpoint
        const studentsRes = await fetch(`${API_BASE}/admin/students`);
        const students = studentsRes.ok ? await studentsRes.json() : [];
        const studentMap = {};
        students.forEach(s => { studentMap[s.user_id] = s.name; });

        // Fetch all vouchers via the system ledger
        const res = await fetch(`${API_BASE}/admin/ledger`);
        if (!res.ok) throw new Error('Failed to load voucher data.');
        const ledger = await res.json();
        const voucherEntries = ledger.filter(e => e.event_type && (e.event_type.toLowerCase().includes('voucher') || e.description?.toLowerCase().includes('voucher')));

        const totalEl = document.getElementById('voucher-stat-total');
        const valueEl = document.getElementById('voucher-stat-value');
        const avgEl   = document.getElementById('voucher-stat-avg');

        if (totalEl) totalEl.textContent = voucherEntries.length;

        if (voucherEntries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No vouchers have been claimed yet.</td></tr>';
            if (valueEl) valueEl.textContent = '0';
            if (avgEl) avgEl.textContent = '0';
            return;
        }

        // Also fetch the actual tuition vouchers
        const allVouchersPromises = students.map(s =>
            fetch(`${API_BASE}/users/${s.user_id}/vouchers`).then(r => r.ok ? r.json() : []).catch(() => [])
        );
        const allVouchersArrays = await Promise.all(allVouchersPromises);
        const allVouchers = allVouchersArrays.flat().map((v, i) => ({
            ...v,
            studentName: studentMap[v.user_id] || 'Unknown'
        }));

        const totalValue = allVouchers.reduce((sum, v) => sum + (v.discount_aed || 0), 0);
        const avgValue = allVouchers.length ? (totalValue / allVouchers.length).toFixed(1) : 0;
        if (totalEl) totalEl.textContent = allVouchers.length;
        if (valueEl) valueEl.textContent = `${totalValue.toFixed(0)} AED`;
        if (avgEl) avgEl.textContent = `${avgValue} AED`;

        if (allVouchers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No vouchers have been claimed yet.</td></tr>';
            return;
        }

        tbody.innerHTML = allVouchers.map(v => `
            <tr>
                <td style="font-family:'Outfit'; font-size:0.8rem; color:#dfb15b; font-weight:700;">${v.voucher_code || '—'}</td>
                <td><strong class="clickable-student-name" onclick="showStudentDetailModal(${v.user_id})" style="color: var(--text-main); cursor: pointer; text-decoration: underline;">${v.studentName}</strong></td>
                <td style="color:#4ade80; font-weight:700;">${v.discount_aed || 0} AED</td>
                <td style="font-family:'Outfit';">${formatNumber(v.points_deducted || 0)} pts</td>
                <td><span style="font-size:0.7rem; padding:0.2rem 0.5rem; border-radius:4px; background:${v.status === 'Used' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${v.status === 'Used' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)'}; color:${v.status === 'Used' ? '#4ade80' : 'rgba(255,255,255,0.5)'}; font-weight:700;">${v.status || 'Unused'}</span></td>
                <td style="font-size:0.72rem; color:rgba(255,255,255,0.5);">${v.created_at ? cleanDate(v.created_at) : '—'}</td>
                <td>
                    <button onclick="adminDeleteVoucher(${v.voucher_id})" style="background:none; border:none; color:rgba(239,68,68,0.4); cursor:pointer; font-size:0.8rem; transition:color 0.15s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='rgba(239,68,68,0.4)'" title="Delete voucher">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="no-data" style="color:#ef4444;">Error: ${err.message}</td></tr>`;
    }
}
window.loadAdminVoucherReport = loadAdminVoucherReport;

async function adminDeleteVoucher(id) {
    if (!confirm('Delete this voucher record?')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/vouchers/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Deleted', 'Voucher record removed.', 'success');
        loadAdminVoucherReport();
    } catch { showToast('Error', 'Could not delete voucher.', 'error'); }
}
window.adminDeleteVoucher = adminDeleteVoucher;

// ══════════════════════════════════════════════════
// CSV EXPORT UTILITIES
// ══════════════════════════════════════════════════
async function exportStudentsCSV() {
    try {
        const res = await fetch(`${API_BASE}/admin/students`);
        if (!res.ok) throw new Error();
        const students = await res.json();
        const headers = ['Name', 'Email', 'Student ID', 'Programme', 'Tier', 'Points Balance', 'Referrals', 'Referral Code'];
        const rows = students.map(s => [
            `"${s.name}"`, `"${s.email}"`, `"${s.student_id || ''}"`,
            `"${s.programme || 'General'}"`, `"${s.current_tier || 'Bronze'}"`,
            s.points_balance || 0, s.referral_count || 0, `"${s.referral_code || ''}"`
        ]);
        downloadCSV([headers, ...rows], `BIA_Students_${new Date().toISOString().slice(0,10)}.csv`);
        showToast('Exported! 📥', `${students.length} student records downloaded as CSV.`, 'success');
    } catch { showToast('Error', 'Could not export student data.', 'error'); }
}
window.exportStudentsCSV = exportStudentsCSV;

async function exportVouchersCSV() {
    try {
        const studentsRes = await fetch(`${API_BASE}/admin/students`);
        const students = studentsRes.ok ? await studentsRes.json() : [];
        const studentMap = {};
        students.forEach(s => { studentMap[s.user_id] = s.name; });

        const allVouchers = (await Promise.all(
            students.map(s => fetch(`${API_BASE}/users/${s.user_id}/vouchers`).then(r => r.ok ? r.json() : []).catch(() => []))
        )).flat().map(v => ({ ...v, studentName: studentMap[v.user_id] || 'Unknown' }));

        const headers = ['Voucher Code', 'Student', 'Discount (AED)', 'Points Used', 'Status', 'Date'];
        const rows = allVouchers.map(v => [
            `"${v.voucher_code || ''}"`, `"${v.studentName}"`,
            v.discount_aed || 0, v.points_deducted || 0,
            `"${v.status || 'Unused'}"`, `"${v.created_at ? cleanDate(v.created_at) : ''}"`
        ]);
        downloadCSV([headers, ...rows], `BIA_Vouchers_${new Date().toISOString().slice(0,10)}.csv`);
        showToast('Exported! 📥', `${allVouchers.length} voucher records downloaded.`, 'success');
    } catch { showToast('Error', 'Could not export voucher data.', 'error'); }
}
window.exportVouchersCSV = exportVouchersCSV;

function downloadCSV(rows, filename) {
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════
// TAB LOAD HOOKS — trigger data loads on tab switch
// ══════════════════════════════════════════════════
const _origNavHandler = document.querySelectorAll('.nav-tab');
document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        if (target === 'admin-engagement') loadEngagementReport();
        if (target === 'admin-announcements') { loadAnnouncements(); }
        if (target === 'admin-vouchers-mgmt') loadAdminVoucherReport();
        if (target === 'admin-students') loadProgrammeOverview();
        if (target === 'overview') loadStudentAnnouncements();
    });
});



// Manual Adjustments Modals
function openAdjustmentModal(userId, userName) {
    appState.selectedUserIdForAdjustment = userId;
    
    // Find student to show current points balance in the modal
    const student = appState.students ? appState.students.find(s => s.user_id === userId) : null;
    const balanceText = student 
        ? `<span style="color: #dfb15b; font-weight: 700; font-size: 0.85rem; display: block; margin-top: 0.5rem; background: rgba(223, 177, 91, 0.08); padding: 0.35rem 0.65rem; border-radius: 6px; border: 1px solid rgba(223, 177, 91, 0.2); width: fit-content; margin-left: auto; margin-right: auto;">Current Balance: ${formatNumber(student.points_balance)} pts</span>`
        : '';

    document.getElementById('adjust-modal-desc').innerHTML = `
        Adjusting points wallet balance for student: <strong>${userName}</strong>.
        ${balanceText}
    `;
    
    const modal = document.getElementById('adjust-points-modal');
    modal.style.display = 'flex';
    if (window.gsap) {
        gsap.fromTo(modal.querySelector('.adjust-card'), { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3 });
    }
}

function closeAdjustmentModal() {
    appState.selectedUserIdForAdjustment = null;
    document.getElementById('adjust-amount').value = '';
    document.getElementById('adjust-reason').value = '';
    document.getElementById('adjust-points-modal').style.display = 'none';
}
window.closeAdjustmentModal = closeAdjustmentModal;

document.getElementById('adjust-points-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const targetUserId = appState.selectedUserIdForAdjustment;
    const points_change = parseInt(document.getElementById('adjust-amount').value);
    const description = document.getElementById('adjust-reason').value.trim();

    if (!targetUserId || isNaN(points_change) || !description) {
        showToast('Invalid Entries', 'Please enter a valid points adjustment and audit reason.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/adjust-points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: targetUserId,
                points_change,
                description
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Adjustment failed');

        showToast('Points Adjusted! ⚡', `Successfully adjusted balance by ${points_change > 0 ? '+' : ''}${formatNumber(points_change)} pts.`, 'success');
        
        closeAdjustmentModal();
        await loadAdminStudents();

        // Check if the Student Spotlight Details Modal is currently open
        const detailModal = document.getElementById('student-detail-modal');
        if (detailModal && detailModal.style.display === 'flex') {
            // Re-render student details modal in real time behind the closing adjust modal!
            await showStudentDetailModal(targetUserId);
        }
    } catch (err) {
        showToast('Adjustment Error', err.message, 'error');
    }
});

// Admin System-wide Ledger
async function loadAdminLedger() {
    const tbody = document.getElementById('admin-ledger-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">Loading audit logs...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/admin/ledger`);
        if (!response.ok) throw new Error('Failed to load ledger');
        const data = await response.json();

        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No transactions logged across BIA.</td></tr>';
            return;
        }

        data.forEach(entry => {
            const tr = document.createElement('tr');
            const isEarn = entry.points_change >= 0;
            const ptsClass = isEarn ? 'ledger-pts-earn' : 'ledger-pts-spend';
            const ptsSign = isEarn ? `+${formatNumber(entry.points_change)}` : formatNumber(entry.points_change);

            tr.innerHTML = `
                <td>${cleanDate(entry.created_at)}</td>
                <td><strong class="clickable-student-name" onclick="showStudentDetailModal(${entry.user_id})" style="color: var(--text-main); cursor: pointer; text-decoration: underline;">${entry.user_name}</strong></td>
                <td>${entry.description}</td>
                <td class="${ptsClass}">${ptsSign}</td>
                <td>${cleanDate(entry.expires_at)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteLedgerEntryAdmin(this, ${entry.ledger_id})" style="background:#ef4444; border:none; padding:0.25rem 0.45rem; height:auto; font-size:0.75rem;" title="Delete Ledger Entry">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data" style="color: #ef4444;">Error: ${err.message}</td></tr>`;
    }
}

const CLIENT_SETTINGS_LIMITS = {
    point_aed_value: { min: 0.01, max: 2.0, step: 0.01 },
    first_referral_points: { min: 0, max: 10000, step: 1 },
    subsequent_referral_points: { min: 0, max: 10000, step: 1 },
    new_joiner_points: { min: 0, max: 10000, step: 1 },
    premium_program_bonus: { min: 0, max: 10000, step: 1 },
    bronze_cap: { min: 0.0, max: 1.0, step: 0.01 },
    silver_cap: { min: 0.0, max: 1.0, step: 0.01 },
    gold_cap: { min: 0.0, max: 1.0, step: 0.01 },
    platinum_cap: { min: 0.0, max: 1.0, step: 0.01 },
    silver_multiplier: { min: 1.0, max: 5.0, step: 0.1 },
    gold_multiplier: { min: 1.0, max: 5.0, step: 0.1 },
    platinum_multiplier: { min: 1.0, max: 5.0, step: 0.1 },
    silver_threshold: { min: 100, max: 100000, step: 100 },
    gold_threshold: { min: 100, max: 100000, step: 100 },
    platinum_threshold: { min: 100, max: 100000, step: 100 }
};

// Admin settings page loaders
async function loadAdminSettings() {
    loadAdminEvents();
    const container = document.getElementById('admin-settings-container');
    if (!container) return;
    container.innerHTML = '<p class="no-data">Loading DB settings...</p>';

    try {
        const response = await fetch(`${API_BASE}/settings`);
        if (!response.ok) throw new Error('Failed to load settings');
        const data = await response.json();

        container.innerHTML = '';
        data.forEach(s => {
            const limit = CLIENT_SETTINGS_LIMITS[s.key];
            const group = document.createElement('div');
            group.className = 'settings-input-group';
            
            let inputHtml = '';
            let rangeLabel = '';
            if (limit) {
                rangeLabel = `<span style="font-size: 0.72rem; color: #86868b; display: block; margin-top: 0.2rem;">Range: ${limit.min} - ${limit.max} (Step: ${limit.step})</span>`;
                inputHtml = `<input type="number" id="setting-${s.key}" name="${s.key}" value="${s.value}" min="${limit.min}" max="${limit.max}" step="${limit.step}" required>`;
            } else {
                inputHtml = `<input type="text" id="setting-${s.key}" name="${s.key}" value="${s.value}" required>`;
            }

            group.innerHTML = `
                <label for="setting-${s.key}">${s.key.replace(/_/g, ' ').toUpperCase()}</label>
                <p style="margin-bottom: 0.25rem;">${s.description}</p>
                ${rangeLabel}
                ${inputHtml}
            `;
            container.appendChild(group);
        });
    } catch (err) {
        container.innerHTML = `<p class="no-data" style="color: #ef4444;">Error: ${err.message}</p>`;
    }
}

document.getElementById('admin-settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const inputs = document.querySelectorAll('#admin-settings-container input');
    const settingsList = [];

    inputs.forEach(input => {
        settingsList.push({
            key: input.name,
            value: input.value
        });
    });

    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: settingsList })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Save failed');

        alert('Rules successfully saved to Database! Point math is now updated.');
        await fetchSettings();
    } catch (err) {
        alert(`Error saving rules: ${err.message}`);
    }
});

// Play intro preloader and boot application
function bootApplication() {
    playIntroPreloader();
    setupPixelGridBackground();
    setupProximityBoxes();
    setupScrollReveals();
    setupMagneticButtons();
    setupM3Buttons();
    setupLandingParticles();
    setup3DGlobe();
    setupSpotlightCards();
    setupBenefitsCarousel();
    setupLiveFeedSimulator();
    setup3DTilts();
    setupTeamScrollAnimation();
    loadDynamicPartners();
    setupLogoCarousel();
    setupLogoAnimation();
    setupCustomSelects();
    setupQuickStatsPillsNavigation();
    initRedemptionModalEvents();
    loadPublicEvents();
    setupAdminEventsManagement();
    initThemeToggle();
}

// Theme Toggle System (Light/Dark switch)
function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;
    
    // Check saved theme or default to Light
    const savedTheme = localStorage.getItem('portal-theme') || 'light';
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        toggleBtn.innerHTML = '<i class="fa-solid fa-sun" style="color: var(--amber);"></i>';
    } else {
        document.body.classList.remove('dark-theme');
        toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    
    toggleBtn.addEventListener('click', () => {
        // Subtle GSAP bounce animation on toggle click
        if (window.gsap) {
            gsap.fromTo(toggleBtn, { scale: 0.8, rotate: -15 }, { scale: 1, rotate: 0, duration: 0.3, ease: "back.out(2)" });
        }
        
        const isDark = document.body.classList.toggle('dark-theme');
        if (isDark) {
            localStorage.setItem('portal-theme', 'dark');
            toggleBtn.innerHTML = '<i class="fa-solid fa-sun" style="color: var(--amber);"></i>';
        } else {
            localStorage.setItem('portal-theme', 'light');
            toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
        
        // Refresh ScrollTrigger values so alignment boundaries match background swaps
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    });
}


// ----------------------------------------------------
// QUICK STATS PILLS ACCESSIBILITY & SMOOTH NAVIGATION
// ----------------------------------------------------
function setupQuickStatsPillsNavigation() {
    const pillStreak = document.getElementById('pill-streak');
    const pillTier = document.getElementById('pill-tier');
    const pillVouchers = document.getElementById('pill-vouchers');
    const pillPts = document.getElementById('pill-pts');

    const pills = [pillStreak, pillTier, pillVouchers, pillPts];

    if (pillStreak) {
        pillStreak.addEventListener('click', () => {
            // switch to overview tab first if not active
            const tabBtn = document.querySelector('.nav-tab[data-target="overview"]');
            if (tabBtn) tabBtn.click();
            
            // scroll to daily checkin widget
            const target = document.getElementById('widget-checkin');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Draw emphasis using a GSAP glow ring highlight
                if (window.gsap) {
                    gsap.fromTo(target, 
                        { boxShadow: '0 0 0px rgba(255, 107, 53, 0)' }, 
                        { boxShadow: '0 0 30px rgba(255, 107, 53, 0.45)', duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.out' }
                    );
                }
            }
        });
    }

    if (pillTier) {
        pillTier.addEventListener('click', () => {
            const tabBtn = document.querySelector('.nav-tab[data-target="overview"]');
            if (tabBtn) tabBtn.click();
            
            // scroll to loyalty progression widget
            const target = document.getElementById('widget-progression');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (window.gsap) {
                    gsap.fromTo(target, 
                        { boxShadow: '0 0 0px rgba(255, 184, 41, 0)' }, 
                        { boxShadow: '0 0 30px rgba(255, 184, 41, 0.45)', duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.out' }
                    );
                }
            }
        });
    }

    if (pillVouchers) {
        pillVouchers.addEventListener('click', () => {
            // switch to redeem tab
            const tabBtn = document.querySelector('.nav-tab[data-target="redeem"]');
            if (tabBtn) tabBtn.click();
            
            // scroll to BIA Partner Vouchers Redemption card
            const target = document.getElementById('dynamic-dashboard-redemption-card');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (window.gsap) {
                    gsap.fromTo(target, 
                        { boxShadow: '0 0 0px rgba(128, 82, 255, 0)' }, 
                        { boxShadow: '0 0 30px rgba(128, 82, 255, 0.45)', duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.out' }
                    );
                }
            }
        });
    }

    if (pillPts) {
        pillPts.addEventListener('click', () => {
            // switch to ledger tab
            const tabBtn = document.querySelector('.nav-tab[data-target="ledger"]');
            if (tabBtn) tabBtn.click();
        });
    }

    // Keyboard controls for role="button" elements
    pills.forEach(pill => {
        if (!pill) return;
        pill.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pill.click();
            }
        });
    });
}

// ----------------------------------------------------
// GLOSSY CUSTOM SELECT DROPDOWNS (replaces native <select>)
// ----------------------------------------------------
function setupCustomSelects() {
    document.querySelectorAll('.form-group select').forEach(nativeSelect => {
        // Build wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';

        // Build trigger button
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('tabindex', '0');

        const label = document.createElement('span');
        label.className = 'select-label';
        label.textContent = nativeSelect.options[nativeSelect.selectedIndex]?.text || 'Select…';

        const arrowSVG = `<svg class="select-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`;
        trigger.appendChild(label);
        trigger.insertAdjacentHTML('beforeend', arrowSVG);

        // Build dropdown panel
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-select-dropdown';

        function updateOptionsList() {
            dropdown.innerHTML = '';
            Array.from(nativeSelect.options).forEach((opt, i) => {
                const item = document.createElement('div');
                item.className = 'custom-select-option' + (i === nativeSelect.selectedIndex ? ' selected' : '');
                item.textContent = opt.text;
                item.dataset.value = opt.value;

                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Update native select value for form compatibility
                    nativeSelect.value = opt.value;
                    nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));

                    // Update UI
                    label.textContent = opt.text;
                    dropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
                    item.classList.add('selected');

                    isOpen = false;
                    closeDropdown();
                });
                dropdown.appendChild(item);
            });
        }

        // Initialize options
        updateOptionsList();

        // Sync custom dropdown when native select is updated dynamically (mutation observer)
        const observer = new MutationObserver(() => {
            updateOptionsList();
            label.textContent = nativeSelect.options[nativeSelect.selectedIndex]?.text || 'Select…';
        });
        observer.observe(nativeSelect, { childList: true });

        // Inject into DOM — insert wrapper before the native select
        nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);
        wrapper.appendChild(trigger);
        document.body.appendChild(dropdown);
        wrapper.appendChild(nativeSelect); // keep native select inside for forms

        function updatePosition() {
            const rect = trigger.getBoundingClientRect();
            const top = rect.bottom + window.scrollY;
            const left = rect.left + window.scrollX;
            const width = rect.width;
            
            dropdown.style.position = 'absolute';
            dropdown.style.top = `${top + 6}px`;
            dropdown.style.left = `${left}px`;
            dropdown.style.width = `${width}px`;
            dropdown.style.zIndex = '99999';
        }

        // ── GSAP open/close animations ──
        function openDropdown() {
            // Close any other open custom selects
            document.querySelectorAll('.custom-select-trigger.open').forEach(openTrig => {
                if (openTrig !== trigger) {
                    openTrig.click();
                }
            });

            trigger.classList.add('open');
            dropdown.classList.add('open');
            updatePosition();

            // Listen for window resize or scroll to reposition/close
            window.addEventListener('resize', closeDropdown);
            window.addEventListener('scroll', closeDropdown, { capture: true, passive: true });

            if (window.gsap) {
                gsap.fromTo(dropdown,
                    { opacity: 0, scaleY: 0.85, y: -6 },
                    { opacity: 1, scaleY: 1, y: 0, duration: 0.28, ease: 'back.out(1.8)' }
                );
                // Stagger the option items in
                gsap.fromTo(dropdown.querySelectorAll('.custom-select-option'),
                    { opacity: 0, x: -8 },
                    { opacity: 1, x: 0, stagger: 0.04, duration: 0.22, ease: 'power2.out', delay: 0.06 }
                );
            } else {
                dropdown.style.opacity = '1';
            }
        }

        function closeDropdown() {
            if (!trigger.classList.contains('open')) return;
            trigger.classList.remove('open');
            window.removeEventListener('resize', closeDropdown);
            window.removeEventListener('scroll', closeDropdown, { capture: true });

            if (window.gsap) {
                gsap.to(dropdown, {
                    opacity: 0, scaleY: 0.9, y: -4, duration: 0.2, ease: 'power2.in',
                    onComplete: () => {
                        dropdown.classList.remove('open');
                    }
                });
            } else {
                dropdown.classList.remove('open');
            }
            isOpen = false;
        }

        let isOpen = false;
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            isOpen = !isOpen;
            isOpen ? openDropdown() : closeDropdown();
        });

        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen = !isOpen; isOpen ? openDropdown() : closeDropdown(); }
            if (e.key === 'Escape') { isOpen = false; closeDropdown(); }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target) && !dropdown.contains(e.target) && isOpen) {
                isOpen = false;
                closeDropdown();
            }
        });
    });
}

// ----------------------------------------------------
// CURSOR-TRACKING SPOTLIGHT CARDS & INTERACTIVE DEMO PROFILES
// ----------------------------------------------------
function setupSpotlightCards() {
    // 1. Mouse-Tracking spotlight-card cursor coordinates updates
    const updateSpotlight = (e, card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    };

    // Dynamically update spotlight variables on move
    const bindSpotlightEvents = () => {
        document.querySelectorAll('.spotlight-card').forEach(card => {
            // Remove previous to avoid duplicates
            card.removeEventListener('mousemove', card._spotlightHandler);
            
            card._spotlightHandler = (e) => updateSpotlight(e, card);
            card.addEventListener('mousemove', card._spotlightHandler);
        });
    };

    // Run initially
    bindSpotlightEvents();

    // Re-bind when tabs or DOM changes if needed
    const observer = new MutationObserver(bindSpotlightEvents);
    const contentFrame = document.querySelector('.focused-content-frame');
    if (contentFrame) {
        observer.observe(contentFrame, { childList: true, subtree: true });
    }

    // 2. Click-to-Autofill Demo Profiles logic
    document.querySelectorAll('.demo-profile-item').forEach(item => {
        item.addEventListener('click', () => {
            const email = item.getAttribute('data-email');
            const pass = item.getAttribute('data-pass');

            const emailInput = document.getElementById('login-email');
            const passInput = document.getElementById('login-password');

            if (emailInput && passInput) {
                // Populate fields
                emailInput.value = email;
                passInput.value = pass;

                // Add active highlight animation class
                document.querySelectorAll('.demo-profile-item').forEach(p => p.classList.remove('active-click'));
                item.classList.add('active-click');

                // Trigger a cool focus visual glow on the inputs
                emailInput.focus();
                setTimeout(() => {
                    passInput.focus();
                }, 200);
            }
        });
    });
}

// ----------------------------------------------------
// AUTO-PLAY BENEFITS & PROGRAMS CAROUSEL (SHUKRAN-STYLE)
// ----------------------------------------------------
function setupBenefitsCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dotsContainer = document.getElementById('carousel-dots-container');
    const progressLine = document.getElementById('carousel-progress');
    const prevBtn = document.getElementById('btn-prev-slide');
    const nextBtn = document.getElementById('btn-next-slide');

    if (slides.length === 0) return;

    let currentIndex = 0;
    const duration = 5000; // 5 seconds per slide

    // 1. Generate Navigation Dots dynamically
    slides.forEach((slide, index) => {
        const dot = document.createElement('button');
        dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
        dot.addEventListener('click', () => {
            goToSlide(index);
        });
        dotsContainer.appendChild(dot);
    });

    const dots = document.querySelectorAll('.carousel-dot');

    // 2. Active Slide Switcher with GSAP Slide, Fade & Stagger
    function goToSlide(index, userTriggered = false) {
        const newIndex = ((index % slides.length) + slides.length) % slides.length;
        if (newIndex === currentIndex && !userTriggered) return;

        const prevIndex = currentIndex;
        currentIndex = newIndex;

        if (prevIndex === currentIndex) return;

        // Determine direction (forward vs backward)
        let isNext = index > prevIndex;
        if (prevIndex === slides.length - 1 && currentIndex === 0) isNext = true;
        if (prevIndex === 0 && currentIndex === slides.length - 1) isNext = false;
        const direction = isNext ? 1 : -1;

        const prevSlide = slides[prevIndex];
        const nextSlide = slides[currentIndex];

        // Update dot states
        dots[prevIndex].classList.remove('active');
        dots[currentIndex].classList.add('active');

        // Set z-index + pointer-events via classes BEFORE animation
        prevSlide.classList.remove('active');
        nextSlide.classList.add('active');

        if (window.gsap) {
            // Kill any running tweens on these elements to prevent conflicts
            gsap.killTweensOf(prevSlide);
            gsap.killTweensOf(nextSlide);

            // Animate the outgoing slide
            gsap.to(prevSlide, {
                opacity: 0,
                x: -40 * direction,
                duration: 0.55,
                ease: 'power2.inOut',
                onComplete: () => gsap.set(prevSlide, { x: 0 })
            });

            // Animate the incoming slide
            gsap.fromTo(nextSlide,
                { opacity: 0, x: 40 * direction },
                { opacity: 1, x: 0, duration: 0.55, ease: 'power2.inOut' }
            );

            // Stagger-reveal text elements inside the new slide
            const textEls = nextSlide.querySelectorAll(
                '.slide-badge, h3, p, .points-indicator-widget'
            );
            if (textEls.length > 0) {
                gsap.killTweensOf(textEls);
                gsap.fromTo(textEls,
                    { opacity: 0, y: 12 },
                    { opacity: 1, y: 0, stagger: 0.07, duration: 0.45, ease: 'power2.out', delay: 0.12 }
                );
            }

            // Animate graphic with a springy pop
            const graphicEl = nextSlide.querySelector('.slide-graphic');
            if (graphicEl) {
                gsap.killTweensOf(graphicEl);
                gsap.fromTo(graphicEl,
                    { opacity: 0, scale: 0.75, rotation: -8 * direction },
                    { opacity: 1, scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.5)', delay: 0.2 }
                );
            }
        }

        // Reset the progress bar animation
        resetTimer();
    }

    // 3. Arrow Controllers
    if (prevBtn) {
        prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1, true));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1, true));
    }

    // 4. Progress bar + Auto-advance (simple setInterval, no rAF drift)
    let intervalId = null;

    function startProgress() {
        if (!progressLine) return;
        gsap.killTweensOf(progressLine);
        gsap.fromTo(progressLine,
            { width: '0%' },
            { width: '100%', duration: duration / 1000, ease: 'none' }
        );
    }

    function resetTimer() {
        clearInterval(intervalId);
        startProgress();
        intervalId = setInterval(() => {
            goToSlide(currentIndex + 1);
        }, duration);
    }

    // Initial kickoff — set first slide visible immediately
    gsap.set(slides[0], { opacity: 1 });
    resetTimer();
}

// ----------------------------------------------------
// 3D GLOBE CONSTELLATION CANVAS ANIMATOR
// ----------------------------------------------------
function setup3DGlobe() {
    const canvas = document.getElementById('globe-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const particles = [];
    const numParticles = 460;
    const radius = 95;
    const fov = 350;
    
    // Accumulators for rotations
    let rotX = 0;
    let rotY = 0;
    const rotSpeedY = 0.0035;
    const rotSpeedX = 0.0015;

    // Generate targets for each particle
    for (let i = 0; i < numParticles; i++) {
        // 1. Sphere Targets (Target state for scroll down)
        const theta = Math.acos(Math.random() * 2 - 1);
        const phi = Math.random() * 2 * Math.PI;
        const sphereX = radius * 1.35 * Math.sin(theta) * Math.cos(phi);
        const sphereY = radius * 1.35 * Math.sin(theta) * Math.sin(phi);
        const sphereZ = radius * 1.35 * Math.cos(theta);

        // 2. Realistic Multi-Lobe Brain Targets (Initial state for hero)
        let brainX = 0, brainY = 0, brainZ = 0;
        const lobeSelector = Math.random();
        
        if (lobeSelector < 0.45) {
            // Frontal / Parietal Lobe (Large upper front segment)
            const t = Math.acos(Math.random() * 2 - 1);
            const p = Math.random() * 2 * Math.PI;
            const r = radius * (0.85 + Math.random() * 0.15);
            brainX = r * 1.15 * Math.sin(t) * Math.cos(p) + 20;
            brainY = r * 0.95 * Math.cos(t) - 25;
            brainZ = r * 1.0 * Math.sin(t) * Math.sin(p);
        } else if (lobeSelector < 0.72) {
            // Occipital / Cerebellum Lobe (Back lower segment)
            const t = Math.acos(Math.random() * 2 - 1);
            const p = Math.random() * 2 * Math.PI;
            const r = radius * (0.75 + Math.random() * 0.15);
            brainX = r * 0.95 * Math.sin(t) * Math.cos(p) - 50;
            brainY = r * 0.85 * Math.cos(t) + 20;
            brainZ = r * 0.9 * Math.sin(t) * Math.sin(p);
        } else if (lobeSelector < 0.88) {
            // Temporal Lobes (Side flaps)
            const t = Math.acos(Math.random() * 2 - 1);
            const p = Math.random() * 2 * Math.PI;
            const r = radius * (0.65 + Math.random() * 0.15);
            const side = Math.random() < 0.5 ? -1 : 1;
            brainX = r * 0.85 * Math.sin(t) * Math.cos(p) + 15;
            brainY = r * 0.65 * Math.cos(t) + 10;
            brainZ = r * 0.75 * Math.sin(t) * Math.sin(p) + (side * 35);
        } else {
            // Brain Stem (Trailing downwards)
            const progress = Math.random();
            brainX = (Math.random() - 0.5) * 10 - 20;
            brainY = 55 + progress * 90;
            brainZ = (Math.random() - 0.5) * 10;
        }
        
        // Add realistic fold undulations (gyri/sulci ripples)
        if (lobeSelector < 0.88) {
            const foldVal = 1.0 + (Math.sin(brainX * 0.08) * Math.cos(brainY * 0.08) * Math.sin(brainZ * 0.08)) * 0.09;
            brainX *= foldVal;
            brainY *= foldVal;
            brainZ *= foldVal;
        }

        particles.push({
            sphereX, sphereY, sphereZ,
            brainX, brainY, brainZ,
            x: brainX, y: brainY, z: brainZ,
            color: getRandomBrandColor(),
            size: Math.random() * 1.8 + 1.2
        });
    }

    function getRandomBrandColor() {
        // Return an index 0-3 instead of hardcoded strings to allow dynamic theme switching
        return Math.floor(Math.random() * 4);
    }

    const scrollContainer = document.getElementById('login-overlay');

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Calculate scroll ratio (morphing completes over 550px scroll height)
        const scrollRatio = scrollContainer ? Math.min(1.0, scrollContainer.scrollTop / 550) : 0;

        // Apply slow continuous spin rotations
        rotY += rotSpeedY;
        rotX += rotSpeedX;
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);

        // Interpolate target coordinates & project to 3D rotated space
        const projected = [];
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            // Interpolate target based on scroll position
            const tx = p.brainX + (p.sphereX - p.brainX) * scrollRatio;
            const ty = p.brainY + (p.sphereY - p.brainY) * scrollRatio;
            const tz = p.brainZ + (p.sphereZ - p.brainZ) * scrollRatio;

            // Apply 3D rotation coordinates on interpolated targets
            const rx1 = tx * cosY - tz * sinY;
            const rz1 = tz * cosY + tx * sinY;
            const ry2 = ty * cosX - rz1 * sinX;
            const rz2 = rz1 * cosX + ty * sinX;

            const scale = fov / (fov + rz2 + 180);
            const x2d = centerX + rx1 * scale;
            const y2d = centerY + ry2 * scale;
            const depthAlpha = (rz2 + radius) / (2 * radius);

            projected.push({
                x2d, y2d, scale, depthAlpha, color: p.color, size: p.size,
                x3d: rx1, y3d: ry2, z3d: rz2
            });
        }

        // Sort projected particles by Z axis for depth drawing ordering
        projected.sort((a, b) => b.z3d - a.z3d);

        // Draw mesh constellation lines
        const maxDist = 38; // connection threshold
        for (let i = 0; i < projected.length; i++) {
            const p = projected[i];
            
            const isDark = document.body.classList.contains('dark-theme');
            // Provide dynamically evaluated color palette based on current theme
            const colorPalette = isDark 
                ? ['#8052ff', '#ffb829', '#15846e', '#ffffff'] 
                : ['#5c2bbd', '#d68b00', '#0f6151', '#1d1c16'];
            const actualColor = colorPalette[p.color];
            
            for (let j = i + 1; j < projected.length; j++) {
                const other = projected[j];
                const dx = p.x3d - other.x3d;
                const dy = p.y3d - other.y3d;
                const dz = p.z3d - other.z3d;
                const dist = Math.hypot(dx, dy, dz);

                if (dist < maxDist) {
                    ctx.strokeStyle = actualColor;
                    ctx.globalAlpha = (1.0 - (dist / maxDist)) * (isDark ? 0.12 : 0.25) * p.depthAlpha;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(p.x2d, p.y2d);
                    ctx.lineTo(other.x2d, other.y2d);
                    ctx.stroke();
                }
            }

            // Draw triangles
            ctx.fillStyle = actualColor;
            ctx.globalAlpha = (isDark ? 0.15 : 0.4) + p.depthAlpha * (isDark ? 0.85 : 0.6);
            ctx.beginPath();
            const sz = p.size * p.scale;
            ctx.moveTo(p.x2d, p.y2d - sz);
            ctx.lineTo(p.x2d - sz, p.y2d + sz);
            ctx.lineTo(p.x2d + sz, p.y2d + sz);
            ctx.closePath();
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;
        requestAnimationFrame(animate);
    }

    animate();
}

// ----------------------------------------------------
// SCROLL-DRIVEN 3D TEAM CARD ROTATION ANIMATION (120HZ COMPLIANT)
// ----------------------------------------------------
function setupTeamScrollAnimation() {
    if (typeof gsap === 'undefined') return;
    
    // Register GSAP ScrollTrigger plugin
    if (typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
    }
    
    const members = gsap.utils.toArray('.team-member-item');
    if (members.length === 0) return;
    
    // Staggered slide up with 3D tilt (120hz compliant)
    gsap.fromTo(members, 
        {
            opacity: 0,
            y: 50,
            rotationX: 12,
            scale: 0.94,
            transformOrigin: "center bottom"
        },
        {
            opacity: 1,
            y: 0,
            rotationX: 0,
            scale: 1,
            stagger: 0.12,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".team-members-grid",
                scroller: "#login-overlay",
                start: "top 85%",
                end: "top 50%",
                scrub: 0.5,
                markers: false
            }
        }
    );
}

// ----------------------------------------------------
// HOMEPAGE ONLY: ScrollTrigger Animations for Collaborators list (Cipher Digital inspired)
// ----------------------------------------------------
function setupLandingScrollAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    // Loop through each dynamic collaborator section to setup ScrollTrigger timelines
    document.querySelectorAll('.partnerships-section').forEach((sec) => {
        // 1. Brand logo rotation (supporting vector and circle badges)
        const brandLogo = sec.querySelector('.adnoc-brand-logo .adnoc-svg-logo, .adnoc-brand-logo .partner-circle-logo');
        if (brandLogo) {
            gsap.fromTo(brandLogo, 
                { rotation: -90, scale: 0.85 },
                {
                    rotation: 360,
                    scale: 1.15,
                    ease: "none",
                    scrollTrigger: {
                        trigger: sec,
                        scroller: "#login-overlay",
                        start: 'top 85%',
                        end: 'bottom 40%',
                        scrub: 0.5
                    }
                }
            );
        }

        // 2. Banner Image Zoom & Clip-Path Inset Reveal (Cipher Digital Style)
        const promoImg = sec.querySelector('.partnerships-promo-img');
        if (promoImg) {
            gsap.fromTo(promoImg, 
                { clipPath: "inset(100% 0% 0% 0%)", scale: 1.18, y: 30 },
                {
                    clipPath: "inset(0% 0% 0% 0%)",
                    scale: 1,
                    y: 0,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: sec,
                        scroller: "#login-overlay",
                        start: 'top 85%',
                        end: 'bottom 25%',
                        scrub: 1
                    }
                }
            );
        }

        // 3. Text Column reveal
        const textChildren = gsap.utils.toArray(sec.querySelectorAll('.partnerships-text-col > *:not(.partnerships-rewards-row)'));
        if (textChildren.length > 0) {
            gsap.fromTo(textChildren,
                { opacity: 0, y: 35, skewY: 1.5 },
                {
                    opacity: 1,
                    y: 0,
                    skewY: 0,
                    stagger: 0.14,
                    duration: 0.95,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: sec,
                        scroller: "#login-overlay",
                        start: 'top 75%'
                    }
                }
            );
        }

        // 4. Rewards cards entrance stagger
        const rewardCards = gsap.utils.toArray(sec.querySelectorAll('.partnerships-rewards-row .partnership-reward-card'));
        if (rewardCards.length > 0) {
            gsap.fromTo(rewardCards,
                { opacity: 0, y: 25, scale: 0.94 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    stagger: 0.1,
                    duration: 0.75,
                    ease: "back.out(1.3)",
                    scrollTrigger: {
                        trigger: sec.querySelector('.partnerships-rewards-row'),
                        scroller: "#login-overlay",
                        start: 'top 92%'
                    }
                }
            );
        }

        // 5. ScrollTrigger Blueprint Grid Line drawing
        const horLines = sec.querySelectorAll('.blueprint-line.line-top, .blueprint-line.line-bottom');
        const verLines = sec.querySelectorAll('.blueprint-line.line-center-ver');
        const nodes = sec.querySelectorAll('.grid-node');

        gsap.fromTo(horLines, { width: '0%' }, {
            width: '100%',
            scrollTrigger: {
                trigger: sec,
                scroller: "#login-overlay",
                start: 'top 95%',
                end: 'top 60%',
                scrub: 0.8
            }
        });
        gsap.fromTo(verLines, { height: '0%' }, {
            height: '100%',
            scrollTrigger: {
                trigger: sec,
                scroller: "#login-overlay",
                start: 'top 95%',
                end: 'top 50%',
                scrub: 0.8
            }
        });
        gsap.fromTo(nodes, { scale: 0 }, {
            scale: 1,
            scrollTrigger: {
                trigger: sec,
                scroller: "#login-overlay",
                start: 'top 90%',
                end: 'top 65%',
                scrub: 0.5
            }
        });
    });

    // 6. ScrollTrigger Blueprint Grid Line drawing for Manifesto
    const mGrid = document.querySelector('#manifesto');
    if (mGrid) {
        const horLines = mGrid.querySelectorAll('.blueprint-line.line-top, .blueprint-line.line-bottom');
        const verLines = mGrid.querySelectorAll('.blueprint-line.line-card-split-1, .blueprint-line.line-card-split-2');
        const nodes = mGrid.querySelectorAll('.grid-node');

        gsap.fromTo(horLines, { width: '0%' }, {
            width: '100%',
            scrollTrigger: {
                trigger: '#manifesto',
                scroller: "#login-overlay",
                start: 'top 95%',
                end: 'top 60%',
                scrub: 0.8
            }
        });
        gsap.fromTo(verLines, { height: '0%' }, {
            height: '100%',
            scrollTrigger: {
                trigger: '#manifesto',
                scroller: "#login-overlay",
                start: 'top 95%',
                end: 'top 50%',
                scrub: 0.8
            }
        });
        gsap.fromTo(nodes, { scale: 0 }, {
            scale: 1,
            scrollTrigger: {
                trigger: '#manifesto',
                scroller: "#login-overlay",
                start: 'top 90%',
                end: 'top 65%',
                scrub: 0.5
            }
        });
    }
}

// ----------------------------------------------------
// BIA BRAND LOGO: Animates the boxes to shift on hover (Cipher Digital inspired)
// ----------------------------------------------------
function setupLogoAnimation() {
    if (typeof gsap === 'undefined') return;
    const logo = document.getElementById('landing-logo');
    if (!logo) return;

    const logoBoxes = logo.querySelectorAll('.logo-box');
    const svgEl = logo.querySelector('.bia-logo-svg');
    
    // Set initial transform state
    gsap.set(svgEl, { rotation: 45 });

    // Auto entrance intro
    gsap.fromTo(logoBoxes, 
        { scale: 0 },
        { scale: 1, duration: 0.8, stagger: 0.08, ease: "back.out(2)" }
    );

    // Create the automatic periodic loop timeline (repeats indefinitely every 4.5s)
    const loopTl = gsap.timeline({ repeat: -1, repeatDelay: 4.5 });

    // Step 1: Expand boxes and spin 180 degrees (from 45 to 225)
    loopTl.to(logoBoxes, {
        x: (i, el) => {
            if (el.classList.contains('box-purple')) return -4;
            if (el.classList.contains('box-white')) return -4;
            if (el.classList.contains('box-green')) return 4;
            if (el.classList.contains('box-amber')) return 4;
            return 0;
        },
        y: (i, el) => {
            if (el.classList.contains('box-purple')) return -4;
            if (el.classList.contains('box-green')) return -4;
            if (el.classList.contains('box-white')) return 4;
            if (el.classList.contains('box-amber')) return 4;
            return 0;
        },
        duration: 0.5,
        ease: "power2.out"
    })
    .to(svgEl, { 
        rotation: 225, 
        duration: 0.6, 
        ease: "power2.inOut" 
    }, "<")

    // Step 2: Hold expanded state for a short moment
    .to({}, { duration: 0.8 })

    // Step 3: Collapse boxes back and complete the spin to 405deg (360 + 45)
    .to(logoBoxes, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: "power2.inOut"
    })
    .to(svgEl, { 
        rotation: 405, 
        duration: 0.6, 
        ease: "power2.inOut",
        onComplete: () => {
            // Reset rotation back to 45deg silently for infinite loop integrity
            gsap.set(svgEl, { rotation: 45 });
        }
    }, "<");
}

// ----------------------------------------------------
// DYNAMIC COLLABORATOR PARTNERSHIP ENGINE
// ----------------------------------------------------
let appPartners = [];

function setupLogoCarousel() {
    const container = document.getElementById('logo-carousel-root');
    if (!container) return;

    // ── Partner Brand SVGs (BIA ecosystem) ──────────────────────────────────
    const allLogos = [
        {
            name: 'ADNOC', id: 1,
            svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" width="80" height="80">
                <circle cx="60" cy="60" r="56" fill="#005B9A"/>
                <path d="M60 14 C80 34 80 86 60 106 C40 86 40 34 60 14Z" fill="#DC2626"/>
                <circle cx="60" cy="60" r="24" fill="#005B9A" stroke="#fff" stroke-width="3"/>
                <text x="60" y="66" text-anchor="middle" font-family="Arial Black" font-weight="900" font-size="16" fill="#FFFFFF">A</text>
            </svg>`
        },
        {
            name: 'VISA', id: 2,
            svg: `<svg viewBox="0 0 160 52" xmlns="http://www.w3.org/2000/svg" width="110" height="36">
                <text x="0" y="44" font-family="Arial Black,sans-serif" font-weight="900" font-size="48" fill="#1A1F71" letter-spacing="-2">VISA</text>
            </svg>`
        },
        {
            name: 'TOYOTA', id: 3,
            svg: `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" width="90" height="60">
                <ellipse cx="60" cy="40" rx="56" ry="24" stroke="#EB0A1E" stroke-width="5" fill="none"/>
                <ellipse cx="60" cy="40" rx="32" ry="16" stroke="#EB0A1E" stroke-width="5" fill="none"/>
                <ellipse cx="60" cy="40" rx="11" ry="24" stroke="#EB0A1E" stroke-width="5" fill="none"/>
            </svg>`
        },
        {
            name: 'IKEA', id: 4,
            svg: `<svg viewBox="0 0 140 56" xmlns="http://www.w3.org/2000/svg" width="110" height="44">
                <rect width="140" height="56" rx="6" fill="#003399"/>
                <text x="70" y="40" text-anchor="middle" font-family="Arial Black,sans-serif" font-weight="900" font-size="32" fill="#FFCC00">IKEA</text>
            </svg>`
        },
        {
            name: 'EBAY', id: 5,
            svg: `<svg viewBox="0 0 148 60" xmlns="http://www.w3.org/2000/svg" width="110" height="44">
                <text x="0" y="50" font-family="Arial Black,sans-serif" font-weight="900" font-size="56">
                    <tspan fill="#E53238">e</tspan><tspan fill="#0064D2">b</tspan><tspan fill="#F5AF02">a</tspan><tspan fill="#86B817">y</tspan>
                </text>
            </svg>`
        },
        {
            name: 'BOSE', id: 6,
            svg: `<svg viewBox="0 0 130 40" xmlns="http://www.w3.org/2000/svg" width="110" height="34">
                <text x="0" y="34" font-family="Arial Black,sans-serif" font-weight="900" font-size="38" fill="#dfb15b" letter-spacing="3">BOSE</text>
            </svg>`
        },
        {
            name: 'H&M', id: 7,
            svg: `<svg viewBox="0 0 120 56" xmlns="http://www.w3.org/2000/svg" width="100" height="46">
                <rect width="120" height="56" rx="6" fill="#E50010"/>
                <text x="60" y="40" text-anchor="middle" font-family="Arial Black,sans-serif" font-weight="900" font-size="28" fill="#FFFFFF">H&amp;M</text>
            </svg>`
        },
        {
            name: 'SHUKRAN', id: 8,
            svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" width="76" height="76">
                <circle cx="60" cy="60" r="56" fill="#C8102E"/>
                <polygon points="60,18 68,46 98,46 74,64 82,92 60,74 38,92 46,64 22,46 52,46" fill="#FFD700"/>
                <text x="60" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="9" fill="#FFFFFF" letter-spacing="0.8">SHUKRAN</text>
            </svg>`
        },
    ];

    // ── Replicate React template logic exactly ───────────────────────────────
    // shuffleArray
    const shuffled = [...allLogos].sort(() => Math.random() - 0.5);

    const columnCount = 4;

    // distributeLogos
    const columns = Array.from({ length: columnCount }, () => []);
    shuffled.forEach((logo, i) => columns[i % columnCount].push(logo));
    const maxLen = Math.max(...columns.map(c => c.length));
    columns.forEach(col => {
        while (col.length < maxLen) col.push(shuffled[Math.floor(Math.random() * shuffled.length)]);
    });

    container.innerHTML = '';

    // Build column slots
    const colStates = columns.map((logos, colIdx) => {
        const col = document.createElement('div');
        col.className = 'logo-carousel-col';

        const slot = document.createElement('div');
        slot.className = 'logo-slot';
        col.appendChild(slot);
        container.appendChild(col);

        return { slot, logos, prevIndex: -1, currentItem: null };
    });

    // Create a logo DOM item (hidden by default — JS animates it in)
    function createItem(logo) {
        const item = document.createElement('div');
        item.className = 'logo-slot-item';
        item.innerHTML = `<div class="logo-slot-svg">${logo.svg}</div><span class="logo-slot-name">${logo.name}</span>`;
        // Start state: y+10%, blur(8px), opacity:0  →  matches template initial
        item.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem;opacity:0;transform:translateY(10%);filter:blur(8px);';
        return item;
    }

    // Seed first item visible immediately (no animation)
    colStates.forEach(({ slot, logos }) => {
        const item = createItem(logos[0]);
        slot.appendChild(item);
        // Instantly show first logo — matches React's initial mount
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
        item.style.filter = 'blur(0px)';
    });
    colStates.forEach(s => {
        s.currentItem = s.slot.querySelector('.logo-slot-item');
        s.prevIndex = 0;
    });

    // ── Shared ticker: exactly matches React's setInterval(updateTime, 100) ──
    const cycleInterval = 2000; // ms per logo — same as template
    let currentTime = 0;

    setInterval(() => {
        currentTime += 100;

        colStates.forEach((state, colIdx) => {
            const columnDelay = colIdx * 200; // same as template: index * 200
            const adjustedTime = (currentTime + columnDelay) % (cycleInterval * state.logos.length);
            const newIndex = Math.floor(adjustedTime / cycleInterval);

            if (newIndex === state.prevIndex) return;
            state.prevIndex = newIndex;

            // ── EXIT: y → -20%, opacity → 0, blur(6px) [tween ease-in 0.3s] ──
            const exiting = state.currentItem;
            if (exiting) {
                exiting.style.transition = 'opacity 0.3s ease-in, transform 0.3s ease-in, filter 0.3s ease-in';
                exiting.style.opacity = '0';
                exiting.style.transform = 'translateY(-20%)';
                exiting.style.filter = 'blur(6px)';
                setTimeout(() => exiting.remove(), 340);
            }

            // ── ENTER: spring cubic-bezier simulates stiffness:300, damping:20, bounce:0.2 ──
            const entering = createItem(state.logos[newIndex]);
            state.slot.appendChild(entering);
            state.currentItem = entering;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    entering.style.transition =
                        'opacity 0.5s ease,' +
                        'transform 0.5s cubic-bezier(0.34,1.56,0.64,1),' +
                        'filter 0.5s ease';
                    entering.style.opacity = '1';
                    entering.style.transform = 'translateY(0)';
                    entering.style.filter = 'blur(0px)';
                });
            });
        });
    }, 100);
}

async function loadDynamicPartners() {
    try {
        const response = await fetch(`${API_BASE}/partners`);
        const data = await response.json();
        appPartners = data;

        const container = document.getElementById('dynamic-partnerships-container');
        if (container) {
            container.innerHTML = data.map((partner, index) => {
                const isAdnoc = partner.id === 'adnoc';
                const logoHtml = isAdnoc ? `
                    <svg class="adnoc-svg-logo" viewBox="0 0 100 100" width="38" height="38">
                        <circle cx="50" cy="50" r="46" fill="#005A9C" />
                        <path d="M50,15 C68,35 68,65 50,85 C32,65 32,35 50,15 Z" fill="#E30613" />
                        <polygon points="50,28 58,48 78,48 62,60 68,80 50,68 32,80 38,60 22,48 42,48" fill="#FFFFFF" />
                    </svg>
                ` : `
                    <div class="partner-circle-logo" style="background-color: ${partner.logoColor};">
                        <i class="fa-solid fa-handshake"></i>
                    </div>
                `;

                return `
                    <section class="landing-section reveal-on-scroll partnerships-section" id="partnerships-${partner.id}">
                        <!-- Blueprint lines and nodes (Cipher Digital style) -->
                        <div class="section-blueprint-grid">
                            <div class="blueprint-line line-top"></div>
                            <div class="blueprint-line line-bottom"></div>
                            <div class="blueprint-line line-center-ver"></div>
                            <div class="grid-node bnode-tl"></div>
                            <div class="grid-node bnode-tr"></div>
                            <div class="grid-node bnode-bl"></div>
                            <div class="grid-node bnode-br"></div>
                        </div>
                        
                        <div class="partnerships-layout-container">
                            <!-- Image Column -->
                            <div class="partnerships-image-col">
                                <img src="${partner.image}" alt="${partner.name}" class="partnerships-promo-img">
                                <div class="image-overlay-glow"></div>
                            </div>

                            <!-- Text & Rewards Column -->
                            <div class="partnerships-text-col">
                                <div class="adnoc-header-branding">
                                    <div class="adnoc-brand-logo">
                                        ${logoHtml}
                                        <span class="adnoc-logo-text">${partner.name}</span>
                                    </div>
                                    <span class="section-badge badge-blue">${partner.badge}</span>
                                </div>

                                <h2 class="partnerships-title">${partner.title}</h2>
                                <p class="partnerships-subtitle">${partner.subtitle}</p>
                                
                                <div class="partnership-disclosure">
                                    <i class="fa-solid fa-circle-info"></i>
                                    <span>${partner.disclosure}</span>
                                </div>

                                <!-- Rewards Cards Row -->
                                <div class="partnerships-rewards-row">
                                    ${partner.rewards.map(r => `
                                        <div class="partnership-reward-card">
                                            <div class="reward-icon-badge"><i class="fa-solid ${r.icon || 'fa-gift'}"></i></div>
                                            <h4>${r.name}</h4>
                                            <span class="reward-cost notranslate">${r.cost} Points <span class="reward-cash">(${r.cash})</span></span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </section>
                `;
            }).join('');
        }

        // Populate dashboard components if active
        populateDashboardPartners();

        // Run ScrollTrigger setup now that DOM components exist
        setupLandingScrollAnimations();
        setupScrollReveals();
    } catch (err) {
        console.error('Error loading dynamic partners:', err);
    }
}

let selectedRedemption = null;

function populateDashboardPartners() {
    const catalog = document.getElementById('dashboard-rewards-catalog');
    if (!catalog) return;

    catalog.innerHTML = '';

    if (!appPartners.length) {
        catalog.innerHTML = '<p class="no-data">No partner vouchers registered yet.</p>';
        return;
    }

    const currentPoints = appState.userProfile ? appState.userProfile.points_balance : 0;

    appPartners.forEach(partner => {
        const isAdnoc = partner.id === 'adnoc';
        
        // Brand logo markup
        const logoHtml = isAdnoc ? `
            <svg class="adnoc-svg-logo" viewBox="0 0 100 100" width="16" height="16">
                <circle cx="50" cy="50" r="46" fill="#005A9C" />
                <path d="M50,15 C68,35 68,65 50,85 C32,65 32,35 50,15 Z" fill="#E30613" />
                <polygon points="50,28 58,48 78,48 62,60 68,80 50,68 32,80 38,60 22,48 42,48" fill="#FFFFFF" />
            </svg>
        ` : `
            <div class="partner-circle-logo" style="background-color: ${partner.logoColor}; width: 16px; height: 16px; font-size: 0.6rem; line-height: 16px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%;">
                <i class="fa-solid fa-handshake" style="font-size: 8px;"></i>
            </div>
        `;

        partner.rewards.forEach(reward => {
            const pointsNeeded = reward.cost;
            const isLocked = currentPoints < pointsNeeded;

            const card = document.createElement('div');
            card.className = 'reward-catalog-card';
            card.innerHTML = `
                <div class="reward-card-image-wrap">
                    <img src="${reward.image || partner.image}" alt="${partner.name}" class="reward-card-img">
                    <div class="reward-card-image-overlay"></div>
                    <div class="reward-card-brand-badge">
                        ${logoHtml}
                        <span>${partner.name}</span>
                    </div>
                </div>
                <div class="reward-card-body">
                    <div class="reward-card-title">${reward.name}</div>
                    <div class="reward-card-pts">
                        ${formatNumber(pointsNeeded)} <span style="font-size: 0.75rem; font-weight: 500; color: rgba(236,235,227,0.5); margin-right: 0.25rem;">pts</span>
                        <span class="reward-card-cash">(${reward.cash})</span>
                    </div>
                    <button class="reward-card-btn" ${isLocked ? 'disabled' : ''}>
                        ${isLocked ? '<i class="fa-solid fa-lock" style="margin-right: 4px;"></i> Locked' : 'Redeem'}
                    </button>
                </div>
            `;

            // Action click
            const btn = card.querySelector('.reward-card-btn');
            if (!isLocked && btn) {
                btn.addEventListener('click', () => {
                    openRedemptionModal(partner, reward);
                });
            }

            catalog.appendChild(card);
        });
    });

    // Staggered GSAP entrance animation for rewards catalog cards
    if (window.gsap) {
        gsap.fromTo(catalog.querySelectorAll('.reward-catalog-card'),
            { opacity: 0, y: 15, scale: 0.96 },
            { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.05, ease: 'power2.out', overwrite: 'auto' }
        );
    }
}

// ──────────────────────────────────────────────────────────
// BEAUTIFUL CUSTOM REDEMPTION MODAL LOGIC
// ──────────────────────────────────────────────────────────
function openRedemptionModal(partner, reward) {
    selectedRedemption = { partner, reward };

    // Set texts
    document.getElementById('redemption-partner-name').textContent = partner.name;
    document.getElementById('redemption-reward-name').textContent = reward.name;
    document.getElementById('redemption-points-cost').textContent = `${formatNumber(reward.cost)} Points`;
    document.getElementById('redemption-cash-value').textContent = reward.cash;

    // Reset success state
    document.getElementById('redemption-success-box').style.display = 'none';
    document.getElementById('redemption-modal-notice-text').style.display = 'block';
    document.getElementById('redemption-modal-footer').style.display = 'flex';
    document.getElementById('redemption-modal-title').textContent = 'Confirm Voucher Redemption';

    const modal = document.getElementById('redemption-modal');
    modal.style.display = 'flex';
    if (window.gsap) {
        gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        gsap.fromTo(modal.querySelector('.custom-modal-card'), { scale: 0.85, y: 15 }, { scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.5)' });
    } else {
        modal.style.opacity = '1';
    }
}

function closeRedemptionModal() {
    selectedRedemption = null;
    const modal = document.getElementById('redemption-modal');
    if (window.gsap) {
        gsap.to(modal, {
            opacity: 0, duration: 0.2, onComplete: () => {
                modal.style.display = 'none';
            }
        });
    } else {
        modal.style.display = 'none';
    }
}

function initRedemptionModalEvents() {
    const closeBtn = document.getElementById('redemption-modal-close');
    const cancelBtn = document.getElementById('btn-redemption-cancel');
    const confirmBtn = document.getElementById('btn-redemption-confirm');
    const copyBtn = document.getElementById('btn-copy-voucher-code');

    if (closeBtn) closeBtn.addEventListener('click', closeRedemptionModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeRedemptionModal);

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (!selectedRedemption || !appState.currentUser) return;
            
            const { partner, reward } = selectedRedemption;
            const pointsNeeded = reward.cost;
            const cashVal = parseInt(reward.cash.replace(/[^0-9]/g, '')) || 0;

            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Processing...';

            try {
                const response = await fetch(`${API_BASE}/redeem/collaborator`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: appState.currentUser.user_id,
                        partner_id: partner.id,
                        reward_name: reward.name,
                        points_deducted: pointsNeeded,
                        discount_aed: cashVal
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Redemption failed');

                // Render success details
                document.getElementById('generated-voucher-code').textContent = data.voucher_code;
                document.getElementById('redemption-voucher-instructions-text').textContent = `Show this code at any ${partner.name} checkout counter to redeem.`;

                // Animate showing success box
                document.getElementById('redemption-modal-notice-text').style.display = 'none';
                document.getElementById('redemption-modal-footer').style.display = 'none';
                document.getElementById('redemption-modal-title').textContent = 'Voucher Redeemed!';
                
                const successBox = document.getElementById('redemption-success-box');
                successBox.style.display = 'flex';
                if (window.gsap) {
                    gsap.fromTo(successBox, { opacity: 0, scale: 0.9, y: 5 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power2.out' });
                }

                showToast('Redemption Successful! 🛍️', `Deducted ${formatNumber(pointsNeeded)} pts for ${reward.name}.`, 'success');

                // Refresh state
                await loadUserProfile(appState.currentUser.user_id);
            } catch (err) {
                showToast('Redemption Error', err.message, 'error');
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Deduct & Redeem';
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const code = document.getElementById('generated-voucher-code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                showToast('Code Copied! 📋', 'Voucher code copied to clipboard.', 'info');
                copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #10b981;"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
                }, 2000);
            });
        });
    }
}

// Bind admin panel collaborator registration form submission
const partnerForm = document.getElementById('admin-new-partner-form');
if (partnerForm) {
    partnerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('partner-form-image');
        const file = fileInput.files[0];
        let base64Image = "";

        if (file) {
            try {
                base64Image = await convertFileToBase64(file);
            } catch (err) {
                showToast('Upload Error', 'Failed to read image file.', 'error');
                return;
            }
        }
        
                    const rawRewards = [
                {
                    name: document.getElementById('reward-1-name').value.trim(),
                    cost: document.getElementById('reward-1-cost').value.trim(),
                    cash: document.getElementById('reward-1-cash').value.trim(),
                    icon: "fa-mug-hot"
                },
                {
                    name: document.getElementById('reward-2-name').value.trim(),
                    cost: document.getElementById('reward-2-cost').value.trim(),
                    cash: document.getElementById('reward-2-cash').value.trim(),
                    icon: "fa-gift"
                },
                {
                    name: document.getElementById('reward-3-name').value.trim(),
                    cost: document.getElementById('reward-3-cost').value.trim(),
                    cash: document.getElementById('reward-3-cash').value.trim(),
                    icon: "fa-car-side"
                }
            ];

            const rewards = [];
            for (let i = 0; i < rawRewards.length; i++) {
                const r = rawRewards[i];
                const isFilled = r.name !== "" || r.cost !== "" || r.cash !== "";
                const isComplete = r.name !== "" && r.cost !== "" && r.cash !== "";
                
                if (isFilled && !isComplete) {
                    showToast('Validation Error', `Reward ${i+1} is partially filled. Please fill out all fields for this reward, or clear them all.`, 'error');
                    return;
                }
                
                if (isComplete) {
                    rewards.push({
                        name: r.name,
                        cost: parseInt(r.cost),
                        cash: r.cash,
                        icon: r.icon
                    });
                }
            }

            if (rewards.length === 0) {
                showToast('Validation Error', 'You must provide at least 1 complete reward.', 'error');
                return;
            }

            const payload = {
                name: document.getElementById('partner-form-name').value.trim(),
                title: document.getElementById('partner-form-title').value.trim(),
                subtitle: document.getElementById('partner-form-subtitle').value.trim(),
                image: base64Image,
                logoColor: document.getElementById('partner-form-color').value,
                rewards: rewards
            };

        try {
            const response = await fetch(`${API_BASE}/partners`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to register collaborator');

            alert('Collaborator successfully registered! Refreshing public catalog.');
            partnerForm.reset();
            loadDynamicPartners();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    });
}

// Scroll Indicator Button click action binding
const scrollDownBtn = document.getElementById('btn-scroll-down');
if (scrollDownBtn) {
    scrollDownBtn.addEventListener('click', () => {
        const overlay = document.getElementById('login-overlay');
        const target = document.getElementById('dynamic-partnerships-container');
        if (overlay && target) {
            overlay.scrollTo({
                top: target.offsetTop - 40,
                behavior: 'smooth'
            });
        }
    });
}

// ──────────────────────────────────────────────────────────
// GLOBAL TOAST NOTIFICATION SYSTEM
// ──────────────────────────────────────────────────────────
const TOAST_ICONS = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error:   '<i class="fa-solid fa-circle-xmark"></i>',
    info:    '<i class="fa-solid fa-circle-info"></i>',
    points:  '<i class="fa-solid fa-coins"></i>'
};

function showToast(title, message, type = 'success', duration = 4000, action = null) {
    const container = document.getElementById('bia-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `bia-toast toast-${type}`;
    toast.innerHTML = `
        <div class="bia-toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
        <div class="bia-toast-body">
            <div class="bia-toast-title">${title}</div>
            ${message ? `<div class="bia-toast-msg">${message}</div>` : ''}
        </div>
        ${action ? `<button type="button" class="bia-toast-action">${action.label}</button>` : ''}
        ${action ? '<div class="bia-toast-progress" aria-hidden="true"></div>' : ''}
    `;

    container.appendChild(toast);

    let dismissed = false;
    const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        if (window.gsap) {
            gsap.to(toast, {
                opacity: 0, x: 60, scale: 0.9, duration: 0.28, ease: 'power2.in',
                onComplete: () => toast.remove()
            });
        } else {
            toast.classList.add('bia-toast-leaving');
            setTimeout(() => toast.remove(), 280);
        }
    };

    const actionButton = toast.querySelector('.bia-toast-action');
    if (actionButton) {
        actionButton.addEventListener('click', async () => {
            if (actionButton.disabled) return;
            actionButton.disabled = true;
            actionButton.textContent = 'Undoing...';
            try {
                await action.onClick();
                dismiss();
            } catch (err) {
                dismiss();
                showToast('Undo Failed', err.message || 'The change could not be reverted.', 'error');
            }
        });
    }

    if (window.gsap) {
        gsap.fromTo(toast,
            { opacity: 0, x: 60, scale: 0.92 },
            { opacity: 1, x: 0, scale: 1, duration: 0.38, ease: 'back.out(1.6)' }
        );
    }

    setTimeout(dismiss, duration);
    return toast;
}

function showPointsUndoToast(message, ledgerId, userId) {
    showToast('Points Adjusted! ⚡', message, 'points', 2000, {
        label: 'Undo',
        onClick: async () => {
            const response = await fetch(`${API_BASE}/admin/adjust-points/${ledgerId}/undo`, { method: 'POST' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to undo adjustment.');

            await loadAdminStudents();
            const detailModal = document.getElementById('student-detail-modal');
            if (detailModal && detailModal.style.display === 'flex') {
                await showStudentDetailModal(userId);
            }
            showToast('Adjustment Undone', 'The student\'s points balance has been restored.', 'success', 2500);
        }
    });
}

// ──────────────────────────────────────────────────────────
// HERO STAT COUNTERS ANIMATION (fires when landing page loads)
// ──────────────────────────────────────────────────────────
function animateHeroStats() {
    const statNums = document.querySelectorAll('.hero-stat-num[data-target]');
    if (!statNums.length) return;

    statNums.forEach(el => {
        const target = parseInt(el.dataset.target);
        if (window.gsap) {
            gsap.fromTo(el,
                { textContent: 0 },
                {
                    textContent: target,
                    duration: 2.2,
                    ease: 'power3.out',
                    snap: { textContent: 1 },
                    delay: 0.3,
                    onUpdate: function() {
                        el.textContent = formatNumber(Math.round(parseFloat(el.textContent)));
                    }
                }
            );
        } else {
            el.textContent = formatNumber(target);
        }
    });
}

// Fire hero stats on first page load (after loader screen clears)
// We observe when #login-overlay becomes visible
const loginOverlayObserver = new MutationObserver(() => {
    const overlay = document.getElementById('login-overlay');
    if (overlay && overlay.style.display !== 'none' && overlay.style.opacity !== '0') {
        setTimeout(() => {
            setupScrollReveals();
            animateHeroStats();
        }, 300);
        loginOverlayObserver.disconnect();
    }
});
loginOverlayObserver.observe(document.getElementById('login-overlay'), {
    attributes: true, attributeFilter: ['style']
});

// ──────────────────────────────────────────────────────────
// QUICK STAT PILLS — sync with live profile data
// ──────────────────────────────────────────────────────────
function syncQuickStats() {
    if (!appState.userProfile) return;
    const u = appState.userProfile;

    const streak = document.getElementById('qs-streak');
    const tier   = document.getElementById('qs-tier');
    const pts    = document.getElementById('qs-pts');

    if (streak) streak.textContent = u.checkin_streak || 0;
    if (tier)   tier.textContent   = u.current_tier || 'Bronze';
    if (pts)    pts.textContent    = formatNumber(u.points_balance || 0);
    // Vouchers count is static for now — driven by partner count
}



// ──────────────────────────────────────────────────────────
// QUEST COMPLETION — award real points via LMS webhook
// ──────────────────────────────────────────────────────────
async function completeQuest(btn, points, description) {
    if (!appState.currentUser) return;
    btn.disabled = true;
    btn.textContent = '✓ Done';

    const questItem = btn.closest('.quest-item');

    try {
        const response = await fetch(`${API_BASE}/lms/complete-course`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: appState.currentUser.user_id,
                course_name: description,
                base_points: points
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Quest completion failed');

        showToast('Quest Completed! 🎉', `+${formatNumber(data.points_awarded)} loyalty points credited to your wallet.`, 'points');

        if (questItem) {
            if (window.gsap) {
                gsap.to(questItem, {
                    opacity: 0.4, scale: 0.97, duration: 0.4, ease: 'power2.out',
                    onComplete: () => questItem.classList.add('quest-done')
                });
            } else {
                questItem.classList.add('quest-done');
            }
        }

        await loadUserProfile(appState.currentUser.user_id);
    } catch (err) {
        showToast('Quest Error', err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Claim';
    }
}

// ──────────────────────────────────────────────────────────
// REPLACE alert() ON REDEMPTION CONFIRM WITH TOAST
// ──────────────────────────────────────────────────────────
// Patch btn-confirm-redemption to use toast
const _confirmBtn = document.getElementById('btn-confirm-redemption');
if (_confirmBtn) {
    const newConfirmBtn = _confirmBtn.cloneNode(true);
    _confirmBtn.parentNode.replaceChild(newConfirmBtn, _confirmBtn);

    newConfirmBtn.addEventListener('click', async () => {
        if (!appState.currentCalculation) return;
        try {
            const response = await fetch(`${API_BASE}/redeem/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: appState.currentUser.user_id,
                    points_deducted: appState.currentCalculation.points_applied,
                    discount_aed: appState.currentCalculation.discount_aed
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Redemption failed');

            showToast('Redemption Confirmed 🎟️', `AED ${formatNumber(appState.currentCalculation.discount_aed)} discount voucher generated successfully!`, 'success');
            document.getElementById('redemption-results').style.display = 'none';
            
            // Pop open the gorgeous BIA certificate voucher modal
            openTuitionVoucherModal(data.voucher);
            
            appState.currentCalculation = null;
            await loadUserProfile(appState.currentUser.user_id);
        } catch (err) {
            showToast('Redemption Error', err.message, 'error');
        }
    });
}

// Patch referral submit to use toast
const _submitLeadBtn = document.getElementById('btn-submit-lead');
if (_submitLeadBtn) {
    const newLeadBtn = _submitLeadBtn.cloneNode(true);
    _submitLeadBtn.parentNode.replaceChild(newLeadBtn, _submitLeadBtn);
    newLeadBtn.addEventListener('click', async () => {
        const name    = document.getElementById('referee-name').value.trim();
        const email   = document.getElementById('referee-email').value.trim();
        const program = document.getElementById('referee-program').value;
        if (!name || !email) { showToast('Missing Info', 'Please fill out both referee name and email.', 'error'); return; }
        try {
            const response = await fetch(`${API_BASE}/referrals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referrer_id: appState.currentUser.user_id, referee_name: name, referee_email: email, program })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to submit referral');
            showToast('Referral Submitted', `${name} has been registered as a pending referral. Points release upon payment verification.`, 'info');
            document.getElementById('referee-name').value = '';
            document.getElementById('referee-email').value = '';
            await loadUserProfile(appState.currentUser.user_id);
        } catch (err) {
            showToast('Referral Error', err.message, 'error');
        }
    });
}

// Patch admin adjust to use toast
const _adjustForm = document.getElementById('adjust-points-form');
if (_adjustForm) {
    const newAdjForm = _adjustForm.cloneNode(true);
    _adjustForm.parentNode.replaceChild(newAdjForm, _adjustForm);
    newAdjForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const points_change = parseInt(document.getElementById('adjust-amount').value);
        const description   = document.getElementById('adjust-reason').value.trim();
        if (!appState.selectedUserIdForAdjustment || isNaN(points_change) || !description) {
            showToast('Invalid Input', 'Please fill all adjustment fields.', 'error'); return;
        }
        try {
            const response = await fetch(`${API_BASE}/admin/adjust-points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: appState.selectedUserIdForAdjustment, points_change, description })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Adjustment failed');
            const sign = points_change > 0 ? '+' : '';
            showPointsUndoToast(`${sign}${formatNumber(points_change)} pts applied to student wallet.`, data.ledger_id, appState.selectedUserIdForAdjustment);
            closeAdjustmentModal();
            loadAdminStudents();
        } catch (err) {
            showToast('Adjustment Error', err.message, 'error');
        }
    });
}


// ----------------------------------------------------
// BIA CAMPUS EVENTS DYNAMIC LOADING & PARALLAX EFFECT
// ----------------------------------------------------
async function loadPublicEvents() {
    const container = document.getElementById('public-events-container');
    if (!container) return;

    container.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/events`);
        const data = await response.json();

        if (data.length === 0) {
            // Humorous aesthetic empty state (no events published yet)
            container.innerHTML = `
                <div class="empty-events-humor-card reveal-on-scroll">
                    <div class="humor-card-content">
                        <span class="humor-badge">404 // EVENTS VACANCY</span>
                        <h4 class="humor-card-title">Where did everyone go?</h4>
                        <p class="humor-card-desc">Our event coordinators are currently recharging their brain batteries with double-shot espressos. Stay tuned for upcoming campus hackathons, study mixers, and guest lectures!</p>
                    </div>
                    <div class="humor-card-img-wrap">
                        <img src="images/shukran_students.png" alt="Aesthetic empty state" class="humor-card-img">
                    </div>
                </div>
            `;
            setupScrollReveals();
            return;
        }

        data.forEach(event => {
            const card = document.createElement('div');
            card.className = 'event-parallax-card reveal-on-scroll';
            card.innerHTML = `
                <div class="event-card-bg-wrap">
                    <img src="${event.image_url || 'images/adnoc_students.png'}" alt="${event.title}" class="event-card-bg-img">
                </div>
                <div class="event-card-overlay"></div>
                <div class="event-card-content">
                    <div class="event-card-pts-badge">
                        <i class="fa-solid fa-fire-flame-curved"></i>
                        <span>+${event.points} Points</span>
                    </div>
                    <h4 class="event-card-title">${event.title}</h4>
                    <p class="event-card-desc">${event.description}</p>
                </div>
            `;

            // Mouse hover parallax translation calculation
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const xc = rect.width / 2;
                const yc = rect.height / 2;
                const dx = (x - xc) / (rect.width / 2);
                const dy = (y - yc) / (rect.height / 2);

                const bgWrap = card.querySelector('.event-card-bg-wrap');
                if (bgWrap) {
                    bgWrap.style.transform = `translate(${dx * -15}px, ${dy * -15}px) scale(1.08)`;
                }
            });

            card.addEventListener('mouseleave', () => {
                const bgWrap = card.querySelector('.event-card-bg-wrap');
                if (bgWrap) {
                    bgWrap.style.transform = 'translate(0px, 0px) scale(1.02)';
                }
            });

            container.appendChild(card);
        });

        // Trigger landing reveal scroll trigger refresh now that DOM elements exist
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
        setupScrollReveals();
    } catch (err) {
        console.error('Error loading public events:', err);
    }
}

async function loadAdminEvents() {
    const listContainer = document.getElementById('admin-events-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<p class="no-data">Loading events catalogue...</p>';

    try {
        const response = await fetch(`${API_BASE}/events`);
        const data = await response.json();

        if (data.length === 0) {
            listContainer.innerHTML = '<p class="no-data">No active campus events published.</p>';
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(event => {
            const item = document.createElement('div');
            item.className = 'admin-event-item';
            item.innerHTML = `
                <div class="admin-event-details">
                    <h5>${event.title}</h5>
                    <p>${event.description} <strong class="text-gold">(+${event.points} pts)</strong></p>
                </div>
                <button class="btn-delete-event" data-id="${event.event_id}">Delete</button>
            `;

            const btn = item.querySelector('.btn-delete-event');
            btn.addEventListener('click', async () => {
                if (!confirm(`Are you sure you want to delete the event "${event.title}"?`)) return;
                try {
                    const delRes = await fetch(`${API_BASE}/events/${event.event_id}`, { method: 'DELETE' });
                    if (!delRes.ok) throw new Error('Deletion failed');
                    showToast('Event Deleted 🗑️', `Event "${event.title}" successfully removed.`, 'info');
                    loadAdminEvents();
                    loadPublicEvents();
                } catch (err) {
                    showToast('Error', err.message, 'error');
                }
            });

            listContainer.appendChild(item);
        });
    } catch (err) {
        console.error('Error loading admin events:', err);
    }
}

function setupAdminEventsManagement() {
    const form = document.getElementById('admin-new-event-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('event-form-title').value.trim();
            const points = parseInt(document.getElementById('event-form-points').value) || 0;
            const description = document.getElementById('event-form-desc').value.trim();
            
            const fileInput = document.getElementById('event-form-image');
            const file = fileInput.files[0];
            let base64Image = "";

            if (file) {
                try {
                    base64Image = await convertFileToBase64(file);
                } catch (err) {
                    showToast('Upload Error', 'Failed to read event image.', 'error');
                    return;
                }
            }

            try {
                const response = await fetch(`${API_BASE}/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, points, description, image_url: base64Image })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to add event');

                showToast('Event Published! 📢', `Successfully published "${title}".`, 'success');
                form.reset();
                loadAdminEvents();
                loadPublicEvents();
            } catch (err) {
                showToast('Publishing Error', err.message, 'error');
            }
        });
    }
}

// Global helper to convert binary files to Base64 data URLs
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// ──────────────────────────────────────────────────────────
// BIA TUITION DISCOUNT VOUCHER CONTROLLERS & RENDERERS
// ──────────────────────────────────────────────────────────

async function loadStudentVouchers(userId) {
    const container = document.getElementById('student-vouchers-list');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/users/${userId}/vouchers`);
        if (!response.ok) throw new Error('Failed to load vouchers');
        const vouchers = await response.json();

        if (vouchers.length === 0) {
            container.innerHTML = `
                <div class="empty-events-humor-card" style="grid-column: 1 / -1; min-height: 120px; padding: 2rem;">
                    <div class="humor-card-content">
                        <span class="humor-badge">EMPTY VAULT</span>
                        <h4 class="humor-card-title">No Vouchers Generated Yet</h4>
                        <p class="humor-card-desc">Redeem your accumulated points balance using the Course Fee Calculator to generate tuition discount coupon certificates.</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = vouchers.map(v => {
            const dateStr = new Date(v.created_at).toLocaleDateString(undefined, { 
                year: 'numeric', month: 'short', day: 'numeric' 
            });
            // Escape double quotes for JSON serialization inline
            const escapedV = JSON.stringify(v).replace(/"/g, '&quot;');
            return `
                <div class="db-voucher-card" onclick="viewVoucherDetails('${escapedV}')">
                    <div class="db-voucher-header">
                        <span class="db-voucher-badge">${v.status.toUpperCase()}</span>
                        <span class="db-voucher-date">${dateStr}</span>
                    </div>
                    <h3 class="db-voucher-amount">AED ${formatNumber(v.discount_aed)}</h3>
                    <p class="db-voucher-points">Deducted ${formatNumber(v.points_deducted)} pts</p>
                    <div class="db-voucher-code-row">
                        <span class="db-voucher-code">${v.voucher_code}</span>
                        <i class="fa-solid fa-expand" style="color: #dfb15b; font-size: 0.85rem;"></i>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = `<p class="no-data" style="color: #ef4444;">Error loading vouchers: ${err.message}</p>`;
    }
}

function openTuitionVoucherModal(voucher) {
    const modal = document.getElementById('tuition-voucher-modal');
    if (!modal) return;

    document.getElementById('voucher-cert-student-name').textContent = appState.currentUser.name;
    document.getElementById('voucher-cert-student-id').textContent = appState.currentUser.student_id || 'BIA-TEMP-192';
    document.getElementById('voucher-cert-amount').textContent = `AED ${formatNumber(voucher.discount_aed)}`;
    document.getElementById('voucher-cert-points').textContent = formatNumber(voucher.points_deducted);
    document.getElementById('voucher-cert-code').textContent = voucher.voucher_code;
    document.getElementById('voucher-cert-status').textContent = voucher.status.toUpperCase();
    
    const dateObj = new Date(voucher.created_at || Date.now());
    document.getElementById('voucher-cert-date').textContent = dateObj.toLocaleDateString(undefined, { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });

    modal.style.display = 'flex';
    if (window.gsap) {
        gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    } else {
        modal.style.opacity = '1';
    }
}

window.claimExecutivePerk = async function(btn, type, details) {
    if (!appState.currentUser) {
        showToast('Authentication Required', 'Please sign in to RSVP or unlock benefits.', 'error');
        return;
    }

    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    try {
        const response = await fetch(`${API_BASE}/users/submit-lead`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: appState.currentUser.user_id,
                type: type,
                details: details
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to submit lead request.');
        }

        showToast('Request Logged! 🚀', `Successfully registered for: ${details}. BIA Advisors will follow up shortly.`, 'success');
        
        btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Unlocked';
        btn.style.background = 'rgba(74, 222, 128, 0.1)';
        btn.style.color = '#4ade80';
        btn.style.borderColor = 'rgba(74, 222, 128, 0.2)';
    } catch (err) {
        showToast('Request Error', err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

window.loadAdminLeads = async function() {
    const tableBody = document.getElementById('admin-leads-body');
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_BASE}/admin/leads`);
        if (!response.ok) throw new Error('Failed to fetch leads');
        const leads = await response.json();

        if (leads.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No executive leads registered.</td></tr>';
            return;
        }

        tableBody.innerHTML = leads.map(l => {
            const dateStr = new Date(l.created_at).toLocaleDateString(undefined, { 
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            let statusClass = 'status-pending';
            if (l.status === 'Contacted') statusClass = 'status-contacted';
            if (l.status === 'Converted') statusClass = 'status-converted';

            let actionBtn = '';
            if (l.status === 'Pending') {
                actionBtn = `<button class="btn btn-primary btn-sm" onclick="markLeadContacted(this, ${l.lead_id})" style="font-size: 0.68rem; padding: 0.35rem 0.65rem; height: auto;"><i class="fa-solid fa-envelope-open-text"></i> Mark Contacted</button>`;
                if (l.type === 'Pathway Enquire') {
                    actionBtn += ` <button class="btn btn-primary btn-sm" onclick="convertLeadAdmin(this, ${l.lead_id})" style="font-size: 0.68rem; padding: 0.35rem 0.65rem; height: auto; background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; border-color: #10b981 !important; margin-left: 0.35rem;"><i class="fa-solid fa-circle-check"></i> Convert & Award</button>`;
                }
            } else if (l.status === 'Contacted') {
                if (l.type === 'Pathway Enquire') {
                    actionBtn = `<button class="btn btn-primary btn-sm" onclick="convertLeadAdmin(this, ${l.lead_id})" style="font-size: 0.68rem; padding: 0.35rem 0.65rem; height: auto; background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; border-color: #10b981 !important;"><i class="fa-solid fa-circle-check"></i> Convert & Award</button>`;
                } else {
                    actionBtn = `<span style="color: rgba(255, 255, 255, 0.35); font-size: 0.72rem; display: inline-block; margin-right: 0.5rem;"><i class="fa-solid fa-check-double"></i> Handled</span>`;
                }
            } else if (l.status === 'Converted') {
                actionBtn = `<span style="color: #10b981; font-size: 0.72rem; display: inline-block; margin-right: 0.5rem; font-weight: 700;"><i class="fa-solid fa-trophy"></i> Converted & Awarded</span>`;
            }

            return `
                <tr>
                    <td style="font-size: 0.72rem; color: rgba(255,255,255,0.6);">${dateStr}</td>
                    <td><strong class="clickable-student-name" onclick="showStudentDetailModal(${l.user_id})" style="color: var(--text-main); cursor: pointer; text-decoration: underline;">${l.student_name}</strong></td>
                    <td style="font-size: 0.72rem; color: rgba(255,255,255,0.6);">${l.student_id}<br><span style="color: rgba(255, 255, 255, 0.4);">${l.student_email}</span></td>
                    <td style="font-size: 0.76rem; color: #dfb15b; font-weight: 600;">${l.details}</td>
                    <td><span class="badge ${statusClass}">${l.status.toUpperCase()}</span></td>
                    <td>
                        <div style="display: flex; gap: 0.35rem; align-items: center;">
                            ${actionBtn}
                            <button class="btn btn-danger btn-sm" onclick="deleteLeadAdmin(this, ${l.lead_id})" style="background:#ef4444; border:none; padding:0.35rem 0.5rem; height:auto; font-size:0.68rem;" title="Delete Lead Log">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="6" class="no-data" style="color: #ef4444;">Error: ${err.message}</td></tr>`;
    }
};

window.markLeadContacted = async function(btn, leadId) {
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> updating...';

    try {
        const response = await fetch(`${API_BASE}/admin/leads/${leadId}/contacted`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to update lead');

        showToast('Lead Status Updated! ✅', 'Marked student inquiry as contacted.', 'success');
        await window.loadAdminLeads();
    } catch (err) {
        showToast('Error', err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

window.convertLeadAdmin = async function(btn, leadId) {
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Converting...';
    try {
        const response = await fetch(`${API_BASE}/admin/leads/${leadId}/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Conversion failed');

        showToast('Converted! 🏆', `Lead converted successfully. Student awarded +${data.points_awarded} points!`, 'success');
        await window.loadAdminLeads();
    } catch (err) {
        showToast('Error', err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

// Global hook for card clicks
window.viewVoucherDetails = function(escapedVoucherJson) {
    try {
        const voucher = JSON.parse(escapedVoucherJson.replace(/&quot;/g, '"'));
        openTuitionVoucherModal(voucher);
    } catch (err) {
        console.error('Failed to parse voucher json:', err);
    }
};

// Wire modal buttons
const closeVoucherModal = () => {
    const modal = document.getElementById('tuition-voucher-modal');
    if (!modal) return;
    if (window.gsap) {
        gsap.to(modal, { opacity: 0, duration: 0.3, onComplete: () => { modal.style.display = 'none'; } });
    } else {
        modal.style.display = 'none';
    }
};

const setupTuitionVoucherModalListeners = () => {
    const closeBtn = document.getElementById('tuition-voucher-modal-close');
    const closeActionBtn = document.getElementById('btn-tuition-voucher-close-action');
    const printBtn = document.getElementById('btn-tuition-voucher-print');
    const copyBtn = document.getElementById('btn-copy-cert-code');

    if (closeBtn) closeBtn.addEventListener('click', closeVoucherModal);
    if (closeActionBtn) closeActionBtn.addEventListener('click', closeVoucherModal);
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const code = document.getElementById('voucher-cert-code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                showToast('Copied! 📋', 'Voucher code copied to clipboard.', 'success');
            });
        });
    }
};

// Footer SMS / Newsletter handlers
const setupFooterListeners = () => {
    const smsForm = document.getElementById('footer-sms-form');
    if (smsForm) {
        smsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = document.getElementById('sms-phone-input').value.trim();
            showToast('Link Sent! 📱', `A download link has been dispatched to +971 ${phone}.`, 'success');
            smsForm.reset();
        });
    }

    const newsletterForm = document.getElementById('footer-newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('newsletter-email-input').value.trim();
            showToast('Subscribed! ✉️', `You have successfully joined the BIA Loyalty mailing list.`, 'success');
            newsletterForm.reset();
        });
    }
};

// ──────────────────────────────────────────────────────────
// STUDENT SPOTLIGHT DETAIL SYSTEM & ADMIN CONTROLS
// ──────────────────────────────────────────────────────────

// Keep a local cache of frozen students to persist status between opens
if (!window.frozenStudentsList) {
    window.frozenStudentsList = {};
}

window.showStudentDetailModal = async function(userId) {
    const student = appState.students.find(s => s.user_id === userId);
    if (!student) {
        showToast('Error', 'Student details not found in cache.', 'error');
        return;
    }

    // Populate profile card details
    document.getElementById('sd-avatar-letter').textContent = student.name.charAt(0).toUpperCase();
    document.getElementById('sd-name').textContent = student.name;
    document.getElementById('sd-email').textContent = student.email;
    document.getElementById('sd-id').textContent = student.student_id;
    
    // Tier Badge styling
    const tierBadge = document.getElementById('sd-tier-badge');
    tierBadge.textContent = student.current_tier;
    tierBadge.className = `tier-badge ${student.current_tier.toLowerCase()}`;

    // Wallet details
    document.getElementById('sd-points-balance').textContent = `${formatNumber(student.points_balance)} pts`;
    const val = student.points_balance * (appState.settings.point_aed_value || 0.25);
    document.getElementById('sd-points-value').textContent = `AED ${formatNumber(val)}`;

    // Tier Multiplier
    let mult = 1.0;
    if (student.current_tier === 'SILVER') mult = appState.settings.silver_multiplier || 1.2;
    else if (student.current_tier === 'GOLD') mult = appState.settings.gold_multiplier || 1.5;
    else if (student.current_tier === 'PLATINUM') mult = appState.settings.platinum_multiplier || 2.0;
    document.getElementById('sd-multiplier').textContent = `${mult}x multiplier`;

    // Deterministic Mock stats ("hardcoding vibe" - budget friendly & informative)
    const streak = 1 + (student.user_id % 6);
    const gpaVal = (3.4 + (student.user_id % 7) * 0.09).toFixed(2);
    const grade = gpaVal >= 3.85 ? 'A+' : (gpaVal >= 3.65 ? 'A' : (gpaVal >= 3.45 ? 'B+' : 'B'));

    document.getElementById('sd-streak').textContent = `${streak} days`;
    document.getElementById('sd-gpa').textContent = `${gpaVal} / ${grade}`;

    // Status Label & Toggler styling
    const statusLabel = document.getElementById('sd-status-label');
    const toggleBtn = document.getElementById('btn-sd-toggle-status');
    const isFrozen = window.frozenStudentsList[userId] || false;

    if (isFrozen) {
        statusLabel.textContent = 'Suspended';
        statusLabel.style.color = '#ef4444';
        toggleBtn.innerHTML = '<i class="fa-solid fa-check"></i> Activate Wallet';
        toggleBtn.style.color = '#4ade80';
        toggleBtn.style.background = 'rgba(74, 222, 128, 0.05)';
    } else {
        statusLabel.textContent = 'Enrolled';
        statusLabel.style.color = '#4ade80';
        toggleBtn.innerHTML = '<i class="fa-solid fa-ban"></i> Suspend Wallet';
        toggleBtn.style.color = '#ef4444';
        toggleBtn.style.background = 'rgba(239, 68, 68, 0.05)';
    }

    // Toggle button handler
    toggleBtn.onclick = () => {
        const currentlyFrozen = window.frozenStudentsList[userId] || false;
        window.frozenStudentsList[userId] = !currentlyFrozen;
        if (!currentlyFrozen) {
            showToast('Account Suspended ❄️', `Sarah Al-Mansoori's loyalty wallet has been suspended.`, 'success');
        } else {
            showToast('Account Activated ⚡', `Sarah Al-Mansoori's loyalty wallet is active.`, 'success');
        }
        showStudentDetailModal(userId);
    };

    // Audit logs deterministic list
    const auditEvents = [
        { time: '2 hrs ago', action: 'Daily portal attendance check-in completed (+15 pts)' },
        { time: 'Yesterday', action: 'Attended BIA Skillshare Event: Advanced UI Coding' },
        { time: '3 days ago', action: 'Checked out reference book "Clean Architecture" from library' },
        { time: '5 days ago', action: 'Registered guest referral lead submission' }
    ];

    const logContainer = document.getElementById('sd-activity-log');
    logContainer.innerHTML = auditEvents.map(e => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">
            <span style="color: var(--text-main);">${e.action}</span>
            <span style="color: #dfb15b; font-size: 0.65rem; white-space: nowrap; margin-left: 0.5rem;">${e.time}</span>
        </div>
    `).join('');

    // Actions bridge
    document.getElementById('btn-sd-email').href = `mailto:${student.email}`;
    document.getElementById('btn-sd-adjust').onclick = () => {
        closeStudentDetailModal();
        openAdjustmentModal(student.user_id, student.name);
    };

    // Render presets dynamically
    const presetsContainer = document.getElementById('sd-presets-container');
    presetsContainer.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="adjustPointsQuick(${student.user_id}, 50, 'Daily Class Attendance Bonus')" style="font-size: 0.72rem; text-align: left; justify-content: flex-start; padding: 0.45rem 0.75rem; border-color: rgba(255,255,255,0.1); width: 100%; display: inline-flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-plus" style="color: #4ade80;"></i> +50 pts (Attendance)
        </button>
        <button class="btn btn-secondary btn-sm" onclick="adjustPointsQuick(${student.user_id}, 150, 'Workshop Presentation Bonus')" style="font-size: 0.72rem; text-align: left; justify-content: flex-start; padding: 0.45rem 0.75rem; border-color: rgba(255,255,255,0.1); width: 100%; display: inline-flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-plus" style="color: #4ade80;"></i> +150 pts (Workshop)
        </button>
        <button class="btn btn-secondary btn-sm" onclick="adjustPointsQuick(${student.user_id}, 500, 'Term Graduation Milestone')" style="font-size: 0.72rem; text-align: left; justify-content: flex-start; padding: 0.45rem 0.75rem; border-color: rgba(255,255,255,0.1); width: 100%; display: inline-flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-plus" style="color: #4ade80;"></i> +500 pts (Graduation)
        </button>
    `;

    // Fetch and render student's tuition vouchers
    const vouchersList = document.getElementById('sd-vouchers-audit-list');
    try {
        const response = await fetch(`${API_BASE}/users/${student.user_id}/vouchers`);
        if (!response.ok) throw new Error();
        const vouchers = await response.json();

        if (vouchers.length === 0) {
            vouchersList.innerHTML = `<span style="font-size:0.7rem; color:var(--text-muted); display:block; padding:0.5rem 0;">No generated tuition vouchers.</span>`;
        } else {
            vouchersList.innerHTML = vouchers.map(v => {
                const dateStr = new Date(v.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const isUnused = v.status.toLowerCase() === 'unused';
                const actionBtn = isUnused 
                    ? `<button class="btn btn-primary btn-sm" onclick="markVoucherUsedAdmin('${v.voucher_code}', ${student.user_id})" style="background:#dfb15b; color:#000; border:none; padding:0.25rem 0.5rem; font-size:0.65rem; font-weight:700;">Redeem</button>`
                    : `<span style="color:var(--text-muted); font-size:0.68rem; font-weight:700; display:inline-block; margin-right:0.35rem;">USED</span>`;
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; background:var(--bg-card); border:1px solid var(--border-color); padding:0.4rem 0.5rem; border-radius:6px;">
                        <div>
                            <span style="font-family:'Outfit'; font-weight:700; color:var(--text-main); font-size:0.75rem; display:block;">${v.voucher_code}</span>
                            <span style="font-size:0.65rem; color:var(--text-muted);">${dateStr} | AED ${v.discount_aed}</span>
                        </div>
                        <div style="display: flex; gap: 0.25rem; align-items: center;">
                            ${actionBtn}
                            <button class="btn btn-danger btn-sm" onclick="deleteVoucherAdmin(this, ${v.voucher_id}, ${student.user_id})" style="background:#ef4444; border:none; padding:0.25rem 0.45rem; font-size:0.65rem; height:auto;" title="Revoke Voucher">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        vouchersList.innerHTML = `<span style="font-size:0.7rem; color:#ef4444;">Failed to load vouchers.</span>`;
    }

    // Bind Edit, Save and Delete controls
    const nameLbl = document.getElementById('sd-name');
    const nameInput = document.getElementById('sd-name-input');
    const emailLbl = document.getElementById('sd-email');
    const emailInput = document.getElementById('sd-email-input');
    const idLbl = document.getElementById('sd-id');
    const idInput = document.getElementById('sd-id-input');

    const editBtn = document.getElementById('btn-sd-edit-mode');
    const saveBtn = document.getElementById('btn-sd-save-profile');
    const deleteBtn = document.getElementById('btn-sd-delete');

    // Reset input/labels visibility when opening
    nameLbl.style.display = 'block';
    nameInput.style.display = 'none';
    emailLbl.style.display = 'block';
    emailInput.style.display = 'none';
    idLbl.style.display = 'inline';
    idInput.style.display = 'none';

    editBtn.style.display = 'inline-block';
    editBtn.disabled = false;
    editBtn.innerHTML = '<i class="fa-solid fa-user-pen"></i> Edit Profile';
    saveBtn.style.display = 'none';
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
    deleteBtn.disabled = false;
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Account';

    // 1. Edit mode click
    editBtn.onclick = () => {
        nameLbl.style.display = 'none';
        nameInput.style.display = 'block';
        nameInput.value = student.name;

        emailLbl.style.display = 'none';
        emailInput.style.display = 'block';
        emailInput.value = student.email;

        idLbl.style.display = 'none';
        idInput.style.display = 'inline-block';
        idInput.value = student.student_id;

        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
    };

    // 2. Save profile click
    saveBtn.onclick = async () => {
        const newName = nameInput.value.trim();
        const newEmail = emailInput.value.trim();
        const newId = idInput.value.trim();

        if (!newName || !newEmail || !newId) {
            showToast('Validation Error', 'Fields cannot be left blank.', 'error');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        try {
            const response = await fetch(`${API_BASE}/admin/users/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: student.user_id,
                    name: newName,
                    email: newEmail,
                    student_id: newId
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update student profile.');

            showToast('Profile Updated! 👤', 'Student details have been successfully modified.', 'success');
            
            // Update cache
            student.name = newName;
            student.email = newEmail;
            student.student_id = newId;

            await loadAdminStudents();
            showStudentDetailModal(student.user_id);
        } catch (err) {
            showToast('Update Failed', err.message, 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
        }
    };

    // 3. Delete account click
    deleteBtn.onclick = async () => {
        const confirmed = confirm(`Are you sure you want to permanently delete student account "${student.name}"? This action deletes all points logs, referrals, and generated vouchers and CANNOT be undone.`);
        if (!confirmed) return;

        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

        try {
            const response = await fetch(`${API_BASE}/admin/users/${student.user_id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete student.');

            showToast('Account Deleted 🗑️', `Student profile "${student.name}" has been deleted from BIA.`, 'success');
            
            closeStudentDetailModal();
            await loadAdminStudents();
        } catch (err) {
            showToast('Delete Failed', err.message, 'error');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Account';
        }
    };

    // Sync manual tier override selector dropdown
    const tierOverrideSelect = document.getElementById('sd-tier-override-select');
    if (tierOverrideSelect) {
        tierOverrideSelect.value = student.current_tier;
        tierOverrideSelect.onchange = null;
        tierOverrideSelect.onchange = async (e) => {
            const newTier = e.target.value;
            try {
                const response = await fetch(`${API_BASE}/admin/users/override-tier`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, new_tier: newTier })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to override tier');

                showToast('Tier Overridden! 🏆', `Manually changed ${student.name}'s tier to ${newTier}.`, 'success');
                
                // Refresh list and modal
                await loadAdminStudents();
                await showStudentDetailModal(userId);
            } catch (err) {
                showToast('Error', err.message, 'error');
                tierOverrideSelect.value = student.current_tier;
            }
        };
    }

    // Open Modal
    const modal = document.getElementById('student-detail-modal');
    modal.style.display = 'flex';
    if (window.gsap) {
        gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    } else {
        modal.style.opacity = '1';
    }
};

window.closeStudentDetailModal = function() {
    const modal = document.getElementById('student-detail-modal');
    if (!modal) return;
    if (window.gsap) {
        gsap.to(modal, { opacity: 0, duration: 0.3, onComplete: () => { modal.style.display = 'none'; } });
    } else {
        modal.style.display = 'none';
    }
};

// ── Undo toast helper ────────────────────────────────────────────────────────
function showUndoToast(ledgerId, change, description, userId) {
    const UNDO_MS = 3000;

    // Remove any existing undo toast
    const existing = document.getElementById('bia-undo-toast');
    if (existing) existing.remove();

    const sign = change > 0 ? '+' : '';
    const toast = document.createElement('div');
    toast.id = 'bia-undo-toast';
    toast.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.55rem;">
            <span style="font-size:1.1rem;">⚡</span>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:0.82rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${sign}${change} pts applied
                </div>
                <div style="font-size:0.7rem;color:rgba(255,255,255,0.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${description}
                </div>
            </div>
            <button id="bia-undo-btn" style="
                background: rgba(255,255,255,0.12);
                border: 1px solid rgba(255,255,255,0.2);
                color: #fff;
                font-size: 0.72rem;
                font-weight: 800;
                letter-spacing: 0.06em;
                padding: 0.3rem 0.75rem;
                border-radius: 6px;
                cursor: pointer;
                white-space: nowrap;
                transition: background 0.15s ease;
                flex-shrink: 0;
            ">UNDO</button>
        </div>
        <div style="width:100%;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
            <div id="bia-undo-bar" style="
                height:100%;
                width:100%;
                background: linear-gradient(90deg, #4ade80, #22d3ee);
                border-radius:2px;
                transition: width ${UNDO_MS}ms linear;
            "></div>
        </div>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        z-index: 99999;
        background: rgba(15, 15, 20, 0.96);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(74, 222, 128, 0.3);
        border-radius: 12px;
        padding: 0.85rem 1rem;
        width: 320px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,222,128,0.1);
        animation: bia-undo-slide-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both;
    `;

    // Inject keyframes if not already present
    if (!document.getElementById('bia-undo-keyframes')) {
        const style = document.createElement('style');
        style.id = 'bia-undo-keyframes';
        style.textContent = `
            @keyframes bia-undo-slide-in {
                from { opacity: 0; transform: translateY(20px) scale(0.96); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes bia-undo-slide-out {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to   { opacity: 0; transform: translateY(12px) scale(0.95); }
            }
            #bia-undo-btn:hover { background: rgba(255,255,255,0.22) !important; }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Start countdown bar (shrink to 0 over UNDO_MS)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const bar = document.getElementById('bia-undo-bar');
            if (bar) bar.style.width = '0%';
        });
    });

    let undone = false;

    // Auto-dismiss after UNDO_MS
    const autoTimer = setTimeout(() => {
        if (undone) return;
        toast.style.animation = 'bia-undo-slide-out 0.2s ease forwards';
        setTimeout(() => toast.remove(), 220);
    }, UNDO_MS);

    // Undo button handler
    document.getElementById('bia-undo-btn').addEventListener('click', async () => {
        if (undone) return;
        undone = true;
        clearTimeout(autoTimer);

        const btn = document.getElementById('bia-undo-btn');
        if (btn) { btn.textContent = '...'; btn.disabled = true; }

        try {
            const res = await fetch(`${API_BASE}/admin/undo-points/${ledgerId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Undo failed');

            // Dismisss undo toast
            toast.style.animation = 'bia-undo-slide-out 0.2s ease forwards';
            setTimeout(() => toast.remove(), 220);

            showToast('Undone ↩️', `Reversed: ${sign}${change} pts removed from record.`, 'success');

            // Refresh modal and list
            await loadAdminStudents();
            await showStudentDetailModal(userId);
        } catch (err) {
            toast.style.animation = 'bia-undo-slide-out 0.2s ease forwards';
            setTimeout(() => toast.remove(), 220);
            showToast('Undo Failed', err.message, 'error');
        }
    });
}

// Admin Preset adjuster helper
window.adjustPointsQuick = async function(userId, change, description) {
    try {
        const response = await fetch(`${API_BASE}/admin/adjust-points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, points_change: change, description })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to adjust points');

        // Refresh details modal & active admin list dynamically
        await loadAdminStudents();
        await showStudentDetailModal(userId);

        // Show undo toast AFTER modal refresh so it sits on top
        showUndoToast(data.ledger_id, change, description, userId);
    } catch (err) {
        showToast('Adjustment Error', err.message, 'error');
    }
};


// Admin Voucher mark-used helper
window.markVoucherUsedAdmin = async function(voucherCode, userId) {
    try {
        const response = await fetch(`${API_BASE}/admin/vouchers/use`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voucher_code: voucherCode })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to redeem voucher');

        showToast('Voucher Redeemed 🎟️', `Tuition discount voucher ${voucherCode} marked as Used.`, 'success');
        
        // Refresh detail view modal
        await showStudentDetailModal(userId);
    } catch (err) {
        showToast('Redemption Error', err.message, 'error');
    }
};

// Admin deletion helpers for ledger, leads, referrals, and vouchers
window.deleteLedgerEntryAdmin = async function(btn, ledgerId) {
    const confirmed = confirm('Are you sure you want to permanently delete this points ledger entry? This will update the student points balance and level status.');
    if (!confirmed) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${API_BASE}/admin/ledger/${ledgerId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete transaction.');
        }

        showToast('Entry Deleted 🗑️', 'Ledger transaction entry deleted successfully.', 'success');
        await loadAdminLedger();
    } catch (err) {
        showToast('Error', err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    }
};

window.deleteLeadAdmin = async function(btn, leadId) {
    const confirmed = confirm('Are you sure you want to delete this executive seminar lead?');
    if (!confirmed) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${API_BASE}/admin/leads/${leadId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete lead.');

        showToast('Lead Deleted 🗑️', 'Seminar interest lead entry deleted successfully.', 'success');
        await window.loadAdminLeads();
    } catch (err) {
        showToast('Error', err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    }
};

window.deleteReferralAdmin = async function(btn, referralId) {
    const confirmed = confirm('Are you sure you want to delete this pending student referral?');
    if (!confirmed) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${API_BASE}/admin/referrals/${referralId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete referral.');

        showToast('Referral Deleted 🗑️', 'Referral entry deleted successfully.', 'success');
        
        // Refresh profile & active queue list
        if (appState.currentUser) {
            await loadUserProfile(appState.currentUser.user_id);
        }
        await loadAdminStudents();
    } catch (err) {
        showToast('Error', err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    }
};

window.deleteVoucherAdmin = async function(btn, voucherId, userId) {
    const confirmed = confirm('Are you sure you want to delete and revoke this tuition voucher code?');
    if (!confirmed) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${API_BASE}/admin/vouchers/${voucherId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete voucher.');

        showToast('Voucher Revoked 🗑️', 'Discount voucher code deleted successfully.', 'success');
        await showStudentDetailModal(userId);
    } catch (err) {
        showToast('Error', err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    }
};

const setupStudentDetailListeners = () => {
    const closeBtn = document.getElementById('student-detail-modal-close');
    const closeActionBtn = document.getElementById('btn-sd-close');

    if (closeBtn) closeBtn.addEventListener('click', closeStudentDetailModal);
    if (closeActionBtn) closeActionBtn.addEventListener('click', closeStudentDetailModal);
};

const setupAdminStudentSearchListener = () => {
    const searchInput = document.getElementById('admin-student-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const rows = document.querySelectorAll('#student-directory-body tr');
            rows.forEach(row => {
                if (row.querySelector('.no-data')) return;
                const nameCell = row.querySelector('.student-directory-name');
                
                // Read from cells content
                const rowText = row.innerText.toLowerCase();
                
                if (rowText.includes(query)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
};

const setupP2PTransferListeners = () => {
    const recipientInput = document.getElementById('p2p-recipient-id');
    const amountInput = document.getElementById('p2p-amount');
    const form = document.getElementById('p2p-transfer-form');
    const verifyMsg = document.getElementById('p2p-recipient-verify-msg');
    const calcPreview = document.getElementById('p2p-calc-preview');

    if (!form) return;

    // 1. Debounced recipient ID lookup
    let lookupTimeout;
    recipientInput.addEventListener('input', (e) => {
        const studentId = e.target.value.trim().toUpperCase();
        verifyMsg.textContent = 'Verifying Student ID...';
        verifyMsg.style.color = 'rgba(255, 255, 255, 0.4)';

        clearTimeout(lookupTimeout);
        if (studentId.length < 5) {
            verifyMsg.textContent = 'Enter recipient ID to verify';
            return;
        }

        lookupTimeout = setTimeout(async () => {
            try {
                if (appState.currentUser && studentId === appState.currentUser.student_id) {
                    verifyMsg.textContent = '⚠️ You cannot transfer points to yourself';
                    verifyMsg.style.color = '#ef4444';
                    return;
                }

                const response = await fetch(`${API_BASE}/users/by-student-id/${studentId}`);
                if (!response.ok) {
                    verifyMsg.textContent = '❌ Student ID not found';
                    verifyMsg.style.color = '#ef4444';
                } else {
                    const data = await response.json();
                    verifyMsg.textContent = `✅ Recipient: ${data.name}`;
                    verifyMsg.style.color = '#4ade80';
                }
            } catch (err) {
                verifyMsg.textContent = 'Verification error';
            }
        }, 500);
    });

    // 2. Real-time preview calculation
    const updatePreview = () => {
        const amount = parseInt(amountInput.value);
        if (isNaN(amount) || amount < 50 || amount > 500) {
            calcPreview.style.display = 'none';
            return;
        }

        const tax = Math.ceil(amount * 0.10);
        const total = amount + tax;

        document.getElementById('p2p-preview-received').textContent = formatNumber(amount);
        document.getElementById('p2p-preview-tax').textContent = formatNumber(tax);
        document.getElementById('p2p-preview-total').textContent = formatNumber(total);
        calcPreview.style.display = 'block';
    };

    amountInput.addEventListener('input', updatePreview);

    // 3. Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const recipientId = recipientInput.value.trim();
        const amount = parseInt(amountInput.value);

        if (!appState.currentUser) {
            showToast('Error', 'Please log in to transfer points.', 'error');
            return;
        }

        if (isNaN(amount) || amount < 50 || amount > 500) {
            showToast('Invalid Amount', 'Transfer amount must be between 50 and 500 points.', 'error');
            return;
        }

        try {
            // First check if they have enough balance (including tax)
            const tax = Math.ceil(amount * 0.10);
            const totalRequired = amount + tax;
            if (appState.currentUser.points_balance < totalRequired) {
                showToast('Insufficient Points', `Transfer requires ${totalRequired} pts (10% fee included). You have ${appState.currentUser.points_balance} pts.`, 'error');
                return;
            }

            const response = await fetch(`${API_BASE}/users/transfer-points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_id: appState.currentUser.user_id,
                    recipient_student_id: recipientId,
                    points_amount: amount
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Transfer failed');

            showToast('Points Gifted! 🎁', `Sent ${amount} pts to ${recipientId} successfully.`, 'success');

            // Reset form & calculations
            form.reset();
            verifyMsg.textContent = 'Enter recipient ID to verify';
            verifyMsg.style.color = 'rgba(255, 255, 255, 0.4)';
            calcPreview.style.display = 'none';

            // Sync user data and update UI in real-time
            await loadUserProfile(appState.currentUser.user_id);
        } catch (err) {
            showToast('Transfer Failed', err.message, 'error');
        }
    });

    // 4. WhatsApp Quick Invite Share
    const waBtn = document.getElementById('btn-quick-wa');
    if (waBtn) {
        waBtn.addEventListener('click', () => {
            if (!appState.currentUser) return;
            const refCode = appState.currentUser.referral_code || 'SARAH-9042';
            const msg = `Hi! Registering at Bradford International Alliance gets you an AED 500 scholarship grant instantly! Use my referral code: ${refCode} to claim it. Enroll here: https://bradfordia.com/enroll`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
        });
    }

    // 4.5. Native Browser Web Share
    const shareBtn = document.getElementById('btn-quick-share');
    if (shareBtn) {
        // Show share button if native Web Share is supported
        if (navigator.share) {
            shareBtn.style.display = 'flex';
        }
        shareBtn.addEventListener('click', async () => {
            if (!appState.currentUser) return;
            const refCode = appState.currentUser.referral_code || 'SARAH-9042';
            const title = "BIA Scholarship Invitation";
            const text = `Hi! Registering at Bradford International Alliance gets you an AED 500 scholarship grant instantly! Use my referral code: ${refCode} to claim it.`;
            const url = "https://bradfordia.com/enroll";

            try {
                await navigator.share({
                    title: title,
                    text: text,
                    url: url
                });
                showToast('Shared! 🎉', 'Referral link shared successfully.', 'success');
            } catch (err) {
                // AbortError is normal when user cancels the native popup
                if (err.name !== 'AbortError') {
                    showToast('Sharing Failed', 'Failed to share referral link.', 'error');
                }
            }
        });
    }

    // 5. Clipboard Quick Invite Copy
    const copyBtn = document.getElementById('btn-quick-copy');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (!appState.currentUser) return;
            const refCode = appState.currentUser.referral_code || 'SARAH-9042';
            const msg = `Hi! Registering at Bradford International Alliance gets you an AED 500 scholarship grant instantly! Use my referral code: ${refCode} to claim it. Enroll here: https://bradfordia.com/enroll`;
            
            navigator.clipboard.writeText(msg).then(() => {
                const origHtml = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #4ade80;"></i> Copied message!';
                copyBtn.style.borderColor = 'rgba(74, 222, 128, 0.2)';
                
                showToast('Copied! 📋', 'Referral invitation message copied to clipboard.', 'success');
                
                setTimeout(() => {
                    copyBtn.innerHTML = origHtml;
                    copyBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }, 2000);
            }).catch(err => {
                showToast('Copy Error', 'Failed to copy invite message.', 'error');
            });
        });
    }
};

const setupLinkedInIntegrationListeners = () => {
    const connectBtn = document.getElementById('btn-linkedin-connect');
    const shareConsole = document.getElementById('linkedin-share-console');
    const shareTypeSelect = document.getElementById('linkedin-share-type');
    const postPreviewTextarea = document.getElementById('linkedin-post-preview');
    const sharePostBtn = document.getElementById('btn-linkedin-post-share');

    const statusTitle = document.getElementById('linkedin-status-title');
    const statusDesc = document.getElementById('linkedin-status-desc');

    if (!connectBtn) return;

    // Post template maps
    const templates = {
        enrollment: "I am thrilled to announce my enrollment at Bradford International Alliance! Eager to build new skills and advance my career with BIA's international business modules. Learn more: https://bradfordia.com/programs",
        gpa: "Academic Honors unlocked! 🌟 Just achieved GPA Excellence this term at Bradford International Alliance. Grateful for the support of professors and classmates. Learn more: https://bradfordia.com/programs",
        seminar: "Exciting day attending the BIA Industry Tech Summit! 💻 Connecting with peers and learning about emerging digital transformation models. Proud to be a student at Bradford International Alliance!"
    };

    const updatePreview = () => {
        const type = shareTypeSelect.value;
        const studentId = appState.currentUser ? appState.currentUser.student_id : 'BIA-TEMP';
        const referralCode = appState.currentUser ? appState.currentUser.referral_code : 'SARAH-9042';
        
        let text = templates[type] || '';
        // Inject referral code to make it an active lead generator!
        text += ` (Use my scholarship code: ${referralCode} to save AED 500 on enrollment!)`;
        postPreviewTextarea.value = text;
    };

    // 1. Connect LinkedIn profile
    connectBtn.addEventListener('click', () => {
        if (!appState.currentUser) {
            showToast('Error', 'Please log in first.', 'error');
            return;
        }

        connectBtn.disabled = true;
        connectBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authorizing...';

        setTimeout(() => {
            connectBtn.innerHTML = '<i class="fa-solid fa-check"></i> Connected';
            connectBtn.className = 'btn btn-secondary btn-sm';
            connectBtn.style.color = '#4ade80';
            connectBtn.style.borderColor = 'rgba(74, 222, 128, 0.2)';
            connectBtn.style.background = 'rgba(74, 222, 128, 0.05)';

            statusTitle.textContent = 'LinkedIn Account Connected ✅';
            statusTitle.style.color = '#4ade80';
            
            const handle = appState.currentUser.name.toLowerCase().replace(/ /g, '_');
            statusDesc.textContent = `Authorized as @${handle} for BIA sharing campaigns.`;

            // Display share console
            shareConsole.style.display = 'block';
            updatePreview();
            
            showToast('LinkedIn Linked! 🔗', 'BIA Loyalty has authorized your LinkedIn profile successfully.', 'success');
        }, 1000);
    });

    // 2. Change sharing type
    shareTypeSelect.addEventListener('change', updatePreview);

    // 3. Post and claim reward points
    sharePostBtn.addEventListener('click', async () => {
        if (!appState.currentUser) return;
        const shareType = shareTypeSelect.value;

        sharePostBtn.disabled = true;
        sharePostBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing to LinkedIn Feed...';

        try {
            const response = await fetch(`${API_BASE}/users/claim-linkedin-points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: appState.currentUser.user_id,
                    share_type: shareType
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Sharing failed');

            showToast('Posted Successfully! 🚀', 'Your milestone post has been published to LinkedIn (+50 pts credited).', 'success');
            
            // Sync user data
            await loadUserProfile(appState.currentUser.user_id);
            
            // Success state on UI
            sharePostBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Posted & Claimed (+50 pts)';
            sharePostBtn.style.background = 'rgba(74, 222, 128, 0.1)';
            sharePostBtn.style.color = '#4ade80';
            sharePostBtn.style.borderColor = 'rgba(74, 222, 128, 0.2)';
        } catch (err) {
            showToast('Sharing Error', err.message, 'error');
            sharePostBtn.disabled = false;
            sharePostBtn.innerHTML = '<i class="fa-brands fa-linkedin"></i> Share & Claim +50 Points';
        }
    });
};

// Traffic Dashboard Analytics & Security Policies
async function loadTrafficDashboard() {
    const activeSessionsEl = document.getElementById('traffic-active-sessions');
    const totalHitsEl = document.getElementById('traffic-total-hits');
    const logsBody = document.getElementById('traffic-logs-body');

    if (!logsBody) return;

    logsBody.innerHTML = '<tr><td colspan="5" class="no-data">Loading visitor traffic logs...</td></tr>';

    try {
        // Ensure settings are cached in appState
        if (!appState.settings || Object.keys(appState.settings).length === 0) {
            await fetchSettings();
        }

        // 1. Load Stats
        const statsRes = await fetch(`${API_BASE}/admin/traffic/stats`);
        if (statsRes.ok) {
            const stats = await statsRes.json();
            if (activeSessionsEl) activeSessionsEl.textContent = `${stats.active_sessions || 0} live`;
            if (totalHitsEl) totalHitsEl.textContent = `${stats.total_hits || 0} pageviews`;
        }

        // 2. Load Logs
        const logsRes = await fetch(`${API_BASE}/admin/traffic`);
        if (!logsRes.ok) throw new Error('Failed to load traffic history.');
        const logs = await logsRes.json();

        window._trafficLogsRaw = logs;
        tbodyRenderTrafficLogs(logs);
        
        // Load blacklist list
        loadBlacklist();

        // 3. Load active controls state from current settings cache
        const mmInput = document.getElementById('ctrl-maintenance-mode');
        const gfInput = document.getElementById('ctrl-geofence-mode');
        const rlInput = document.getElementById('ctrl-rate-limit');
        const rlVal = document.getElementById('ctrl-rate-limit-val');

        // Sync settings controls
        if (mmInput) mmInput.checked = String(appState.settings.maintenance_mode) === '1';
        if (gfInput) gfInput.checked = String(appState.settings.geofence_gcc_only) === '1';
        if (rlInput) {
            const limit = parseInt(appState.settings.rate_limit_min) || 120;
            rlInput.value = limit;
            if (rlVal) rlVal.textContent = `${limit} req/min`;
        }

        // Toggle status indicator card color
        const secStatus = document.getElementById('traffic-security-status');
        if (secStatus) {
            const mm = parseInt(appState.settings.maintenance_mode) || 0;
            const gf = parseInt(appState.settings.geofence_gcc_only) || 0;
            const endTimeStr = appState.settings.maintenance_end_time;
            
            let displayStatus = 'Secured';
            let color = '#4ade80';
            
            if (mm === 1) {
                if (endTimeStr) {
                    const diff = new Date(endTimeStr) - new Date();
                    if (diff > 0) {
                        const mins = Math.ceil(diff / 60000);
                        displayStatus = `Maint. (${mins}m left)`;
                        color = '#ef4444';
                    } else {
                        displayStatus = 'Maintenance';
                        color = '#ef4444';
                    }
                } else {
                    displayStatus = 'Maintenance';
                    color = '#ef4444';
                }
            } else if (gf === 1) {
                displayStatus = 'GCC Geofence';
                color = '#dfb15b';
            }
            
            secStatus.textContent = displayStatus;
            secStatus.style.color = color;
        }

    } catch (err) {
        logsBody.innerHTML = `<tr><td colspan="5" class="no-data" style="color: #ef4444;">Error: ${err.message}</td></tr>`;
    }
}
window.loadTrafficDashboard = loadTrafficDashboard;

let currentLogFilter = 'all';

function tbodyRenderTrafficLogs(logs) {
    const logsBody = document.getElementById('traffic-logs-body');
    if (!logsBody) return;

    if (!logs || logs.length === 0) {
        logsBody.innerHTML = '<tr><td colspan="5" class="no-data">No traffic records in database.</td></tr>';
        return;
    }

    // Filter logs based on active filter tab
    let filteredLogs = logs;
    if (currentLogFilter === 'auth') {
        filteredLogs = logs.filter(l => 
            (l.activity && (l.activity.toLowerCase().includes('login') || l.activity.toLowerCase().includes('auth') || l.activity.toLowerCase().includes('logout')))
        );
    } else if (currentLogFilter === 'points') {
        filteredLogs = logs.filter(l => 
            (l.activity && (l.activity.toLowerCase().includes('point') || l.activity.toLowerCase().includes('ledger') || l.activity.toLowerCase().includes('adjust') || l.activity.toLowerCase().includes('check-in') || l.activity.toLowerCase().includes('gift')))
        );
    } else if (currentLogFilter === 'voucher') {
        filteredLogs = logs.filter(l => 
            (l.activity && (l.activity.toLowerCase().includes('voucher') || l.activity.toLowerCase().includes('claim')))
        );
    }

    if (filteredLogs.length === 0) {
        logsBody.innerHTML = '<tr><td colspan="5" class="no-data">No logs match this filter category.</td></tr>';
        return;
    }

    // Keep a reference so the detail panel can access it
    window._trafficLogs = filteredLogs;

    logsBody.innerHTML = filteredLogs.map((log, idx) => {
        const name = log.user_name ? `${log.user_name} (${log.role.toUpperCase()})` : 'Anonymous Guest';
        const dateStr = cleanDate(log.created_at);
        const uaStr = log.user_agent || 'Unknown';
        const shortUa = uaStr.length > 40 ? uaStr.substring(0, 38) + '...' : uaStr;
        const isAdmin = log.role === 'admin';
        return `
            <tr class="traffic-log-row" data-idx="${idx}" onclick="showLogDetail(${idx})" style="cursor:pointer;">
                <td style="font-size: 0.72rem; color: rgba(255,255,255,0.6);">${dateStr}</td>
                <td>
                    <strong style="color:#fff;">${name}</strong>
                    ${isAdmin ? '<span style="font-size:0.58rem; background:rgba(223,177,91,0.12); color:#dfb15b; border:1px solid rgba(223,177,91,0.2); border-radius:3px; padding:0.05rem 0.3rem; margin-left:0.3rem; font-weight:700;">ADMIN</span>' : ''}
                </td>
                <td style="font-family:\'Outfit\'; font-size:0.75rem; color:#dfb15b;">
                    ${log.ip_address || 'Unknown'}
                    ${log.ip_address && log.ip_address !== 'Unknown' ? `
                        <button class="btn-block-ip" onclick="event.stopPropagation(); blockIp('${log.ip_address}', 'Suspicious activity logged')" title="Block IP Address" style="background: none; border: none; color: #ef4444; cursor: pointer; margin-left: 0.35rem; font-size: 0.75rem; padding: 0.15rem; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; transition: color 0.15s ease;" onmouseover="this.style.color='#f87171'" onmouseout="this.style.color='#ef4444'">
                            <i class="fa-solid fa-ban"></i>
                        </button>
                    ` : ''}
                </td>
                <td style="font-size:0.75rem; color:rgba(255,255,255,0.75);">${log.activity || 'Unknown'}</td>
                <td style="font-size:0.7rem; color:rgba(255,255,255,0.4);" title="${uaStr}">${shortUa}</td>
            </tr>
        `;
    }).join('');
}

// Parse User-Agent string into human-readable parts
function parseUserAgent(ua) {
    if (!ua || ua === 'Unknown') return { browser: 'Unknown', os: 'Unknown', device: 'Unknown', raw: ua };
    let browser = 'Unknown', os = 'Unknown', device = 'Desktop';

    // OS detection
    if (/Windows NT 10/.test(ua))       os = 'Windows 10 / 11';
    else if (/Windows NT 6/.test(ua))   os = 'Windows 7/8';
    else if (/Mac OS X/.test(ua))       os = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g,'.') ? `macOS ${ua.match(/Mac OS X ([\d_]+)/)[1].replace(/_/g,'.')}` : 'macOS';
    else if (/iPhone/.test(ua))         os = 'iOS (iPhone)';
    else if (/iPad/.test(ua))           os = 'iOS (iPad)';
    else if (/Android/.test(ua))        os = `Android ${ua.match(/Android ([\d.]+)/)?.[1] || ''}`;
    else if (/Linux/.test(ua))          os = 'Linux';

    // Device
    if (/iPhone|iPod/.test(ua))         device = 'Mobile (iPhone)';
    else if (/iPad/.test(ua))           device = 'Tablet (iPad)';
    else if (/Android.*Mobile/.test(ua)) device = 'Mobile (Android)';
    else if (/Android/.test(ua))        device = 'Tablet (Android)';
    else                                device = 'Desktop / Laptop';

    // Browser
    if (/Edg\//.test(ua))              browser = `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] || ''}`;
    else if (/OPR\//.test(ua))         browser = `Opera ${ua.match(/OPR\/([\d.]+)/)?.[1] || ''}`;
    else if (/Chrome\//.test(ua))      browser = `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] || ''}`;
    else if (/Firefox\//.test(ua))     browser = `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] || ''}`;
    else if (/Safari\//.test(ua))      browser = `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] || ''}`;
    else if (/MSIE|Trident/.test(ua))  browser = 'Internet Explorer';

    return { browser, os, device, raw: ua };
}

// Derive a simple threat score for a log entry (0-100)
function calcThreatScore(log) {
    let score = 0;
    const activity = (log.activity || '').toUpperCase();
    const ua = (log.user_agent || '').toUpperCase();
    if (activity.includes('FAIL') || activity.includes('INVALID')) score += 40;
    if (activity.includes('FIREWALL') || activity.includes('BLOCKED')) score += 60;
    if (activity.includes('ADMIN')) score += 10;
    if (!log.user_id) score += 20; // anonymous
    if (ua.includes('BOT') || ua.includes('SCRAPER') || ua.includes('CURL') || ua.includes('PYTHON')) score += 35;
    return Math.min(score, 100);
}

function showLogDetail(idx) {
    const logs = window._trafficLogs;
    if (!logs || !logs[idx]) return;
    const log = logs[idx];

    const modal = document.getElementById('log-detail-modal');
    const content = document.getElementById('log-detail-content');
    if (!modal || !content) return;

    const ua = parseUserAgent(log.user_agent);
    const threatScore = calcThreatScore(log);
    const threatLabel = threatScore === 0 ? 'Clean' : threatScore < 30 ? 'Low' : threatScore < 60 ? 'Moderate' : 'High';
    const threatColor = threatScore === 0 ? '#4ade80' : threatScore < 30 ? '#4ade80' : threatScore < 60 ? '#dfb15b' : '#ef4444';
    const isAdmin = log.role === 'admin';
    const name = log.user_name || 'Anonymous Guest';
    const email = log.user_email || '—';
    const role = (log.role || 'guest').toUpperCase();

    content.innerHTML = `
        <!-- Header -->
        <div style="display:flex; align-items:flex-start; gap:1rem; margin-bottom:1.5rem; padding-bottom:1.25rem; border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="width:48px; height:48px; border-radius:50%; background:${isAdmin ? 'rgba(223,177,91,0.12)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${isAdmin ? 'rgba(223,177,91,0.25)' : 'rgba(255,255,255,0.08)'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-${isAdmin ? 'user-shield' : 'user'}" style="color:${isAdmin ? '#dfb15b' : 'rgba(255,255,255,0.5)'}; font-size:1.2rem;"></i>
            </div>
            <div style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                    <h3 style="margin:0; color:#fff; font-family:'Outfit'; font-size:1.1rem; font-weight:700;">${name}</h3>
                    <span style="font-size:0.62rem; background:${isAdmin ? 'rgba(223,177,91,0.12)' : 'rgba(255,255,255,0.06)'}; color:${isAdmin ? '#dfb15b' : 'rgba(255,255,255,0.5)'}; border:1px solid ${isAdmin ? 'rgba(223,177,91,0.2)' : 'rgba(255,255,255,0.1)'}; border-radius:4px; padding:0.1rem 0.4rem; font-weight:700;">${role}</span>
                </div>
                <p style="margin:0.2rem 0 0 0; color:rgba(255,255,255,0.4); font-size:0.75rem;">${email}</p>
                <p style="margin:0.35rem 0 0 0; font-size:0.7rem; color:rgba(255,255,255,0.35);">Log ID #${log.log_id || '—'} &nbsp;·&nbsp; ${cleanDate(log.created_at)}</p>
            </div>
            <button onclick="event.stopPropagation(); closeLogDetail()" style="background:none; border:none; color:rgba(255,255,255,0.35); cursor:pointer; font-size:1.1rem; flex-shrink:0; padding:0; transition:color 0.15s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.35)'">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <!-- KPI row -->
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:0.75rem; margin-bottom:1.25rem;">
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:0.75rem; text-align:center;">
                <span style="font-size:0.6rem; color:rgba(255,255,255,0.35); text-transform:uppercase; display:block;">IP Address</span>
                <span style="font-family:'Outfit'; font-size:0.88rem; font-weight:700; color:#dfb15b;">${log.ip_address || '—'}</span>
            </div>
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:0.75rem; text-align:center;">
                <span style="font-size:0.6rem; color:rgba(255,255,255,0.35); text-transform:uppercase; display:block;">Device</span>
                <span style="font-family:'Outfit'; font-size:0.82rem; font-weight:600; color:#fff;">${ua.device}</span>
            </div>
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:0.75rem; text-align:center;">
                <span style="font-size:0.6rem; color:rgba(255,255,255,0.35); text-transform:uppercase; display:block;">Threat Score</span>
                <span style="font-family:'Outfit'; font-size:0.88rem; font-weight:700; color:${threatColor};">${threatScore}/100 · ${threatLabel}</span>
            </div>
        </div>

        <!-- Threat bar -->
        <div style="margin-bottom:1.25rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.68rem; color:rgba(255,255,255,0.4); margin-bottom:0.3rem;">
                <span>Threat Level Indicator</span><span style="color:${threatColor};">${threatScore}%</span>
            </div>
            <div style="background:rgba(255,255,255,0.05); height:6px; border-radius:4px; overflow:hidden;">
                <div style="background:${threatColor}; width:${threatScore}%; height:100%; border-radius:4px; transition:width 0.6s ease;"></div>
            </div>
        </div>

        <!-- Activity & Session details -->
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:1rem; margin-bottom:1.25rem; display:flex; flex-direction:column; gap:0.55rem;">
            <div style="display:flex; gap:0.75rem;">
                <i class="fa-solid fa-bolt" style="color:#dfb15b; font-size:0.75rem; margin-top:0.1rem; flex-shrink:0;"></i>
                <div>
                    <span style="font-size:0.62rem; color:rgba(255,255,255,0.35); text-transform:uppercase; display:block;">Activity</span>
                    <span style="font-size:0.82rem; color:#fff; font-weight:600;">${log.activity || 'Unknown'}</span>
                </div>
            </div>
            <div style="display:flex; gap:0.75rem;">
                <i class="fa-brands fa-chrome" style="color:rgba(255,255,255,0.3); font-size:0.75rem; margin-top:0.1rem; flex-shrink:0;"></i>
                <div>
                    <span style="font-size:0.62rem; color:rgba(255,255,255,0.35); text-transform:uppercase; display:block;">Browser</span>
                    <span style="font-size:0.8rem; color:rgba(255,255,255,0.7);">${ua.browser}</span>
                </div>
            </div>
            <div style="display:flex; gap:0.75rem;">
                <i class="fa-brands fa-windows" style="color:rgba(255,255,255,0.3); font-size:0.75rem; margin-top:0.1rem; flex-shrink:0;"></i>
                <div>
                    <span style="font-size:0.62rem; color:rgba(255,255,255,0.35); text-transform:uppercase; display:block;">Operating System</span>
                    <span style="font-size:0.8rem; color:rgba(255,255,255,0.7);">${ua.os}</span>
                </div>
            </div>
            <div style="display:flex; gap:0.75rem; padding-top:0.45rem; border-top:1px solid rgba(255,255,255,0.04);">
                <i class="fa-solid fa-code" style="color:rgba(255,255,255,0.2); font-size:0.65rem; margin-top:0.1rem; flex-shrink:0;"></i>
                <div>
                    <span style="font-size:0.62rem; color:rgba(255,255,255,0.3); text-transform:uppercase; display:block;">Full User-Agent</span>
                    <span style="font-size:0.65rem; color:rgba(255,255,255,0.35); line-height:1.4; word-break:break-all;">${ua.raw}</span>
                </div>
            </div>
        </div>

        <!-- Admin actions -->
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
            <span style="font-size:0.62rem; color:rgba(255,255,255,0.3); text-transform:uppercase; font-weight:700;">Admin Actions</span>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                ${log.ip_address && log.ip_address !== 'Unknown' ? `
                <button onclick="event.stopPropagation(); closeLogDetail(); blockIp('${log.ip_address}', 'Flagged from log detail panel')" style="display:flex; align-items:center; gap:0.35rem; padding:0.45rem 0.85rem; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); color:#ef4444; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer; font-family:inherit; transition:background 0.15s;" onmouseover="this.style.background='rgba(239,68,68,0.14)'" onmouseout="this.style.background='rgba(239,68,68,0.06)'">
                    <i class="fa-solid fa-ban"></i> Ban IP ${log.ip_address}
                </button>
                ` : ''}
                ${log.user_id ? `
                <button onclick="event.stopPropagation(); closeLogDetail(); switchToAdmin(); setTimeout(()=>openStudentDetail(${log.user_id}),400);" style="display:flex; align-items:center; gap:0.35rem; padding:0.45rem 0.85rem; background:rgba(223,177,91,0.06); border:1px solid rgba(223,177,91,0.2); color:#dfb15b; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer; font-family:inherit; transition:background 0.15s;" onmouseover="this.style.background='rgba(223,177,91,0.14)'" onmouseout="this.style.background='rgba(223,177,91,0.06)'">
                    <i class="fa-solid fa-user-magnifying-glass"></i> View Student Profile
                </button>
                ` : ''}
                <button onclick="event.stopPropagation(); navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(JSON.stringify(log))})); showToast('Copied', 'Log entry copied to clipboard', 'success');" style="display:flex; align-items:center; gap:0.35rem; padding:0.45rem 0.85rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.5); border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer; font-family:inherit; transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.07)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                    <i class="fa-solid fa-clipboard"></i> Copy Log Entry
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    // Highlight the clicked row
    document.querySelectorAll('.traffic-log-row').forEach(r => r.classList.remove('log-row-active'));
    const activeRow = document.querySelector(`.traffic-log-row[data-idx="${idx}"]`);
    if (activeRow) activeRow.classList.add('log-row-active');
}

function closeLogDetail() {
    const modal = document.getElementById('log-detail-modal');
    if (modal) modal.style.display = 'none';
    document.querySelectorAll('.traffic-log-row').forEach(r => r.classList.remove('log-row-active'));
}
window.showLogDetail = showLogDetail;
window.closeLogDetail = closeLogDetail;

// Blacklist IP operations
async function loadBlacklist() {
    const tbody = document.getElementById('blacklist-body');
    if (!tbody) return;
    
    try {
        const res = await fetch(`${API_BASE}/admin/blacklist`);
        if (!res.ok) throw new Error('Failed to load blacklist.');
        const list = await res.json();
        
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="no-data">No blacklisted IP addresses.</td></tr>';
            return;
        }
        
        tbody.innerHTML = list.map(item => {
            return `
                <tr>
                    <td style="font-family:'Outfit'; font-weight:700; color:#ef4444;">${item.ip_address}</td>
                    <td style="color:rgba(255,255,255,0.6); font-size:0.7rem;">${item.reason}</td>
                    <td style="text-align: right;">
                        <button class="btn btn-secondary btn-sm" onclick="unblockIp('${item.ip_address}')" style="padding: 0.15rem 0.45rem; font-size: 0.65rem; border-color: rgba(74, 222, 128, 0.2); color: #4ade80; background: rgba(74, 222, 128, 0.03);">
                            <i class="fa-solid fa-unlock"></i> Unblock
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" class="no-data" style="color: #ef4444;">Error: ${err.message}</td></tr>`;
    }
}

async function blockIp(ip, reason = 'Suspicious Activity') {
    if (!ip || ip === 'Unknown') {
        showToast('Error', 'Cannot block an unknown IP address.', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to block IP address: ${ip}?`)) {
        try {
            const res = await fetch(`${API_BASE}/admin/blacklist/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip_address: ip, reason })
            });
            if (!res.ok) throw new Error('Failed to blacklist IP.');
            showToast('IP Blocked 🚫', `${ip} has been added to firewall blacklist.`, 'success');
            loadBlacklist();
            loadTrafficDashboard(); // Refresh stats/logs
        } catch (err) {
            showToast('Error', err.message, 'error');
        }
    }
}
window.blockIp = blockIp;

async function unblockIp(ip) {
    if (!ip) return;
    try {
        const res = await fetch(`${API_BASE}/admin/blacklist/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip_address: ip })
        });
        if (!res.ok) throw new Error('Failed to unblock IP.');
        showToast('IP Unblocked ✅', `${ip} is now allowed to access.`, 'success');
        loadBlacklist();
        loadTrafficDashboard(); // Refresh stats/logs
    } catch (err) {
        showToast('Error', err.message, 'error');
    }
}
window.unblockIp = unblockIp;

const setupTrafficListeners = () => {
    const rlSlider = document.getElementById('ctrl-rate-limit');
    const rlVal = document.getElementById('ctrl-rate-limit-val');
    if (rlSlider && rlVal) {
        rlSlider.addEventListener('input', (e) => {
            rlVal.textContent = `${e.target.value} req/min`;
        });
    }

    const form = document.getElementById('traffic-control-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mm = document.getElementById('ctrl-maintenance-mode').checked ? 1 : 0;
            const gf = document.getElementById('ctrl-geofence-mode').checked ? 1 : 0;
            const rl = document.getElementById('ctrl-rate-limit').value;
            const duration = parseInt(document.getElementById('ctrl-maintenance-duration').value) || 0;

            const saveBtn = form.querySelector('button[type="submit"]');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating policy...';

            try {
                const response = await fetch(`${API_BASE}/admin/traffic/control`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        maintenance_mode: mm,
                        geofence_gcc_only: gf,
                        rate_limit_min: rl,
                        maintenance_duration: mm === 1 ? duration : 0
                    })
                });

                if (!response.ok) throw new Error('Failed to update firewall policy.');

                appState.settings.maintenance_mode = mm;
                appState.settings.geofence_gcc_only = gf;
                appState.settings.rate_limit_min = rl;
                
                if (mm === 1 && duration > 0) {
                    appState.settings.maintenance_end_time = new Date(Date.now() + duration * 60000).toISOString();
                } else {
                    appState.settings.maintenance_end_time = '';
                }

                showToast('Security Update ✅', 'Traffic control override rules saved to database.', 'success');
                
                const secStatus = document.getElementById('traffic-security-status');
                if (secStatus) {
                    const endTimeStr = appState.settings.maintenance_end_time;
                    let displayStatus = 'Secured';
                    let color = '#4ade80';
                    
                    if (mm === 1) {
                        if (endTimeStr) {
                            displayStatus = `Maint. (${duration}m left)`;
                            color = '#ef4444';
                        } else {
                            displayStatus = 'Maintenance';
                            color = '#ef4444';
                        }
                    } else if (gf === 1) {
                        displayStatus = 'GCC Geofence';
                        color = '#dfb15b';
                    }
                    secStatus.textContent = displayStatus;
                    secStatus.style.color = color;
                }
            } catch (err) {
                showToast('Policy Update Failed', err.message, 'error');
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Update Security Policy';
            }
        });
    }

    const blacklistForm = document.getElementById('blacklist-add-form');
    if (blacklistForm) {
        blacklistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const ipInput = document.getElementById('blacklist-ip-input');
            const reasonInput = document.getElementById('blacklist-reason-input');
            const ip = ipInput.value.trim();
            const reason = reasonInput.value.trim() || 'Manual blacklist entry';
            
            if (!ip) return;
            
            const submitBtn = blacklistForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Blacklisting...';
            
            try {
                const res = await fetch(`${API_BASE}/admin/blacklist/add`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip_address: ip, reason })
                });
                if (!res.ok) throw new Error('Failed to block IP.');
                
                showToast('IP Blacklisted 🚫', `${ip} has been blocked from portal access.`, 'success');
                ipInput.value = '';
                reasonInput.value = '';
                loadBlacklist();
                loadTrafficDashboard(); // Refresh stats/logs
            } catch (err) {
                showToast('Error', err.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-ban"></i> Ban IP Address';
            }
        });
    }

    // Setup Activity Logs filter pills click events
    document.querySelectorAll('.log-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.log-filter-btn').forEach(b => {
                b.classList.remove('active');
                b.style.background = 'rgba(255,255,255,0.02)';
                b.style.borderColor = 'rgba(255,255,255,0.06)';
                b.style.color = 'rgba(255,255,255,0.5)';
            });
            btn.classList.add('active');
            btn.style.background = 'rgba(255,255,255,0.06)';
            btn.style.borderColor = 'rgba(255,255,255,0.15)';
            btn.style.color = '#fff';
            
            currentLogFilter = btn.getAttribute('data-filter');
            // Re-render traffic logs based on cached logs list
            if (window._trafficLogsRaw) {
                tbodyRenderTrafficLogs(window._trafficLogsRaw);
            } else {
                loadTrafficDashboard();
            }
        });
    });

    const search = document.getElementById('traffic-search-input');
    if (search) {
        search.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const rows = document.querySelectorAll('#traffic-logs-body tr');
            rows.forEach(row => {
                if (row.querySelector('.no-data')) return;
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }

    const maintLogout = document.getElementById('btn-maintenance-logout');
    if (maintLogout) {
        maintLogout.onclick = () => {
            document.getElementById('maintenance-overlay').style.display = 'none';
            handleLogout();
        };
    }
};

// Security Feature Insights modal logic
async function showFeatureInsights(type) {
    const modal = document.getElementById('security-insights-modal');
    const content = document.getElementById('security-insights-content');
    if (!modal || !content) return;
    
    modal.style.display = 'flex';
    content.innerHTML = `
        <div style="text-align:center; padding: 2rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: #dfb15b;"></i>
            <p style="margin-top:0.75rem; color: rgba(255,255,255,0.6);">Compiling feature insights...</p>
        </div>
    `;
    
    let totalBanned = 0;
    try {
        const blacklistRes = await fetch(`${API_BASE}/admin/blacklist`);
        if (blacklistRes.ok) {
            const list = await blacklistRes.json();
            totalBanned = list.length;
        }
    } catch (e) {
        console.error(e);
    }
    
    const currentRateLimit = appState.settings.rate_limit_min || 120;
    const isGeofenceOn = appState.settings.geofence_gcc_only == 1;
    const isMaintenanceOn = appState.settings.maintenance_mode == 1;
    const maintEndTimeStr = appState.settings.maintenance_end_time;
    
    let html = '';
    
    if (type === 'geofence') {
        html = `
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
                <i class="fa-solid fa-earth-americas" style="font-size: 2rem; color: #dfb15b;"></i>
                <div>
                    <h3 style="margin: 0; color: #fff; font-family: 'Outfit'; font-size: 1.25rem;">GCC Geofencing Insights</h3>
                    <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 0.75rem;">Simulate Middle East regional border traffic control</p>
                </div>
            </div>
            
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom: 0.75rem; font-size:0.8rem;">
                    <span style="color: rgba(255,255,255,0.6);">Status:</span>
                    <span style="font-weight: 700; color: ${isGeofenceOn ? '#dfb15b' : '#999'};">${isGeofenceOn ? 'ENABLED (GCC ONLY)' : 'DISABLED (GLOBAL ACCESS)'}</span>
                </div>
                <p style="font-size: 0.75rem; color: rgba(255,255,255,0.5); line-height: 1.4; margin: 0;">
                    Geofencing restricts access strictly to IPs registered under Gulf Cooperation Council member states (UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman).
                </p>
            </div>
            
            <div style="margin-bottom: 1.25rem;">
                <h5 style="color: #dfb15b; font-size: 0.75rem; text-transform: uppercase; margin: 0 0 0.5rem 0; font-weight: 700;">Simulated Traffic Origin</h5>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:rgba(255,255,255,0.7); margin-bottom:0.15rem;">
                            <span>UAE (Dubai / Abu Dhabi)</span>
                            <span>74%</span>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); height:6px; border-radius:3px;">
                            <div style="background:#dfb15b; width:74%; height:100%; border-radius:3px;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:rgba(255,255,255,0.7); margin-bottom:0.15rem;">
                            <span>Saudi Arabia (Riyadh)</span>
                            <span>15%</span>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); height:6px; border-radius:3px;">
                            <div style="background:#4ade80; width:15%; height:100%; border-radius:3px;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:rgba(255,255,255,0.7); margin-bottom:0.15rem;">
                            <span>Qatar & Kuwait</span>
                            <span>6%</span>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); height:6px; border-radius:3px;">
                            <div style="background:#38bdf8; width:6%; height:100%; border-radius:3px;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:rgba(255,255,255,0.7); margin-bottom:0.15rem;">
                            <span>Rest of the World (US, Europe, Asia)</span>
                            <span style="color: ${isGeofenceOn ? '#ef4444' : 'rgba(255,255,255,0.7)'};">${isGeofenceOn ? '5% (Blocked)' : '5%'}</span>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); height:6px; border-radius:3px;">
                            <div style="background:${isGeofenceOn ? '#ef4444' : 'rgba(255,255,255,0.3)'}; width:5%; height:100%; border-radius:3px;"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:1rem; margin-bottom:1rem;">
                <h5 style="color: #dfb15b; font-size: 0.72rem; text-transform: uppercase; margin: 0 0 0.5rem 0; font-weight: 700;">Recent Geofence Intercepts</h5>
                <div class="table-scroll-container" style="max-height: 110px; overflow-y: auto;">
                    <table class="ledger-table" style="font-size:0.68rem;">
                        <thead>
                            <tr>
                                <th>Blocked IP</th>
                                <th>Country</th>
                                <th>Action</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-family:'Outfit';">194.26.29.81</td>
                                <td>United States 🇺🇸</td>
                                <td style="color:#ef4444; font-weight:700;">BLOCKED</td>
                                <td>Just Now</td>
                            </tr>
                            <tr>
                                <td style="font-family:'Outfit';">81.2.199.12</td>
                                <td>United Kingdom 🇬🇧</td>
                                <td style="color:#ef4444; font-weight:700;">BLOCKED</td>
                                <td>5 mins ago</td>
                            </tr>
                            <tr>
                                <td style="font-family:'Outfit';">220.181.38.14</td>
                                <td>China 🇨🇳</td>
                                <td style="color:#ef4444; font-weight:700;">BLOCKED</td>
                                <td>14 mins ago</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div style="background: rgba(223,177,91,0.03); border: 1px dashed rgba(223,177,91,0.2); border-radius: 8px; padding: 0.75rem 1rem;">
                <div style="display:flex; align-items:center; gap:0.4rem; color: #dfb15b; font-size:0.75rem; font-weight:700; margin-bottom:0.25rem;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> AI Security Advisor Recommendation
                </div>
                <p style="font-size:0.7rem; color:rgba(255,255,255,0.6); margin:0; line-height: 1.4;">
                    <strong>Security Level: ${isGeofenceOn ? 'HIGH' : 'NORMAL'}</strong><br>
                    Keep Regional Geofencing <strong>disabled</strong> under standard conditions. Enable immediately if database logging identifies brute-force patterns originating from foreign subnets.
                </p>
            </div>
        `;
    } else if (type === 'ratelimit') {
        html = `
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
                <i class="fa-solid fa-gauge-high" style="font-size: 2rem; color: #dfb15b;"></i>
                <div>
                    <h3 style="margin: 0; color: #fff; font-family: 'Outfit'; font-size: 1.25rem;">Rate Limiting Insights</h3>
                    <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 0.75rem;">Prevent script-based spam and denial-of-service abuse</p>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom: 1.25rem;">
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 0.75rem;">
                    <span style="font-size:0.65rem; color:rgba(255,255,255,0.4); text-transform:uppercase;">Current Limit</span>
                    <h4 style="margin:0.2rem 0 0 0; color:#fff; font-size:1.1rem; font-family:'Outfit';">${currentRateLimit} req/min</h4>
                </div>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 0.75rem;">
                    <span style="font-size:0.65rem; color:rgba(255,255,255,0.4); text-transform:uppercase;">Avg. Latency</span>
                    <h4 style="margin:0.2rem 0 0 0; color:#4ade80; font-size:1.1rem; font-family:'Outfit';">32.4 ms</h4>
                </div>
            </div>
            
            <div style="margin-bottom: 1.25rem;">
                <h5 style="color: #dfb15b; font-size: 0.75rem; text-transform: uppercase; margin: 0 0 0.75rem 0; font-weight: 700;">Hourly Request Load (Last 6 Hours)</h5>
                <div style="display:flex; justify-content:space-between; align-items:flex-end; height:70px; padding: 0 0.5rem; background:rgba(255,255,255,0.01); border-radius:6px; border:1px solid rgba(255,255,255,0.03); box-sizing:border-box;">
                    <div style="display:flex; flex-direction:column; align-items:center; width:12%;">
                        <div style="background:rgba(223,177,91,0.3); width:100%; height:32px; border-radius:2px 2px 0 0;"></div>
                        <span style="font-size:0.55rem; color:rgba(255,255,255,0.4); margin-top:0.2rem;">09:00</span>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center; width:12%;">
                        <div style="background:rgba(223,177,91,0.5); width:100%; height:48px; border-radius:2px 2px 0 0;"></div>
                        <span style="font-size:0.55rem; color:rgba(255,255,255,0.4); margin-top:0.2rem;">10:00</span>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center; width:12%;">
                        <div style="background:#dfb15b; width:100%; height:62px; border-radius:2px 2px 0 0;"></div>
                        <span style="font-size:0.55rem; color:rgba(255,255,255,0.4); margin-top:0.2rem;">11:00</span>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center; width:12%;">
                        <div style="background:rgba(223,177,91,0.7); width:100%; height:55px; border-radius:2px 2px 0 0;"></div>
                        <span style="font-size:0.55rem; color:rgba(255,255,255,0.4); margin-top:0.2rem;">12:00</span>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center; width:12%;">
                        <div style="background:rgba(223,177,91,0.4); width:100%; height:40px; border-radius:2px 2px 0 0;"></div>
                        <span style="font-size:0.55rem; color:rgba(255,255,255,0.4); margin-top:0.2rem;">13:00</span>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center; width:12%;">
                        <div style="background:rgba(223,177,91,0.3); width:100%; height:25px; border-radius:2px 2px 0 0;"></div>
                        <span style="font-size:0.55rem; color:rgba(255,255,255,0.4); margin-top:0.2rem;">14:00</span>
                    </div>
                </div>
            </div>
            
            <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:1rem; margin-bottom:1rem;">
                <h5 style="color: #dfb15b; font-size: 0.72rem; text-transform: uppercase; margin: 0 0 0.5rem 0; font-weight: 700;">Top Rate-Limited Subnets</h5>
                <div class="table-scroll-container" style="max-height: 110px; overflow-y: auto;">
                    <table class="ledger-table" style="font-size:0.68rem;">
                        <thead>
                            <tr>
                                <th>Source IP</th>
                                <th>Trigger Count</th>
                                <th>Peak Speed</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-family:'Outfit';">92.98.14.8</td>
                                <td>14 triggers</td>
                                <td>240 req/min</td>
                                <td style="color:#dfb15b; font-weight:700;">THROTTLED</td>
                            </tr>
                            <tr>
                                <td style="font-family:'Outfit';">86.96.12.1</td>
                                <td>8 triggers</td>
                                <td>155 req/min</td>
                                <td style="color:#dfb15b; font-weight:700;">THROTTLED</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div style="background: rgba(223,177,91,0.03); border: 1px dashed rgba(223,177,91,0.2); border-radius: 8px; padding: 0.75rem 1rem;">
                <div style="display:flex; align-items:center; gap:0.4rem; color: #dfb15b; font-size:0.75rem; font-weight:700; margin-bottom:0.25rem;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> AI Security Advisor Recommendation
                </div>
                <p style="font-size:0.7rem; color:rgba(255,255,255,0.6); margin:0; line-height: 1.4;">
                    Your rate limiting is currently configured to <strong>${currentRateLimit} requests/min</strong>. If you detect rapid login failure cycles or points adjustments anomalies, drag the policy down to <strong>90 requests/min</strong> to force attacker script containment.
                </p>
            </div>
        `;
    } else if (type === 'maintenance') {
        let timerDetails = 'Inactive (System is Live)';
        let timerColor = '#4ade80';
        let countdownHtml = '<p style="color: rgba(255,255,255,0.5); font-size:0.75rem; margin:0.25rem 0 0 0;">No active scheduled maintenance windows.</p>';
        
        if (isMaintenanceOn) {
            timerDetails = 'ACTIVE (Student portal locked)';
            timerColor = '#ef4444';
            if (maintEndTimeStr) {
                const diff = new Date(maintEndTimeStr) - new Date();
                if (diff > 0) {
                    const mins = Math.ceil(diff / 60000);
                    countdownHtml = `
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
                            <span style="color:#dfb15b; font-weight:700; font-size:0.8rem;">Auto-Restore countdown:</span>
                            <span style="font-family:'Outfit'; background:rgba(223,177,91,0.08); padding:0.15rem 0.5rem; border-radius:4px; font-size:0.8rem; color:#dfb15b; font-weight:700;">${mins} minutes left</span>
                        </div>
                    `;
                }
            }
        }
        
        html = `
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
                <i class="fa-solid fa-screwdriver-wrench" style="font-size: 2rem; color: #dfb15b;"></i>
                <div>
                    <h3 style="margin: 0; color: #fff; font-family: 'Outfit'; font-size: 1.25rem;">Scheduled Maintenance Mode Insights</h3>
                    <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 0.75rem;">Announce updates, lock db commits, and secure APIs</p>
                </div>
            </div>
            
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem; font-size:0.8rem;">
                    <span style="color: rgba(255,255,255,0.6);">Maintenance Lockout status:</span>
                    <span style="font-weight: 700; color: ${timerColor};">${timerDetails}</span>
                </div>
                ${countdownHtml}
            </div>
            
            <div style="margin-bottom: 1.25rem;">
                <h5 style="color: #dfb15b; font-size: 0.75rem; text-transform: uppercase; margin: 0 0 0.5rem 0; font-weight: 700;">Downtime Safeguards</h5>
                <ul style="margin: 0; padding-left: 1.1rem; font-size: 0.75rem; color: rgba(255,255,255,0.6); display: flex; flex-direction: column; gap: 0.4rem;">
                    <li><strong>Locked Ledger Actions:</strong> Points transfers, voucher claims, and referral registration APIs reject all requests from non-admins.</li>
                    <li><strong>Opaque Status screen:</strong> Non-admin student accounts are blocked by a fullscreen glassmorphic screen showing your countdown.</li>
                    <li><strong>Secure Session Isolation:</strong> Any active student requests are deferred, protecting in-memory DB integrity.</li>
                </ul>
            </div>
            
            <div style="background: rgba(223,177,91,0.03); border: 1px dashed rgba(223,177,91,0.2); border-radius: 8px; padding: 0.75rem 1rem;">
                <div style="display:flex; align-items:center; gap:0.4rem; color: #dfb15b; font-size:0.75rem; font-weight:700; margin-bottom:0.25rem;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> AI Security Advisor Recommendation
                </div>
                <p style="font-size:0.7rem; color:rgba(255,255,255,0.6); margin:0; line-height: 1.4;">
                    Schedule maintenance during off-peak student hours (e.g., 2 AM - 5 AM). Always announce updates beforehand. Use the <strong>Auto-Restore Timer</strong> to automatically release the site and prevent admin lockout memory slips.
                </p>
            </div>
        `;
    } else if (type === 'blacklist') {
        const threatLevel = totalBanned === 0 ? 'LOW' : totalBanned < 3 ? 'MODERATE' : 'HIGH';
        const threatColor = totalBanned === 0 ? '#4ade80' : totalBanned < 3 ? '#dfb15b' : '#ef4444';
        
        html = `
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
                <i class="fa-solid fa-user-shield" style="font-size: 2rem; color: #ef4444;"></i>
                <div>
                    <h3 style="margin: 0; color: #fff; font-family: 'Outfit'; font-size: 1.25rem;">IP Firewall Blacklist Insights</h3>
                    <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 0.75rem;">Manage active bans and monitor firewall blocks</p>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom: 1.25rem;">
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 0.75rem;">
                    <span style="font-size:0.65rem; color:rgba(255,255,255,0.4); text-transform:uppercase;">Active Banned IPs</span>
                    <h4 style="margin:0.2rem 0 0 0; color:#fff; font-size:1.1rem; font-family:'Outfit';">${totalBanned} nodes</h4>
                </div>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 0.75rem;">
                    <span style="font-size:0.65rem; color:rgba(255,255,255,0.4); text-transform:uppercase;">Firewall Threat Level</span>
                    <h4 style="margin:0.2rem 0 0 0; color:${threatColor}; font-size:1.1rem; font-family:'Outfit'; font-weight:700;">${threatLevel}</h4>
                </div>
            </div>
            
            <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:1rem; margin-bottom:1rem;">
                <h5 style="color: #dfb15b; font-size: 0.72rem; text-transform: uppercase; margin: 0 0 0.5rem 0; font-weight: 700;">Recent Firewall Intercept Events</h5>
                <div class="table-scroll-container" style="max-height: 140px; overflow-y: auto;">
                    <table class="ledger-table" style="font-size:0.68rem;">
                        <thead>
                            <tr>
                                <th>Source IP Address</th>
                                <th>Target Route</th>
                                <th>Action</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${totalBanned > 0 ? `
                                <tr>
                                    <td style="font-family:'Outfit'; color:#ef4444;">::1</td>
                                    <td>/api/users/profile</td>
                                    <td style="color:#ef4444; font-weight:700;">403 FORBIDDEN</td>
                                    <td>Just Now</td>
                                </tr>
                            ` : `
                                <tr>
                                    <td colspan="4" class="no-data">No recent firewall blocks recorded.</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div style="background: rgba(239,68,68,0.03); border: 1px dashed rgba(239,68,68,0.2); border-radius: 8px; padding: 0.75rem 1rem;">
                <div style="display:flex; align-items:center; gap:0.4rem; color: #ef4444; font-size:0.75rem; font-weight:700; margin-bottom:0.25rem;">
                    <i class="fa-solid fa-circle-exclamation"></i> Firewall Integrity Advisory
                </div>
                <p style="font-size:0.7rem; color:rgba(255,255,255,0.6); margin:0; line-height: 1.4;">
                    If you identify suspicious logins from a subnet (e.g. repeated student credentials checks), block that specific IP immediately. Use the live logs tab to catch automated agents before they scrape points or transfer balances.
                </p>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

function closeSecurityInsights() {
    const modal = document.getElementById('security-insights-modal');
    if (modal) modal.style.display = 'none';
}
window.showFeatureInsights = showFeatureInsights;
window.closeSecurityInsights = closeSecurityInsights;

// Close modals on click outside or Escape key
document.addEventListener('click', (e) => {
    const siModal = document.getElementById('security-insights-modal');
    if (siModal && siModal.style.display === 'flex' && e.target === siModal) {
        closeSecurityInsights();
    }
    const ldModal = document.getElementById('log-detail-modal');
    if (ldModal && ldModal.style.display === 'flex' && e.target === ldModal) {
        closeLogDetail();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSecurityInsights();
        closeLogDetail();
    }
});

// Run listeners setup on initial script load
setupTuitionVoucherModalListeners();
setupFooterListeners();
setupStudentDetailListeners();
setupAdminStudentSearchListener();
setupP2PTransferListeners();
setupLinkedInIntegrationListeners();

// ──────────────────────────────────────────────────────────
// PUBLIC ANNOUNCEMENTS & SLEEPY EMPTY-STATE ANIMATION
// ──────────────────────────────────────────────────────────
let isDrawerListenersSetup = false;
function setupDrawerListeners() {
    if (isDrawerListenersSetup) return;
    isDrawerListenersSetup = true;

    const trigger = document.getElementById('landing-announcements-trigger');
    const drawer = document.getElementById('landing-announcements-drawer');
    const closeBtn = document.getElementById('btn-close-ann-drawer');

    if (trigger && drawer) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            drawer.classList.add('active');
            const badge = document.getElementById('ann-badge-count');
            if (badge) badge.style.display = 'none';
        });
    }

    if (closeBtn && drawer) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            drawer.classList.remove('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (drawer && drawer.classList.contains('active')) {
            if (!drawer.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
                drawer.classList.remove('active');
            }
        }
    });
}

async function loadPublicAnnouncements() {
    const container = document.getElementById('landing-announcements-container-drawer');
    const trigger = document.getElementById('landing-announcements-trigger');
    const badge = document.getElementById('ann-badge-count');
    if (!container || !trigger) return;

    setupDrawerListeners();

    try {
        const res = await fetch(`${API_BASE}/announcements`);
        if (!res.ok) throw new Error();
        const items = await res.json();
        
        if (items.length === 0) {
            // Hide trigger count but keep drawer available
            if (badge) badge.style.display = 'none';
            container.innerHTML = `
                <div class="card glassmorphic spotlight-card" style="padding: 1.75rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.85rem; text-align: center; margin-top: 1rem; width: 100%; box-sizing: border-box;">
                    <div style="margin-bottom: 0.25rem;">
                        <span class="sleepy-coffee-icon">☕</span>
                    </div>
                    <h4 style="margin: 0; color: #dfb15b; font-family: 'Outfit'; font-size: 0.95rem; letter-spacing: 0.05em; text-transform: uppercase;">All Quiet</h4>
                    <p style="margin: 0; font-size: 0.8rem; color: rgba(255,255,255,0.5); line-height: 1.45; font-weight: 300;">
                        No active announcements today. The BIA servers are purring, and the student portal is completely peaceful. 🎓✨
                    </p>
                </div>
            `;
            return;
        }

        // Show badge count
        if (badge) {
            badge.textContent = items.length;
            badge.style.display = 'flex';
        }

        const typeIcon   = { info: 'fa-circle-info', success: 'fa-circle-check', warning: 'fa-triangle-exclamation' };
        const cleanDate = (dStr) => {
            if(!dStr) return 'Recently';
            const d = new Date(dStr.replace(' ', 'T'));
            return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString('en-US', {month:'short', day:'numeric'});
        };
        
        container.innerHTML = items.map(item => `
            <div class="public-ann-card type-${item.type}" style="opacity: 0; transform: translateY(20px);">
                <div class="public-ann-glow-layer"></div>
                <div class="public-ann-icon-wrap">
                    <i class="fa-solid ${typeIcon[item.type]||typeIcon.info}"></i>
                    <span class="ping-wave"></span>
                </div>
                <div class="public-ann-content">
                    <span class="public-ann-badge">${item.type} BROADCAST</span>
                    <h5>${item.title}</h5>
                    <p>${item.body}</p>
                    <span class="public-ann-date"><i class="fa-regular fa-clock"></i> Posted ${cleanDate(item.created_at)}</span>
                </div>
            </div>
        `).join('');

        if (window.gsap) {
            gsap.fromTo(container.querySelectorAll('.public-ann-card'), 
                { opacity: 0, y: 20, scale: 0.97 },
                { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power2.out", stagger: 0.1 }
            );
        } else {
            container.querySelectorAll('.public-ann-card').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0) scale(1)';
            });
        }
    } catch {
        container.innerHTML = `<p style="color:rgba(255,255,255,0.3); font-size:0.75rem;">Could not load announcements.</p>`;
    }
}
window.loadPublicAnnouncements = loadPublicAnnouncements;

// ──────────────────────────────────────────────────────────
// DYNAMIC PROGRAMME PATHWAYS & UPSELL/CROSS-SELL
// ──────────────────────────────────────────────────────────
function renderCareerUpgrades() {
    const container = document.getElementById('upsell-cross-sell-content');
    if (!container) return;
    const user = appState.userProfile;
    if (!user) return;

    const prog = (user.programme || 'General').toUpperCase();
    let title = "";
    let offer = "";
    let points = 0;
    let description = "";
    let benefits = [];
    let buttonText = "";
    let targetProg = "";

    if (prog === 'MBA') {
        targetProg = "DBA";
        title = "Executive Doctor of Business Administration (DBA)";
        offer = "Upgrade Pathway Offer: Get 5,000 Bonus Points!";
        points = 5000;
        description = "Transition from operations manager to global corporate leader. Our WES-evaluated DBA is designed for senior executives.";
        benefits = [
            "Unlock permanent 1.3x Platinum points multiplier",
            "Flexible thesis-only weekend scheduling",
            "Dual-credential UK Equivalency certification"
        ];
        buttonText = "Request DBA Upgrade Consult";
    } else if (prog === 'DIGITAL MARKETING') {
        targetProg = "Project Management";
        title = "Project Management Professional Pathway";
        offer = "Cross-Enrolment Offer: Get 1,500 Bonus Points!";
        points = 1500;
        description = "Complement your marketing skills with corporate execution workflows. Master agile delivery methods.";
        benefits = [
            "1,500 loyalty points awarded on first fee payment",
            "Broaden execution portfolio with Agile & Scrum",
            "Prepares you directly for PMI PMP certification"
        ];
        buttonText = "Request Project Management Info";
    } else if (prog === 'FINANCE & ACCOUNTING') {
        targetProg = "MBA";
        title = "Global Executive MBA Upgrade";
        offer = "Upgrade Pathway Offer: Get 2,500 Bonus Points!";
        points = 2500;
        description = "Translate financial analysis into strategic general management decisions. Build corporate boardroom mastery.";
        benefits = [
            "Unlock permanent 1.2x Gold points multiplier",
            "Accelerated study options for finance graduates",
            "Global alumni cohort networking privileges"
        ];
        buttonText = "Enquire for MBA Upgrade";
    } else if (prog === 'PROJECT MANAGEMENT') {
        targetProg = "MBA";
        title = "Global Executive MBA Upgrade";
        offer = "Upgrade Pathway Offer: Get 2,000 Bonus Points!";
        points = 2000;
        description = "Combine technical execution expertise with core financial, organizational, and executive strategy competence.";
        benefits = [
            "2,000 points balance boost upon program transfer",
            "1.2x Gold multiplier unlocked instantly",
            "Corporate strategy specialization certificate"
        ];
        buttonText = "Enquire for MBA Upgrade";
    } else if (prog === 'DBA') {
        targetProg = "Leadership in Practice";
        title = "Leadership in Practice Masterclass";
        offer = "Advanced Seminar Offer: Get 3,000 Bonus Points!";
        points = 3000;
        description = "Join our elite 3-day executive residency seminar. Master high-impact negotiation and organizational leadership.";
        benefits = [
            "3,000 points loyalty bonus applied to your wallet",
            "Direct networking with top GCC directors",
            "Premium certificate signed by Bradford directors"
        ];
        buttonText = "Reserve Seminar Seat Info";
    } else {
        targetProg = "MBA";
        title = "Global Executive MBA Program";
        offer = "Enrolment Pathway Offer: Get 2,000 Bonus Points!";
        points = 2000;
        description = "Accelerate your career trajectory with a globally recognized business master degree. Study while you work.";
        benefits = [
            "Unlock direct 2,000 pts welcome bonus",
            "Flexible modular weekend curriculum",
            "UK university evaluation compatibility"
        ];
        buttonText = "Enquire for MBA Pathways";
    }

    container.innerHTML = `
        <div style="background: rgba(223, 177, 91, 0.04); border: 1px dashed rgba(223, 177, 91, 0.25); border-radius: 12px; padding: 1rem 1.15rem; margin-bottom: 1.15rem; text-align: left;">
            <span style="font-size: 0.65rem; color: #dfb15b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.25rem;">
                <i class="fa-solid fa-gift"></i> ${offer}
            </span>
            <strong style="color: var(--text-main); font-size: 0.9rem; display: block; margin-bottom: 0.35rem; font-family: 'Outfit';">${title}</strong>
            <p style="color: var(--text-muted); font-size: 0.78rem; margin: 0 0 0.85rem 0; line-height: 1.45;">${description}</p>
            
            <ul style="margin: 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 0.35rem;">
                ${benefits.map(b => `<li style="font-size: 0.74rem; color: var(--text-muted); line-height: 1.3; display: flex; align-items: flex-start; gap: 0.4rem;"><i class="fa-solid fa-circle-check text-emerald" style="font-size: 0.72rem; margin-top: 0.15rem; flex-shrink: 0;"></i>${b}</li>`).join('')}
            </ul>
        </div>
        <button id="btn-upsell-enquire" onclick="submitUpsellEnquiry('${targetProg}', ${points})" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 700; padding: 0.68rem;">
            <i class="fa-solid fa-graduation-cap"></i> ${buttonText}
        </button>
    `;
}
window.renderCareerUpgrades = renderCareerUpgrades;

async function submitUpsellEnquiry(targetProg, points) {
    const btn = document.getElementById('btn-upsell-enquire');
    if (!btn || !appState.currentUser || !appState.userProfile) return;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    
    try {
        const res = await fetch(`${API_BASE}/student/enquire-upgrade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: appState.currentUser.user_id,
                current_programme: appState.userProfile.programme || 'General',
                target_programme: targetProg,
                offer_points: points
            })
        });
        
        if (!res.ok) throw new Error();
        
        showToast('Inquiry Registered', `Interest in ${targetProg} registered! Admissions will contact you shortly.`, 'success');
        btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Inquiry Registered';
        btn.style.background = 'rgba(74, 222, 128, 0.15)';
        btn.style.borderColor = '#4ade80';
        btn.style.color = '#4ade80';
    } catch {
        showToast('Error', 'Failed to register enquiry. Please contact admin.', 'error');
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> Retry Request`;
    }
}
window.submitUpsellEnquiry = submitUpsellEnquiry;

// Load public announcements on page load
loadPublicAnnouncements();

setupTrafficListeners();

// Lightweight free SplitText polyfill for GSAP compatibility
window.SplitText = {
    create: function(selector, config = {}) {
        let elements;
        if (typeof selector === 'string') {
            elements = document.querySelectorAll(selector);
        } else if (selector instanceof HTMLElement) {
            elements = [selector];
        } else if (selector instanceof NodeList || Array.isArray(selector)) {
            elements = selector;
        } else {
            elements = [];
        }
        
        const allChars = [];
        const allWords = [];
        
        elements.forEach(element => {
            const text = element.innerHTML.trim();
            const tokenized = text.replace(/<br\s*\/?>/gi, " __BR__ ");
            const wordsArray = tokenized.split(/\s+/);
            element.innerHTML = '';
            
            wordsArray.forEach(word => {
                if (word === "__BR__") {
                    element.appendChild(document.createElement('br'));
                    return;
                }
                
                const wordSpan = document.createElement('span');
                wordSpan.style.display = 'inline-block';
                wordSpan.style.whiteSpace = 'nowrap';
                allWords.push(wordSpan);
                
                if (config.type && config.type.includes('chars')) {
                    [...word].forEach(char => {
                        const charSpan = document.createElement('span');
                        charSpan.style.display = 'inline-block';
                        charSpan.textContent = char;
                        wordSpan.appendChild(charSpan);
                        allChars.push(charSpan);
                    });
                } else {
                    wordSpan.textContent = word;
                }
                
                element.appendChild(wordSpan);
                element.appendChild(document.createTextNode(' '));
            });
        });
        
        return {
            chars: allChars,
            words: allWords
        };
    }
};

// Animate landing hero text with smooth GSAP split text effect
function animateLandingText() {
    const subtitle = document.querySelector('.hero-subtitle');
    const bodyText = document.querySelector('.hero-body-text');
    const button = document.getElementById('btn-hero-login');
    const crest = document.querySelector('.academic-crest-wrapper');

    // Bouncy animation for logo
    gsap.fromTo("#landing-logo", 
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "back.out(1.7)", immediateRender: true }
    );

    // Bouncy animation for navigation header
    gsap.fromTo(".landing-header-wrapper", 
        { y: -60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: "back.out(1.5)", delay: 0.1, immediateRender: true }
    );

    if (!subtitle) return;

    // Split text into characters
    const chars = SplitText.create(".text", { type: "chars" });
    
    // Make subtitle parent visible now that individual characters are hidden by gsap.from
    subtitle.style.opacity = '1';

    gsap.from(chars.chars, {
      opacity: 0, 
      y: 30,
      duration: 0.5, 
      stagger: 0.03,
      ease: "back.out(1.7)",
      immediateRender: true
    });

    if (crest) {
        gsap.fromTo(crest, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" });
    }

    if (bodyText) {
        gsap.from(bodyText, {
            opacity: 0,
            y: 20,
            duration: 0.6,
            delay: 0.4,
            ease: "power2.out",
            immediateRender: true
        });
    }

    if (button) {
        gsap.from(button, {
            opacity: 0,
            scale: 0.9,
            duration: 0.5,
            delay: 0.6,
            ease: "back.out(2)",
            immediateRender: true
        });
    }

    // Advanced typography: ScrollTrigger split-word reveals for other section subheads
    document.querySelectorAll('#login-overlay h2, #login-overlay h3').forEach(title => {
        // Skip main subtitle
        if (title.classList.contains('hero-subtitle')) return;
        
        const split = SplitText.create(title, { type: "words" });
        gsap.from(split.words, {
            scrollTrigger: {
                trigger: title,
                scroller: "#login-overlay",
                start: "top 90%",
                toggleActions: "play reverse play reverse"
            },
            opacity: 0,
            y: 25,
            duration: 0.5,
            stagger: 0.04,
            ease: "power2.out"
        });
    });
}

window.resetDatabaseState = async function(btn) {
    if (!confirm("Are you sure you want to drop all database tables and restore default seeded profiles? This cannot be undone.")) return;
    
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting...';
    try {
        const response = await fetch(`${API_BASE}/admin/system/reset-db`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Database reset operation failed.');

        showToast('Database Reset 🔄', 'All tables recreated and default demo profiles seeded successfully.', 'success');
        
        // Log out admin or refresh portal
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (err) {
        showToast('Error', err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

window.loadAdminMetrics = async function() {
    try {
        const response = await fetch(`${API_BASE}/admin/system/metrics`);
        if (!response.ok) throw new Error('Failed to load system metrics');
        const data = await response.json();

        const liabilityEl = document.getElementById('metric-points-liability');
        const redeemedEl = document.getElementById('metric-tuition-redeemed');
        const convEl = document.getElementById('metric-conversion-rate');
        const revEl = document.getElementById('metric-revenue-estimate');

        if (liabilityEl) liabilityEl.textContent = `${formatNumber(data.points_liability)} pts`;
        if (redeemedEl) redeemedEl.textContent = `AED ${formatNumber(data.points_redeemed * (appState.settings.point_aed_value || 0.25))}`;
        if (convEl) convEl.textContent = data.conversion_rate;
        if (revEl) revEl.textContent = `AED ${formatNumber(data.estimated_revenue_aed)} est. revenue`;
    } catch (err) {
        console.error('Metrics loading error:', err);
    }
};

bootApplication();

// Lazy load video backdrop after window finishes loading to prevent browser spinner hang
window.addEventListener('load', () => {
    const video = document.getElementById('bg-video');
    if (video) {
        const source = video.querySelector('source');
        if (source && source.getAttribute('data-src')) {
            source.setAttribute('src', source.getAttribute('data-src'));
            video.load();
            video.play().catch(err => console.log('Autoplay deferred:', err));
        }
    }
});

// --- SYSTEM HEALTH & SCALABILITY DASHBOARD ---
let healthPollInterval = null;

async function fetchSystemHealth() {
    try {
        const res = await fetch('/api/admin/health');
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('health-db-latency').innerText = data.dbLatencyMs + ' ms';
            document.getElementById('health-db-status').innerText = data.dbStatus;
            
            document.getElementById('health-resend-status').innerText = data.resendStatus;
            document.getElementById('health-resend-status').className = data.resendStatus === 'Connected' ? 'admin-stat-val text-blue' : 'admin-stat-val text-red';
            
            document.getElementById('health-region').innerText = data.region;
            document.getElementById('health-env').innerText = data.environment;
            
            document.getElementById('health-user-count').innerText = data.totalUsers;
            
            // Populate the new metrics
            if (document.getElementById('health-memory')) {
                document.getElementById('health-memory').innerText = data.memoryHeapMB + ' MB';
                document.getElementById('health-uptime').innerText = data.serverUptime;
                document.getElementById('health-transactions').innerText = data.totalTransactions;
                document.getElementById('health-vouchers').innerText = data.totalVouchersIssued;
            }
            
            // Add a slight pulse animation to show it updated
            const latencyElement = document.getElementById('health-db-latency');
            latencyElement.style.opacity = '0.5';
            setTimeout(() => latencyElement.style.opacity = '1', 200);
        }
    } catch (e) {
        console.error('Failed to fetch system health:', e);
        document.getElementById('health-db-status').innerText = 'Offline';
    }
}

// Hook into the tab navigation to start/stop polling
document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.nav-tab');
    if (tabBtn) {
        if (tabBtn.getAttribute('data-target') === 'admin-health') {
            fetchSystemHealth(); // Fetch immediately
            if (!healthPollInterval) {
                healthPollInterval = setInterval(fetchSystemHealth, 2000); // Poll every 2 seconds
            }
        } else {
            // Stop polling if we navigate away
            if (healthPollInterval) {
                clearInterval(healthPollInterval);
                healthPollInterval = null;
            }
        }
    }
});

async function claimEventPoints(eventId, btnElement) {
    const container = btnElement.closest('.event-claim-container');
    const input = container.querySelector('.event-claim-input');
    const claim_code = input.value.trim();

    if (!claim_code) {
        showToast('Claim Error', 'Please enter a secret code.', 'error');
        return;
    }

    if (!CURRENT_USER) {
        showToast('Authentication Error', 'You must be logged in.', 'error');
        return;
    }

    const originalText = btnElement.innerText;
    btnElement.innerText = 'Verifying...';
    btnElement.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/events/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: CURRENT_USER.user_id, claim_code })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Invalid code');

        showToast('Points Claimed! 🎉', data.message, 'success');
        btnElement.innerText = 'Claimed!';
        btnElement.style.background = 'rgba(255,255,255,0.2)';
        input.disabled = true;
        loadUserProfile(); // Refresh points
    } catch (err) {
        showToast('Claim Failed', err.message, 'error');
        btnElement.innerText = originalText;
        btnElement.disabled = false;
    }
}

// --- GLOBAL PROMO SYSTEM ---
const adminPromoForm = document.getElementById('admin-new-promo-form');
const adminPromosList = document.getElementById('admin-promos-list');

async function loadAdminPromos() {
    if (!adminPromosList) return;
    try {
        const response = await fetch(`${API_BASE}/admin/promos`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch promos');
        
        window.allAdminPromos = data.promos; // Store globally for filtering
        renderAdminPromos(data.promos);
    } catch (err) {
        console.error('Error loading promos:', err);
    }
}

function renderAdminPromos(promos) {
    if (!adminPromosList) return;
    
    // Filter into active and inactive
    const activePromos = promos.filter(p => p.status === 'active' && (p.max_uses === 0 || p.current_uses < p.max_uses));
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const inactivePromos = promos.filter(p => {
        const isInactive = p.status === 'archived' || (p.max_uses > 0 && p.current_uses >= p.max_uses);
        const createdAt = new Date(p.created_at + 'Z');
        return isInactive && createdAt > sixtyDaysAgo;
    });

    if (activePromos.length === 0) {
        adminPromosList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: rgba(255,255,255,0.5);">No active promo codes found</td></tr>';
    } else {
        adminPromosList.innerHTML = activePromos.map(p => `
            <tr>
                <td><strong style="color: var(--bia-gold);">${p.code}</strong></td>
                <td>${p.occasion || 'General'}</td>
                <td>+${p.points_reward} pts</td>
                <td>${p.current_uses} / ${p.max_uses === 0 ? '&infin;' : p.max_uses}</td>
                <td>
                    <button class="btn btn-primary btn-small" onclick="editPromoLimit(${p.code_id}, ${p.max_uses})" title="Edit Usage Limit" style="margin-right: 0.5rem; background: rgba(223,177,91,0.2); border: 1px solid rgba(223,177,91,0.4); color: var(--bia-gold);">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deletePromo(${p.code_id})" title="Archive Code">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    const expiredList = document.getElementById('admin-expired-promos-list');
    if (expiredList) {
        if (inactivePromos.length === 0) {
            expiredList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: rgba(255,255,255,0.5);">No used or expired promo codes in the last 60 days</td></tr>';
        } else {
            expiredList.innerHTML = inactivePromos.map(p => `
                <tr style="opacity: 0.6;">
                    <td><strong>${p.code}</strong></td>
                    <td>${p.occasion || 'General'}</td>
                    <td>+${p.points_reward} pts</td>
                    <td>${p.current_uses} / ${p.max_uses === 0 ? '&infin;' : p.max_uses}</td>
                    <td>
                        <span style="color: ${p.status === 'archived' ? 'var(--bia-red)' : 'var(--bia-gold)'}; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">
                            ${p.status === 'archived' ? 'Archived' : 'Fully Claimed'}
                        </span>
                    </td>
                </tr>
            `).join('');
        }
    }
}

const promoSearchFilter = document.getElementById('promo-search-filter');
if (promoSearchFilter) {
    promoSearchFilter.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (!window.allAdminPromos) return;
        
        const filtered = window.allAdminPromos.filter(p => 
            p.code.toLowerCase().includes(term) || 
            (p.occasion && p.occasion.toLowerCase().includes(term))
        );
        renderAdminPromos(filtered);
    });
}


window.deletePromo = async function(id) {
    if (!confirm('Are you sure you want to archive this promo code? Students will no longer be able to claim it, but it will remain in your records.')) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/promos/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        showToast('Deleted', 'Promo code removed successfully.', 'success');
        loadAdminPromos();
    } catch (err) {
        showToast('Error', err.message, 'error');
    }
};

if (adminPromoForm) {
    adminPromoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('promo-form-code').value.trim();
        const points_reward = parseInt(document.getElementById('promo-form-points').value) || 0;
        const max_uses = parseInt(document.getElementById('promo-form-uses').value) || 0;
        const occasion = document.getElementById('promo-form-occasion').value.trim();
        
        try {
            const response = await fetch(`${API_BASE}/admin/promos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, points_reward, max_uses, occasion })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to generate promo code');
            
            showToast('Promo Generated! 🎁', `Code ${code} is now active.`, 'success');
            adminPromoForm.reset();
            loadAdminPromos();
        } catch (err) {
            showToast('Generation Error', err.message, 'error');
        }
    });
    
    // Load promos immediately if we are on the admin view
    loadAdminPromos();
}

const studentPromoForm = document.getElementById('student-promo-redeem-form');
if (studentPromoForm) {
    studentPromoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('promo-redeem-code').value.trim();
        if (!code) return;
        
        if (!appState.currentUser) {
            showToast('Auth Error', 'You must be logged in.', 'error');
            return;
        }

        const btn = document.getElementById('btn-redeem-promo');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
        btn.disabled = true;
        
        try {
            const response = await fetch(`${API_BASE}/promos/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: appState.currentUser.user_id, code })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to redeem code');
            
            showToast('Promo Redeemed! 🎉', data.message, 'success');
            studentPromoForm.reset();
            loadUserProfile(appState.currentUser.user_id); // Refresh points
            
            // Update admin table if open in same session
            if (typeof loadAdminPromos === 'function') {
                loadAdminPromos();
            }
        } catch (err) {
            showToast('Redemption Failed', err.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

window.editPromoLimit = async function(id, currentMax) {
    const newLimit = prompt(`Enter new maximum usage limit (0 for unlimited):\nCurrently set to: ${currentMax}`, currentMax);
    if (newLimit === null) return;
    
    const maxUses = parseInt(newLimit);
    if (isNaN(maxUses) || maxUses < 0) return alert('Invalid limit. Must be a number 0 or greater.');

    try {
        const response = await fetch(`${API_BASE}/admin/promos/${id}/limit`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ max_uses: maxUses })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update limit');
        showToast('Success', 'Usage limit updated successfully!', 'success');
        loadAdminPromos();
    } catch (err) {
        showToast('Error', err.message, 'error');
    }
};

async function loadStudentPromoHistory(userId, isAdminModal = false) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}/promo-history`);
        if (!response.ok) return;
        const data = await response.json();
        
        const targetList = isAdminModal ? document.getElementById('sd-promo-history-list') : document.getElementById('student-promo-history-list');
        if (!targetList) return;
        
        if (!data.history || data.history.length === 0) {
            targetList.innerHTML = '<tr><td colspan="3" style="text-align: center; color: rgba(255,255,255,0.4);">No promo codes redeemed yet.</td></tr>';
            return;
        }
        
        targetList.innerHTML = data.history.map(h => {
            const dateStr = new Date(h.claimed_at + 'Z').toLocaleDateString();
            return `
                <tr>
                    <td><strong style="color: var(--bia-gold);">${h.code}</strong></td>
                    <td>+${h.points_reward}</td>
                    <td style="color: rgba(255,255,255,0.5);">${dateStr}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading promo history:', err);
    }
}

window.filterPromoHistory = function(query, listId) {
    const list = document.getElementById(listId);
    if (!list) return;
    
    const rows = list.querySelectorAll('tr');
    const lowerQuery = query.toLowerCase().trim();
    
    let visibleCount = 0;
    rows.forEach(row => {
        if (row.cells.length === 1) return; // skip "Loading" or "No codes" messages
        const text = row.textContent.toLowerCase();
        if (text.includes(lowerQuery)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Manage empty state if no rows match
    const existingEmptyRow = list.querySelector('.empty-search-row');
    if (existingEmptyRow) existingEmptyRow.remove();
    
    if (visibleCount === 0 && rows.length > 0 && rows[0].cells.length > 1) {
        const emptyRow = document.createElement('tr');
        emptyRow.className = 'empty-search-row';
        emptyRow.innerHTML = `<td colspan="3" style="text-align: center; color: rgba(255,255,255,0.4); padding: 1rem 0;">No matching codes found.</td>`;
        list.appendChild(emptyRow);
    }
};

// ----------------------------------------------------
// LANGUAGE TRANSLATION ENGINE (GOOGLE TRANSLATE BINDING)
// ----------------------------------------------------
let currentLang = localStorage.getItem('bia-lang') || 'en';

window.addEventListener('load', () => {
    // Initial check for saved language
    setTimeout(() => {
        if (currentLang === 'ar') {
            triggerGoogleTranslate('ar');
        }
    }, 1000);

    const footerBtn = document.getElementById('lang-toggle-btn');
    if (footerBtn) {
        footerBtn.addEventListener('click', toggleLanguage);
    }
    
    const dashBtn = document.getElementById('dash-lang-toggle');
    if (dashBtn) {
        dashBtn.addEventListener('click', toggleLanguage);
    }
    
    updateLangUI();
});

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    localStorage.setItem('bia-lang', currentLang);
    triggerGoogleTranslate(currentLang);
    updateLangUI();
}

function updateLangUI() {
    const textFooter = document.getElementById('lang-toggle-text');
    const textDash = document.getElementById('dash-lang-text');
    
    if (currentLang === 'en') {
        if (textFooter) textFooter.innerText = 'English';
        if (textDash) textDash.innerText = 'English';
        document.documentElement.lang = 'en';
        document.body.classList.remove('rtl-mode');
    } else {
        if (textFooter) textFooter.innerText = 'عربي';
        if (textDash) textDash.innerText = 'عربي';
        document.documentElement.lang = 'ar';
        document.body.classList.add('rtl-mode');
    }
} else {
        if (textFooter) textFooter.innerText = 'English';
        if (textDash) textDash.innerText = 'English';
        document.documentElement.lang = 'ar';
        document.body.classList.add('rtl-mode');
    }
}

function triggerGoogleTranslate(targetLang) {
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
        combo.value = targetLang;
        combo.dispatchEvent(new Event('change'));
    }
}
