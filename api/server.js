// api/server.js
const express = require('express');
const { createClient } = require('redis');
const app = express();
const port = 3003;

// Connect to Redis
const client = createClient();
client.on('error', (err) => console.log('Redis Client Error', err));

app.use(express.json());

// Initialize Stock (Reset to 100 items)
app.post('/reset', async (req, res) => {
    await client.set('iphone_stock', 100);
    res.send('Stock reset to 100');
});

// The BROKEN "Buy" Endpoint
app.post('/buy', async (req, res) => {
    // Step 1: Check Stock
    const stock = parseInt(await client.get('iphone_stock'));
    
    if (stock > 0) {
        // SIMULATED DELAY: This 50ms pause mimics real-world database latency
        // This makes the race condition obvious.
        await new Promise(r => setTimeout(r, 50)); 
        
        // Step 2: Decrease Stock
        await client.decr('iphone_stock');
        res.status(200).send('Success: Bought 1 iPhone');
    } else {
        res.status(400).send('Fail: Out of stock');
    }
});

const start = async () => {
    await client.connect();
    app.listen(port, () => {
        console.log(`API listening on port ${port}`);
    });
};

start();