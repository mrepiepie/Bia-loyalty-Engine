const fs = require('fs');

let content = fs.readFileSync('public/index.html', 'utf8');

const regex = /<div id="community-hub".*?<!-- Posts will be injected here -->\s*<\/div>\s*<\/div>\s*<\/div>/s;

const newContent = `<div id="community-hub" class="tab-content student-only">
                <div class="card form-card glassmorphic spotlight-card" style="text-align: center; padding: 4rem 2rem;">
                    <i class="fa-solid fa-rocket" style="font-size: 4rem; color: #66fcf1; margin-bottom: 1.5rem;"></i>
                    <h3 style="font-size: 2rem; margin-bottom: 1rem;">The Community Has Evolved!</h3>
                    <p class="section-desc" style="margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">
                        We have launched a massive, dedicated social platform for BIA students to discuss academics, housing, internships, and more. Join the conversation and earn huge points for accepted answers!
                    </p>
                    <a href="community.html" class="btn btn-primary" style="font-size: 1.2rem; padding: 1rem 2.5rem; text-decoration: none;">
                        <i class="fa-solid fa-users"></i> Go to the BIA Community Hub
                    </a>
                </div>
            </div>`;

if (regex.test(content)) {
    content = content.replace(regex, newContent);
    fs.writeFileSync('public/index.html', content);
    console.log("Replaced community hub in index.html");
} else {
    console.error("Could not find regex in index.html");
}
