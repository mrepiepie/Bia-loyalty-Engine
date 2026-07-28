const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

// The replace tool deleted lines, let's just do a git checkout to restore it first.
