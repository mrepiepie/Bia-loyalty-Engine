const fs = require('fs');

async function test() {
    const apiUser = '1944329353';
    const apiSecret = 'jqHqNYY4wmVQjbSYd3EhAxpetWmQxcts';
    
    const res = await fetch('https://picsum.photos/200/300');
    const buffer = await res.arrayBuffer();
    const base64Content = Buffer.from(buffer).toString('base64');
    
    // Testing URLSearchParams
    const params = new URLSearchParams();
    params.append('models', 'nudity,wad');
    params.append('api_user', apiUser);
    params.append('api_secret', apiSecret);
    params.append('media', base64Content);
    
    try {
        const response = await fetch('https://api.sightengine.com/1.0/check.json', {
            method: 'POST',
            body: params
        });
        const data = await response.json();
        console.log("Response:", data.status, data.error);
    } catch(e) {
        console.error(e);
    }
}
test();
