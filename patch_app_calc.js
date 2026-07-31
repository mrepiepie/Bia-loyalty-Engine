const fs = require('fs');

let content = fs.readFileSync('public/app.js', 'utf8');

const target = `document.getElementById('btn-confirm-redemption').addEventListener('click', async () => {`;
const toInsert = `// Add auto-calculate on input change
let calcTimeout;
['course-fee', 'points-to-redeem'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => {
            clearTimeout(calcTimeout);
            calcTimeout = setTimeout(() => {
                document.getElementById('btn-calculate-discount').click();
            }, 300); // 300ms debounce
        });
    }
});

`;

if (!content.includes('calcTimeout')) {
    content = content.replace(target, toInsert + target);
    fs.writeFileSync('public/app.js', content);
    console.log("Successfully added auto-calculate listener.");
} else {
    console.log("Auto-calculate listener already exists.");
}
