const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

const regex = /\/\/ Apply GSAP hover animations[\s\S]*?(?=\}\s*const container = document.getElementById)/;

const replacement = `// Apply GSAP hover animations with Glitch & Center Scale
            document.querySelectorAll('.partner-grid-card').forEach(card => {
                let hoverTl;
                
                card.addEventListener('mouseenter', () => {
                    // Bring to front
                    gsap.set(card, { zIndex: 100 });
                    
                    hoverTl = gsap.timeline();
                    // 1. Pop out significantly (comes bigger and the centre)
                    hoverTl.to(card, { 
                        scale: 1.15, 
                        z: 100,
                        boxShadow: "0 30px 60px rgba(0,0,0,0.8)",
                        borderColor: "rgba(255,255,255,0.4)",
                        duration: 0.4, 
                        ease: "back.out(1.5)"
                    }, 0);
                    
                    // 2. Glitch effect (RGB split simulation + shake)
                    // We simulate RGB split by rapidly changing text-shadow and shaking the box
                    hoverTl.to(card, {
                        x: () => (Math.random() - 0.5) * 10,
                        y: () => (Math.random() - 0.5) * 10,
                        skewX: () => (Math.random() - 0.5) * 5,
                        filter: "contrast(120%) saturate(150%) hue-rotate(10deg)",
                        duration: 0.05,
                        repeat: 4,
                        yoyo: true,
                        ease: "rough({ template: none.out, strength: 1, points: 20, taper: 'none', randomize: true, clamp: false })"
                    }, 0);

                    // 3. Settle
                    hoverTl.to(card, {
                        x: 0,
                        y: 0,
                        skewX: 0,
                        filter: "contrast(100%) saturate(100%) hue-rotate(0deg)",
                        duration: 0.1
                    });
                });
                
                card.addEventListener('mouseleave', () => {
                    if (hoverTl) hoverTl.kill();
                    gsap.to(card, { 
                        scale: 1, 
                        z: 0,
                        x: 0,
                        y: 0,
                        skewX: 0,
                        filter: "contrast(100%) saturate(100%) hue-rotate(0deg)",
                        zIndex: 1,
                        boxShadow: "0 0 0 rgba(0,0,0,0)",
                        borderColor: "rgba(255,255,255,0.05)",
                        duration: 0.3, 
                        ease: "power2.out" 
                    });
                });
            });
        `;

appJs = appJs.replace(regex, replacement);
fs.writeFileSync('public/app.js', appJs);
console.log('Fixed GSAP glitch and scale animation!');
