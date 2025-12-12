// worker/worker.js
// Remember to run 'npm install dotenv @aws-sdk/client-sqs' in your project root if you haven't!

require('dotenv').config(); 
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");

// Initialize SQS Client using environment variables
const client = new SQSClient({ 
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const QUEUE_URL = process.env.SQS_QUEUE_URL;

// --- IDEMPOTENCY TRACKER ---
// In a real application, this would be a check against a persistent database (e.g., MongoDB/DynamoDB).
// For this simulation, we use an in-memory Set to track unique message IDs processed in this session.
const processedMessageIds = new Set(); 
// --- IDEMPOTENCY TRACKER ---

const processOrders = async () => {
    console.log("Worker listening for orders...");
    
    while (true) {
        try {
            // 1. Poll SQS for messages (Long Polling for cost-efficiency)
            const command = new ReceiveMessageCommand({
                QueueUrl: QUEUE_URL,
                MaxNumberOfMessages: 10,
                WaitTimeSeconds: 20 // SQS waits up to 20 seconds for messages
            });
            
            const response = await client.send(command);

            if (response.Messages) {
                for (const msg of response.Messages) {
                    
                    // --- IDEMPOTENCY CHECK & PROCESSING START ---
                    
                    // The MessageId is unique for each message sent to the queue
                    if (processedMessageIds.has(msg.MessageId)) {
                        console.log(`[DUPLICATE IGNORED] Message ID ${msg.MessageId} already processed in this session.`);
                        
                        // IMPORTANT: Even if duplicate, we must delete it from the queue!
                        await client.send(new DeleteMessageCommand({
                            QueueUrl: QUEUE_URL,
                            ReceiptHandle: msg.ReceiptHandle
                        }));
                        continue; 
                    }
                    processedMessageIds.add(msg.MessageId);

                    const order = JSON.parse(msg.Body);
                    
                    // 2. Simulate DB Insert (The "Work")
                    console.log(`[DB SAVE] Processing Order for User: ${order.userId}`);
                    
                    // 3. Delete from Queue
                    // This tells SQS: "I successfully saved this order, you can permanently remove it."
                    await client.send(new DeleteMessageCommand({
                        QueueUrl: QUEUE_URL,
                        ReceiptHandle: msg.ReceiptHandle
                    }));
                    
                    // --- PROCESSING END ---
                }
            }
        } catch (err) {
            console.error("Worker Error:", err);
            // In case of error, the message will eventually become visible again if not deleted
        }
    }
};

processOrders();