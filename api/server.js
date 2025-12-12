// api/server.js
const express = require('express');
const { createClient } = require('redis');
import cors from 'cors';
// ... (existing imports)

const app = express();
const port = 3003; 

// --- NEW CODE START ---
// 1. Configure CORS options
const corsOptions = {
    origin: 'http://localhost:5005', // Only allow requests from your Next.js frontend
    methods: 'GET,POST', // Only allow these specific methods
};
app.use(cors(corsOptions)); // 2. Apply the CORS middleware
// --- NEW CODE END ---

// Connect to Redis
const client = createClient();
client.on('error', (err) => console.log('Redis Client Error', err));

app.use(express.json());

require('dotenv').config();
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

//this is my LuaScript



const purchaseScript = `
    local stock = tonumber(redis.call('get',KEYS[1]))
    if stock > 0 then
        redis.call('decr',KEYS[1])
        return 1
    else
        return 0
    end    
`;


// Initialize Stock (Reset to 10 items)
app.post('/reset', async (req, res) => {
    await client.set('iphone_stock', 10);
    res.send('Stock reset to 10');
});

// The Corrected "Buy" Endpoint

// Endpoint to read the current stock count from Redis
app.get('/stock', async (req, res) => {
    try {
        const stock = await client.get('iphone_stock');
        // If stock is null (not initialized), default to 0
        const count = stock !== null ? parseInt(stock) : 0; 
        res.status(200).json({ stock: count });
    } catch (e) {
        console.error("Stock Read Error:", e);
        res.status(500).json({ error: 'Failed to read stock' });
    }
});

app.post('/buy', async (req, res) => {
    try{

    //executing LuaScript atomically

    const result =  await client.eval(purchaseScript,{
        keys:['iphone_stock'],
        arguments:[]
    });
    if (result==1){
        //sending AWS queue
        const orderData = {
            userId:'user_'+(Math.random() * 10000),
            productId: 'iphone_16',
            timestamp: new Date().toISOString()
        }
        const command = new SendMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MessageBody:JSON.stringify(orderData),
        });

        await sqsClient.send(command);

        res.status(200).send('Order Queued...');
        } else {
            res.status(400).send('Fail: Sold Out');
        }
    

}catch(e){
    console.error(e);
    res.status(500).send('Server Error');
}}

);

const start = async () => {
    await client.connect();
    app.listen(port, () => {
        console.log(`API listening on port ${port}`);
    });
};

start();