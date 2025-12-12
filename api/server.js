const express = require('express');
const { createClient } = require('redis');
const app = express();
const port = 3005;

// this code is to connect to redis...
const client = createClient();
client.on("error",(err) => console.log('Redis Client Error',err));

app.use(express.json());

//Initializing thee Stocks...

app.post('/reset',async(req,res)=>{
    await client.set('iphone_stock',69);
    res.send("Stock resetted to 69");
});

//The Broken "buy"

app.post("/buy",async(req,res)=>{
    const stock = parseInt(await client.get("iphone_stock"));

    if(stock>0){
        await new Promise(r=>setTimeout(r,50));

        await client.decr('iphone_stock');
        res.status(200).send('Success: Bought 1 iPhone');
    }else{
        res.status(400).send('Error - Out of Stock');
    }
});

const start = async () => {
    await client.connect();
    app.listen(port, () => {
        console.log(`API listening on port ${port}`);
    });
};

start();
