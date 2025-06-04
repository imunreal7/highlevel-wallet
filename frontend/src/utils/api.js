import axios from "axios";

// Base URL for backend. In development, this is localhost:4000.
// In production, you’ll set this to your deployed backend URL.
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Initialize a wallet: POST /setup
 * @param {{ balance: number, name: string }} data
 */
export function setupWallet(data) {
    return api.post("/setup", data);
}

/**
 * Transact: POST /transact/:walletId
 * @param {string} walletId
 * @param {{ amount: number, description: string }} data
 */
export function transact(walletId, data) {
    return api.post(`/transact/${walletId}`, data);
}

/**
 * Get wallet details: GET /wallet/:walletId
 * @param {string} walletId
 */
export function getWallet(walletId) {
    return api.get(`/wallet/${walletId}`);
}

/**
 * Get transactions: GET /transactions?walletId=&skip=&limit=
 * @param {string} walletId
 * @param {number} skip
 * @param {number} limit
 */
export function getTransactions(walletId, skip = 0, limit = 10) {
    return api.get("/transactions", {
        params: { walletId, skip, limit },
    });
}

export default api;

