'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// The API URL for your Node/Express Backend
const API_URL = 'http://localhost:3003';

const StockCounter = () => {
    // UI State
    const [stockCount, setStockCount] = useState('...');
    const [status, setStatus] = useState('Loading...');
    const [loading, setLoading] = useState(false);
    
    // Simulation State
    const [loadSize, setLoadSize] = useState(1000);
    const [isAttacking, setIsAttacking] = useState(false);
    
    // Fixed stock size for a noticeable effect during the attack simulation
    const STOCK_SIZE_SIMULATION = 10; 

    // Function to fetch the current stock count from Redis
    const fetchStock = async () => {
        try {
            const response = await axios.get(`${API_URL}/stock`);
            const count = response.data.stock;
            setStockCount(count);
            setStatus(count > 0 ? 'ON SALE' : 'SOLD OUT');
        } catch (error) {
            console.error("API Fetch Error:", error);
            setStatus('API Error');
        }
    };

    // --- Core Function: Single Purchase ---
    const handleBuy = async () => {
        if (stockCount <= 0 || loading) return;
        setLoading(true);
        
        // Optimistic Update: Store current count before the async request
        const currentStock = stockCount; 

        try {
            const response = await axios.post(`${API_URL}/buy`, { userId: 'User_Manual' });
            
            alert(`Success: ${response.data}`);
            
            // Optimistically decrement UI immediately for responsiveness
            setStockCount(currentStock - 1); 

        } catch (error) {
            if (error.response && error.response.status === 400) {
                alert('Sale Failed: Item is Sold Out!');
            } else {
                alert('Purchase Failed: Server error.');
            }
        } finally {
            setLoading(false);
            // Immediately sync with the server after a small delay
            setTimeout(fetchStock, 50); 
        }
    };

    // --- Core Function: Concurrency Load Attack ---
    const handleSimulateAttack = async () => {
        if (isAttacking || isNaN(loadSize) || loadSize < 100 || loadSize > 5000) return;

        setIsAttacking(true);
        const requestsToSend = loadSize;

        console.log(`\n--- Starting Attack Simulation ---`);
        console.log(`Resetting stock to ${STOCK_SIZE_SIMULATION}...`);

        try {
            // 1. Reset the stock via the new API endpoint
            await axios.post(`${API_URL}/reset-stock/${STOCK_SIZE_SIMULATION}`);
            console.log(`Stock reset complete. Firing ${requestsToSend} requests...`);
            
            // 2. Fire the concurrent requests (Promise.all simulates concurrency)
            const requests = [];
            for (let i = 0; i < requestsToSend; i++) {
                // User ID in the required range (100-5000)
                const randomUserId = Math.floor(Math.random() * (5000 - 100 + 1)) + 100;

                requests.push(
                    axios.post(`${API_URL}/buy`, { userId: `User_${randomUserId}` })
                         .catch(error => {
                             // Suppress expected "Sold Out" (400) errors
                         })
                );
            }
            
            await Promise.all(requests);
            
            alert(`Attack Complete! ${requestsToSend} requests sent. Check console/worker log.`);

        } catch (error) {
            alert(`Simulation failed: Ensure the API and Redis are running.`);
        } finally {
            setIsAttacking(false);
            fetchStock(); // Final sync check
            console.log(`--- Simulation Ended. Final stock check initiated. ---`);
        }
    };


    // Polling Hook (Runs every 1000ms / 1 second to update the UI)
    useEffect(() => {
        fetchStock();
        const intervalId = setInterval(fetchStock, 1000);

        return () => clearInterval(intervalId);
    }, []);


    const buttonDisabled = stockCount <= 0 || stockCount === '...' || loading;

    return (
        <div className="font-sans text-center p-10 max-w-sm mx-auto my-12 border-2 border-gray-300 rounded-xl shadow-lg bg-white">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">iPhone 16 Flash Sale</h1>

            <div className="p-3 bg-gray-100 rounded-lg mb-6 text-lg">
                Status: 
                <span className={`font-bold ml-2 ${stockCount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {status}
                </span>
            </div>

            <h2 className="text-7xl font-extrabold my-2 text-blue-600">
                {stockCount}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
                Units Remaining (Live from Redis)
            </p>

            {/* --- Manual Buy Button --- */}
            <button 
                onClick={handleBuy} 
                disabled={buttonDisabled || isAttacking}
                className={`
                    w-full py-4 text-xl font-semibold rounded-lg transition-colors duration-200
                    ${buttonDisabled 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'}
                `}
            >
                {loading ? 'Processing...' : (stockCount > 0 ? 'BUY NOW' : 'SOLD OUT')}
            </button>

            {/* --- Load Simulation Controls --- */}
            <div className="mt-8 pt-4 border-t border-gray-200">
                <h3 className="text-xl font-semibold mb-3 text-gray-700">Load Simulation Tool</h3>
                
                <input
                    type="number"
                    value={loadSize}
                    onChange={(e) => setLoadSize(parseInt(e.target.value))}
                    placeholder="Load Size (100-5000)"
                    min="100"
                    max="5000"
                    className="w-full p-2 border border-gray-300 rounded-lg text-center mb-3 text-gray-800"
                    disabled={isAttacking}
                />
                
                <button 
                    onClick={handleSimulateAttack}
                    disabled={isAttacking || isNaN(loadSize)}
                    className={`
                        w-full py-2 text-sm font-semibold rounded-lg transition-colors
                        ${isAttacking 
                            ? 'bg-yellow-600 cursor-wait text-gray-800' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'}
                    `}
                >
                    {isAttacking ? `Attacking (${loadSize}) requests...` : 'Run Concurrency Test'}
                </button>
            </div>
            
            {/* --- Admin Reset Button --- */}
            <button 
                onClick={() => axios.post(`${API_URL}/reset-stock/10`).then(fetchStock)}
                className="mt-4 px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                disabled={isAttacking}
            >
                [Admin: Reset Stock to 10]
            </button>
        </div>
    );
};

export default StockCounter;