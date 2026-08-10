const fs = require('fs');
let js = fs.readFileSync('server.js', 'utf8');

const badChunk = `        res.json({ message: 'Warning issued successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to issue warning' });
    }
});`;

js = js.replace(badChunk, "");

fs.writeFileSync('server.js', js);
console.log('Fixed server.js');
