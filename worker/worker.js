// worker/worker.js
require('dotenv').config();
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");

const client = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.SQS_QUEUE_URL;

const processOrders = async () => {
    console.log("Worker listening for orders...");
    
    while (true) {
        try {
            // 1. Poll SQS for messages
            const command = new ReceiveMessageCommand({
                QueueUrl: QUEUE_URL,
                MaxNumberOfMessages: 10, // Pull up to 10 orders at once
                WaitTimeSeconds: 20      // Long Polling (saves money)
            });
            
            const response = await client.send(command);

            if (response.Messages) {
                for (const msg of response.Messages) {
                    const order = JSON.parse(msg.Body);
                    
                    // 2. Simulate DB Insert
                    console.log(`[DB SAVE] Processing Order for User: ${order.userId}`);
                    
                    // 3. Delete from Queue (Critical Step!)
                    await client.send(new DeleteMessageCommand({
                        QueueUrl: QUEUE_URL,
                        ReceiptHandle: msg.ReceiptHandle
                    }));
                }
            }
        } catch (err) {
            console.error("Worker Error:", err);
        }
    }
};

processOrders();