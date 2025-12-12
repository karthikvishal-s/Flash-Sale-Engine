// client/src/app/StockCounter.js
'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3003';

const StockCounter = () => {
    const [stockCount, setStockCount] = useState('...');
    const [status, setStatus] = useState('Loading...');
    const [loading, setLoading] = useState(false);

    // Function to fetch the stock count
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

    // Function to attempt a purchase
    const handleBuy = async () => {
        if (stockCount <= 0) return;
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/buy`);
            alert(`Success: ${response.data}`);
        } catch (error) {
            if (error.response && error.response.status === 400) {
                alert('Sale Failed: Item is Sold Out!');
            } else {
                alert('Purchase Failed: Server error.');
            }
        } finally {
            setLoading(false);
            // Manually trigger a refresh after purchase attempt
            fetchStock();
        }
    };

    // Polling Hook (Runs every 1000ms / 1 second)
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

            <button 
                onClick={handleBuy} 
                disabled={buttonDisabled}
                className={`
                    w-full py-4 text-xl font-semibold rounded-lg transition-colors duration-200
                    ${buttonDisabled 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'}
                `}
            >
                {loading ? 'Processing...' : (stockCount > 0 ? 'BUY NOW' : 'SOLD OUT')}
            </button>

            <button 
                onClick={() => axios.post(`${API_URL}/reset`).then(fetchStock)}
                className="mt-4 px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
            >
                [Admin: Reset Stock]
            </button>
        </div>
    );
};

export default StockCounter;