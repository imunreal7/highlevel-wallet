import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setupWallet, getWallet, transact } from "../utils/api";

function Home() {
    const [walletId, setWalletId] = useState(() => {
        // Read from localStorage
        return localStorage.getItem("walletId") || "";
    });
    const [walletName, setWalletName] = useState("");
    const [walletBalance, setWalletBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Form state for initializing
    const [initName, setInitName] = useState("");
    const [initBalance, setInitBalance] = useState("");

    // Form state for transactions
    const [txnAmount, setTxnAmount] = useState("");
    const [txnType, setTxnType] = useState("CREDIT"); // 'CREDIT' or 'DEBIT'
    const [txnDesc, setTxnDesc] = useState("");

    const navigate = useNavigate();

    // If walletId exists, fetch wallet details on mount or when walletId changes
    useEffect(() => {
        async function fetchWallet() {
            if (!walletId) return;
            setLoading(true);
            try {
                const resp = await getWallet(walletId);
                const { name, balance } = resp.data;
                setWalletName(name);
                setWalletBalance(balance);
            } catch (err) {
                console.error(err);
                setErrorMsg(err.response?.data?.message || "Failed to load wallet");
                // If 404 (wallet not found), remove it from localStorage
                if (err.response?.status === 404) {
                    localStorage.removeItem("walletId");
                    setWalletId("");
                }
            } finally {
                setLoading(false);
            }
        }
        fetchWallet();
    }, [walletId]);

    // Handler: Initialize wallet
    const handleInitSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (!initName.trim()) {
            setErrorMsg("Name is required");
            return;
        }
        const payload = {
            name: initName.trim(),
            balance: initBalance !== "" ? parseFloat(initBalance) : 0,
        };

        setLoading(true);
        try {
            const resp = await setupWallet(payload);
            const { id, balance, name } = resp.data;
            // Save to localStorage
            localStorage.setItem("walletId", id);
            setWalletId(id);
            setWalletBalance(balance);
            setWalletName(name);
            // Clear init form
            setInitName("");
            setInitBalance("");
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.message || "Failed to initialize wallet");
        } finally {
            setLoading(false);
        }
    };

    // Handler: Create transaction
    const handleTxnSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (!txnAmount || isNaN(parseFloat(txnAmount)) || parseFloat(txnAmount) === 0) {
            setErrorMsg("Amount must be a non-zero number");
            return;
        }
        const amtValue = parseFloat(txnAmount);
        // For DEBIT, send a negative number
        const signedAmount = txnType === "DEBIT" ? -Math.abs(amtValue) : Math.abs(amtValue);
        const payload = {
            amount: signedAmount,
            description: txnDesc,
        };

        setLoading(true);
        try {
            const resp = await transact(walletId, payload);
            const { balance } = resp.data;
            setWalletBalance(balance);
            // Clear transaction form
            setTxnAmount("");
            setTxnDesc("");
            setTxnType("CREDIT");
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.message || "Failed to perform transaction");
        } finally {
            setLoading(false);
        }
    };

    // Render
    return (
        <div
            style={{
                maxWidth: "500px",
                margin: "2rem auto",
                padding: "1rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
            }}
        >
            <h1 style={{ textAlign: "center" }}>Wallet Dashboard</h1>

            {errorMsg && <div style={{ color: "red", marginBottom: "1rem" }}>{errorMsg}</div>}

            {loading && <div style={{ marginBottom: "1rem" }}>Loading…</div>}

            {!walletId ? (
                // Initialize Wallet Form
                <form onSubmit={handleInitSubmit}>
                    <div style={{ marginBottom: "0.75rem" }}>
                        <label>
                            <strong>Name:</strong>
                            <input
                                type="text"
                                value={initName}
                                onChange={(e) => setInitName(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
                                placeholder="Enter your name"
                                required
                            />
                        </label>
                    </div>
                    <div style={{ marginBottom: "0.75rem" }}>
                        <label>
                            <strong>Initial Balance (optional):</strong>
                            <input
                                type="number"
                                step="0.0001"
                                value={initBalance}
                                onChange={(e) => setInitBalance(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
                                placeholder="e.g. 10.0000 (defaults to 0)"
                            />
                        </label>
                    </div>
                    <button
                        type="submit"
                        style={{
                            width: "100%",
                            padding: "0.75rem",
                            background: "#1976d2",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                        disabled={loading}
                    >
                        Initialize Wallet
                    </button>
                </form>
            ) : (
                // Wallet Exists: Show Balance & Transaction Form
                <div>
                    <div
                        style={{
                            marginBottom: "1rem",
                            padding: "1rem",
                            background: "#f5f5f5",
                            borderRadius: "4px",
                        }}
                    >
                        <h2>{walletName}</h2>
                        <p>
                            <strong>Balance:</strong>{" "}
                            {walletBalance !== null ? walletBalance.toFixed(4) : "—"}
                        </p>
                    </div>

                    {/* Transaction Form */}
                    <form onSubmit={handleTxnSubmit} style={{ marginBottom: "1.5rem" }}>
                        <h3>New Transaction</h3>

                        <div style={{ marginBottom: "0.75rem" }}>
                            <label>
                                <strong>Amount:</strong>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={txnAmount}
                                    onChange={(e) => setTxnAmount(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "0.5rem",
                                        marginTop: "0.25rem",
                                    }}
                                    placeholder="e.g. 5.0000"
                                    required
                                />
                            </label>
                        </div>

                        <div style={{ marginBottom: "0.75rem" }}>
                            <label>
                                <strong>Type:</strong>
                                <select
                                    value={txnType}
                                    onChange={(e) => setTxnType(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "0.5rem",
                                        marginTop: "0.25rem",
                                    }}
                                >
                                    <option value="CREDIT">Credit</option>
                                    <option value="DEBIT">Debit</option>
                                </select>
                            </label>
                        </div>

                        <div style={{ marginBottom: "0.75rem" }}>
                            <label>
                                <strong>Description:</strong>
                                <input
                                    type="text"
                                    value={txnDesc}
                                    onChange={(e) => setTxnDesc(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "0.5rem",
                                        marginTop: "0.25rem",
                                    }}
                                    placeholder="e.g. 'Recharge', 'Purchase', etc."
                                />
                            </label>
                        </div>

                        <button
                            type="submit"
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                background: "#388e3c",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                            }}
                            disabled={loading}
                        >
                            Submit Transaction
                        </button>
                    </form>

                    <button
                        onClick={() => navigate("/transactions")}
                        style={{
                            width: "100%",
                            padding: "0.75rem",
                            background: "#1976d2",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        View All Transactions
                    </button>
                </div>
            )}
        </div>
    );
}

export default Home;

