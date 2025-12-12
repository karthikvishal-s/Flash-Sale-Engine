// attack-script/attack.js

const axios = require('axios');
const readline = require('readline');

const API_URL = 'http://localhost:3003';
const STOCK_SIZE = 10; // We keep the available stock small to highlight the race condition fix

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function runAttack() {
    let requestsToSend = 0;

    // 1. Get user input for load size (100 to 5000)
    try {
        const input = await askQuestion(
            `\nEnter the number of requests to send (100 - 5000): `
        );
        requestsToSend = parseInt(input);
        
        if (isNaN(requestsToSend) || requestsToSend < 100 || requestsToSend > 5000) {
            console.error("\n❌ Invalid input. Defaulting to 1000 requests.");
            requestsToSend = 1000;
        }

    } catch (e) {
        console.error(e);
        rl.close();
        return;
    }

    console.log(`\n--- Starting Simulation ---`);
    console.log(`Available Stock (Redis): ${STOCK_SIZE}`);
    console.log(`Load Size: ${requestsToSend} concurrent requests`);

    // 2. Reset the stock via the API
    try {
        await axios.post(`${API_URL}/reset-stock/${STOCK_SIZE}`);
        console.log(`\n✅ Stock successfully reset to ${STOCK_SIZE} units.`);
    } catch (error) {
        console.error(`\n❌ Could not reset stock. Is API running on ${API_URL}?`);
        rl.close();
        return;
    }

    // 3. Fire the concurrent requests
    const startTime = Date.now();
    const requests = [];

    for (let i = 0; i < requestsToSend; i++) {
        // We use a random number in the range 100 to 5000 for the user ID
        const randomUserId = Math.floor(Math.random() * (5000 - 100 + 1)) + 100;

        requests.push(
            axios.post(`${API_URL}/buy`, { userId: randomUserId })
                 .then(response => {
                     if (response.status === 200) {
                         // Only log successful (queued) buys
                         console.log(`[QUEUED] User_${randomUserId} secured an item.`);
                     }
                     return response;
                 })
                 .catch(error => {
                     // Log failed attempts (Sold Out)
                     if (error.response && error.response.status === 400) {
                         // console.log(`[SOLD OUT] User_${randomUserId} failed.`); // Too noisy
                     } else {
                         // Log real errors
                         console.error(`[ERROR] Request failed for User_${randomUserId}`);
                     }
                 })
        );
    }

    // Wait for all requests to complete
    await Promise.all(requests);
    const endTime = Date.now();

    console.log(`\n--- Simulation Complete ---`);
    console.log(`Total Time Taken: ${(endTime - startTime) / 1000} seconds`);
    console.log(`Final Check: Run 'redis-cli get iphone_stock' in a new terminal.`);

    rl.close();
}

runAttack();