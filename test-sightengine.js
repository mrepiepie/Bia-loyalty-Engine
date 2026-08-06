const fs = require('fs');

async function test() {
    try {
        const formData = new FormData();
        formData.append('models', 'nudity,wad');
        formData.append('api_user', '1944329353');
        formData.append('api_secret', 'jqHqNYY4wmVQjbSYd3EhAxpetWmQxcts');
        formData.append('url', 'https://raw.githubusercontent.com/pjreddie/darknet/master/data/gun.jpg');

        const response = await fetch('https://api.sightengine.com/1.0/check.json', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
