const fs = require('fs');

let html = fs.readFileSync('public/community.html', 'utf8');

// Fix the overflow clipping on create-post-box
const toFind = `<div id="create-post-box" class="card glassmorphic" style="display: none; margin-bottom: 1.5rem;">`;
const toReplace = `<div id="create-post-box" class="card glassmorphic" style="display: none; margin-bottom: 1.5rem; overflow: visible !important;">`;

html = html.replace(toFind, toReplace);

// Let's also add overflow: visible to any parent container just in case
// But usually just the immediate card is enough since `.card` sets overflow:hidden to make rounded corners clip nicely.

fs.writeFileSync('public/community.html', html);
console.log('Fixed create-post-box overflow');
