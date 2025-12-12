// api/server.js
const express = require('express');
const { createClient } = require('redis');
const app = express();
const port = 3003;

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


// Initialize Stock (Reset to 100 items)
app.post('/reset', async (req, res) => {
    await client.set('iphone_stock', 100);
    res.send('Stock reset to 100');
});

// The Corrected "Buy" Endpoint

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
            productId: 'iphone_17',
            timestamp: new Data().toISOString()
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