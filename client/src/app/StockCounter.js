// client/src/app/StockCounter.js
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
    
    // --- Simulation States ---
    const [loadSize, setLoadSize] = useState(1000); // The number of buyers hitting the server
    const [isAttacking, setIsAttacking] = useState(false);
    const [simulationStock, setSimulationStock] = useState(10); // The number of available items (The Winners)
    // --- Simulation States ---

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
        
        const currentStock = stockCount; 

        try {
            const response = await axios.post(`${API_URL}/buy`, { userId: 'User_Manual' });
            
            alert(`Success: ${response.data}`);
            setStockCount(currentStock - 1); // Optimistic Update

        } catch (error) {
            if (error.response && error.response.status === 400) {
                alert('Sale Failed: Item is Sold Out!');
            } else {
                alert('Purchase Failed: Server error.');
            }
        } finally {
            setLoading(false);
            setTimeout(fetchStock, 50); 
        }
    };

    // --- Core Function: Concurrency Load Attack ---
    const handleSimulateAttack = async () => {
        // Validation check
        if (isAttacking || isNaN(loadSize) || loadSize < 100 || loadSize > 5000 || isNaN(simulationStock) || simulationStock < 1) {
            alert("Invalid input: Load must be 100-5000 and Stock must be >= 1.");
            return;
        }

        setIsAttacking(true);
        const requestsToSend = loadSize;
        const stockToSet = simulationStock;

        console.log(`\n--- Starting Attack Simulation ---`);
        console.log(`Resetting stock to ${stockToSet} winners...`);

        try {
            // 1. Reset the stock via the API, using the customizable stock size
            await axios.post(`${API_URL}/reset-stock/${stockToSet}`);
            console.log(`Stock reset complete. Firing ${requestsToSend} requests...`);
            
            // 2. Fire the concurrent requests
            const requests = [];
            for (let i = 0; i < requestsToSend; i++) {
                const randomUserId = Math.floor(Math.random() * (5000 - 100 + 1)) + 100;

                requests.push(
                    axios.post(`${API_URL}/buy`, { userId: `User_${randomUserId}` })
                         .catch(error => {
                             // Suppress expected "Sold Out" (400) errors
                         })
                );
            }
            
            await Promise.all(requests);
            
            alert(`Attack Complete! ${requestsToSend} requests sent. Exactly ${stockToSet} orders were queued.`);

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
                
                {/* Custom Stock Input */}
                <input
                    type="number"
                    value={simulationStock}
                    onChange={(e) => setSimulationStock(parseInt(e.target.value))}
                    placeholder="Available Stock (Winners)"
                    min="1"
                    className="w-full p-2 border border-gray-300 rounded-lg text-center mb-3 text-gray-800"
                    disabled={isAttacking}
                />
                
                {/* Custom Load Size Input */}
                <input
                    type="number"
                    value={loadSize}
                    onChange={(e) => setLoadSize(parseInt(e.target.value))}
                    placeholder="Load Size (100-5000 requests)"
                    min="100"
                    max="5000"
                    className="w-full p-2 border border-gray-300 rounded-lg text-center mb-3 text-gray-800"
                    disabled={isAttacking}
                />
                
                <button 
                    onClick={handleSimulateAttack}
                    disabled={isAttacking || isNaN(loadSize) || isNaN(simulationStock)}
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
            
            {/* --- Admin Reset Button (Resets to the current stock setting) --- */}
            <button 
                onClick={() => axios.post(`${API_URL}/reset-stock/${simulationStock}`).then(fetchStock)}
                className="mt-4 px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                disabled={isAttacking}
            >
                [Admin: Reset Stock to {simulationStock}]
            </button>
        </div>
    );
};

export default StockCounter;