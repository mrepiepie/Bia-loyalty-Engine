
async function test() {
    const baseUrl = 'http://localhost:3001';
    
    console.log("Registering user...");
    const reg = await fetch(`${baseUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', email: 'test@test.com', password: 'test', programme: 'General', student_id: '123' })
    });
    
    console.log("Logging in...");
    const login = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    });
    const loginData = await login.json();
    const token = loginData.token;
    
    if(!token) { console.error("Login failed!", loginData); return; }
    
    console.log("Posting to community...");
    const postRes = await fetch(`${baseUrl}/api/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: 'Test', content: 'Test post', tags: '["Home", "General"]' })
    });
    console.log("Post response:", await postRes.text());
    
    console.log("Fetching feed...");
    const feedRes = await fetch(`${baseUrl}/api/community/posts?sort=hot`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("Feed status:", feedRes.status);
    console.log("Feed response:", await feedRes.text());
}

test();
