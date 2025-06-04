import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setupWallet, getWallet, transact } from "../utils/api";

function Home() {
    const navigate = useNavigate();

    const [walletId, setWalletId] = useState(() => {
        return localStorage.getItem("walletId") || "";
    });
    const [walletName, setWalletName] = useState("");
    const [walletBalance, setWalletBalance] = useState(null);

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [fieldErrors, setFieldErrors] = useState({});

    const [initName, setInitName] = useState("");
    const [initBalance, setInitBalance] = useState("");

    const [txnAmount, setTxnAmount] = useState("");
    const [txnType, setTxnType] = useState("CREDIT"); // 'CREDIT' or 'DEBIT'
    const [txnDesc, setTxnDesc] = useState("");

    // Fetch wallet details whenever walletId changes
    useEffect(() => {
        async function fetchWallet() {
            if (!walletId) return;
            setLoading(true);
            setErrorMsg("");
            try {
                const resp = await getWallet(walletId);
                const { name, balance } = resp.data;
                setWalletName(name);
                setWalletBalance(balance);
            } catch (err) {
                console.error(err);
                const msg = err.response?.data?.message || "Failed to load wallet";
                setErrorMsg(msg);
                if (err.response?.status === 404) {
                    // If wallet not found, clear it and show init form
                    localStorage.removeItem("walletId");
                    setWalletId("");
                }
            } finally {
                setLoading(false);
            }
        }
        fetchWallet();
    }, [walletId]);

    // Validation for Initialize Wallet form
    const validateInitForm = () => {
        const errors = {};
        if (!initName.trim()) {
            errors.name = "Name is required";
        }
        if (initBalance !== "") {
            const balanceVal = Number(initBalance);
            if (isNaN(balanceVal) || balanceVal < 0) {
                errors.balance = "Balance must be a non-negative number";
            } else if (!/^\d+(\.\d{1,4})?$/.test(initBalance.toString())) {
                errors.balance = "Balance can have at most 4 decimal places";
            }
        }
        return errors;
    };

    const handleInitSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setFieldErrors({});

        const errors = validateInitForm();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
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
            localStorage.setItem("walletId", id);
            setWalletId(id);
            setWalletBalance(balance);
            setWalletName(name);
            // Clear init form
            setInitName("");
            setInitBalance("");
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || "Failed to initialize wallet";
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    // Validation for Transaction form
    const validateTxnForm = () => {
        const errors = {};
        if (!txnAmount) {
            errors.amount = "Amount is required";
        } else {
            const amtVal = Number(txnAmount);
            if (isNaN(amtVal) || amtVal === 0) {
                errors.amount = "Amount must be a non-zero number";
            } else if (!/^-?\d+(\.\d{1,4})?$/.test(txnAmount.toString())) {
                errors.amount = "Amount can have at most 4 decimal places";
            }
        }
        if (txnDesc && txnDesc.length > 100) {
            errors.description = "Description cannot exceed 100 characters";
        }
        return errors;
    };

    const handleTxnSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setFieldErrors({});

        const errors = validateTxnForm();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        const amtValue = parseFloat(txnAmount);
        const signedAmount = txnType === "DEBIT" ? -Math.abs(amtValue) : Math.abs(amtValue);
        const payload = {
            amount: signedAmount,
            description: txnDesc.trim(),
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
            const msg = err.response?.data?.message || "Failed to perform transaction";
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

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

            {/* Display any top-level error message */}
            {errorMsg && <div style={{ color: "red", marginBottom: "1rem" }}>{errorMsg}</div>}

            {loading && <div style={{ marginBottom: "1rem" }}>Loading…</div>}

            {!walletId ? (
                // --- Initialize Wallet Form ---
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
                            />
                        </label>
                        {fieldErrors.name && (
                            <div style={{ color: "red", marginTop: "0.25rem" }}>
                                {fieldErrors.name}
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: "0.75rem" }}>
                        <label>
                            <strong>Initial Balance (optional):</strong>
                            <input
                                type="text"
                                value={initBalance}
                                onChange={(e) => setInitBalance(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
                                placeholder="e.g. 10.0000 (defaults to 0)"
                            />
                        </label>
                        {fieldErrors.balance && (
                            <div style={{ color: "red", marginTop: "0.25rem" }}>
                                {fieldErrors.balance}
                            </div>
                        )}
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
                // --- Wallet Exists: Show Balance & Transaction Form ---
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
                                    type="text"
                                    value={txnAmount}
                                    onChange={(e) => setTxnAmount(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "0.5rem",
                                        marginTop: "0.25rem",
                                    }}
                                    placeholder="e.g. 5.0000"
                                />
                            </label>
                            {fieldErrors.amount && (
                                <div style={{ color: "red", marginTop: "0.25rem" }}>
                                    {fieldErrors.amount}
                                </div>
                            )}
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
                                    placeholder="Max 100 characters"
                                />
                            </label>
                            {fieldErrors.description && (
                                <div style={{ color: "red", marginTop: "0.25rem" }}>
                                    {fieldErrors.description}
                                </div>
                            )}
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

                    {/* Link to Transactions Page */}
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

