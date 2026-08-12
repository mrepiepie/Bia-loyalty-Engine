const http = require('http');

const request = (method, path, body = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

async function runTest() {
    console.log("1. Creating test user...");
    const createRes = await request('POST', '/api/admin/create-student', {
        name: "Test User",
        email: "test.delete3@example.com",
        password: "password123",
        student_id: "TEST-DEL-003",
        programme: "Test Prog"
    });
    console.log("Create Response:", createRes);
    
    if (createRes.status !== 200) {
        console.error("Failed to create user!");
        return;
    }

    const userId = createRes.data.user_id;
    
    console.log(`\n2. Deleting user ${userId}...`);
    const delRes = await request('DELETE', `/api/admin/users/${userId}`);
    console.log("Delete Response:", delRes);

    if (delRes.status !== 200) {
        console.error("Failed to delete user!");
        return;
    }

    console.log("\n3. Creating the SAME user again...");
    const createRes2 = await request('POST', '/api/admin/create-student', {
        name: "Test User",
        email: "test.delete3@example.com",
        password: "password123",
        student_id: "TEST-DEL-003",
        programme: "Test Prog"
    });
    console.log("Create Again Response:", createRes2);
}

runTest().catch(console.error);
