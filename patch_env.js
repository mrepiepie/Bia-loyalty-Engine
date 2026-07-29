const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');
if (!serverJs.includes("require('dotenv').config()")) {
    serverJs = "require('dotenv').config();\n" + serverJs;
    fs.writeFileSync('server.js', serverJs, 'utf8');
}
console.log('Added dotenv to server.js');
