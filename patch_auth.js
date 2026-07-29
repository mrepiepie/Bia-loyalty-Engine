const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    'SELECT user_id, name, email, role, student_id, referral_code FROM users WHERE email = ? AND password = ?',
    'SELECT user_id, name, email, role, student_id, referral_code FROM users WHERE LOWER(email) = LOWER(?) AND password = ?'
);

serverJs = serverJs.replace(
    'SELECT name, email, password, student_id, role FROM users WHERE email = ? OR student_id = ?',
    'SELECT name, email, password, student_id, role FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(student_id) = LOWER(?)'
);

fs.writeFileSync('server.js', serverJs);
console.log('Patched auth queries to be case-insensitive');
