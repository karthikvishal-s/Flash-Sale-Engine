// api/server.js

require('dotenv').config(); // Load environment variables first

const express = require('express');
const { createClient } = require('redis');
const cors = require('cors'); 
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const app = express();
const port = 3003; 

// --- 1. CORS Configuration ---
const corsOptions = {
    // Client is on 3005
    origin: 'http://localhost:5005', 
    methods: 'GET,POST', 
};
app.use(cors(corsOptions));
app.use(express.json());


// --- 2. AWS SQS and Redis Initialization ---

const sqsClient = new SQSClient({ 
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const client = createClient();
client.on('error', (err) => console.log('Redis Client Error', err));


// --- 3. Redis Lua Script (Atomic Operation) ---
const purchaseScript = `
    local stock = tonumber(redis.call('get',KEYS[1]))
    if stock > 0 then
        redis.call('decr',KEYS[1])
        return 1
    else
        return 0
    end    
`;


// --- 4. API Endpoints ---

// Dynamic Stock Reset Endpoint: POST /reset-stock/:count
app.post('/reset-stock/:count', async (req, res) => {
    const count = parseInt(req.params.count);
    if (isNaN(count) || count < 1) {
        return res.status(400).send('Invalid stock count.');
    }
    await client.set('iphone_stock', count);
    res.send(`Stock reset to ${count}`);
});

// Stock Read Endpoint: GET /stock
app.get('/stock', async (req, res) => {
    try {
        const stock = await client.get('iphone_stock');
        const count = stock !== null ? parseInt(stock) : 0; 
        res.status(200).json({ stock: count });
    } catch (e) {
        console.error("Stock Read Error:", e);
        res.status(500).json({ error: 'Failed to read stock' });
    }
});

// Buy Endpoint: POST /buy
app.post('/buy', async (req, res) => {
    try {
        const result =  await client.eval(purchaseScript, {
            keys: ['iphone_stock'],
            arguments: []
        });

        if (result == 1) {
            const orderData = {
                // Ensure userId is read from the request body if available
                userId: req.body.userId || 'User_Manual', 
                productId: 'iphone_16',
                timestamp: new Date().toISOString()
            };
            
            const command = new SendMessageCommand({
                QueueUrl: process.env.SQS_QUEUE_URL,
                MessageBody: JSON.stringify(orderData),
            });

            await sqsClient.send(command);

            res.status(200).send('Order Queued...');
        } else {
            res.status(400).send('Fail: Sold Out');
        }
    } catch(e) {
        console.error(e);
        res.status(500).send('Server Error');
    }
});


// --- 5. Server Start ---

const start = async () => {
    await client.connect(); 
    app.listen(port, () => {
        console.log(`API listening on port ${port}`);
    });
};

start();