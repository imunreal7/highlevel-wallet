import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTransactions, getWallet } from "../utils/api";
import Papa from "papaparse";

function Transactions() {
    const navigate = useNavigate();
    const [walletId, setWalletId] = useState("");
    const [walletName, setWalletName] = useState("");
    const [walletBalance, setWalletBalance] = useState(null);

    const [transactions, setTransactions] = useState([]);
    const [skip, setSkip] = useState(0);
    const [limit] = useState(10);

    const [sortField, setSortField] = useState("date"); // 'date' or 'amount'
    const [sortOrder, setSortOrder] = useState("desc"); // 'asc' or 'desc'

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // On mount: read walletId from localStorage
    useEffect(() => {
        const id = localStorage.getItem("walletId");
        if (!id) {
            navigate("/"); // no wallet → go back to Home
            return;
        }
        setWalletId(id);
    }, [navigate]);

    // Once walletId is known, fetch basic wallet info
    useEffect(() => {
        async function fetchWalletInfo() {
            if (!walletId) return;
            setLoading(true);
            try {
                const resp = await getWallet(walletId);
                setWalletName(resp.data.name);
                setWalletBalance(resp.data.balance);
            } catch (err) {
                console.error(err);
                setErrorMsg(err.response?.data?.message || "Failed to load wallet info");
                if (err.response?.status === 404) {
                    localStorage.removeItem("walletId");
                    navigate("/");
                }
            } finally {
                setLoading(false);
            }
        }
        fetchWalletInfo();
    }, [walletId, navigate]);

    // Whenever walletId, skip, or limit changes, fetch a page of transactions
    useEffect(() => {
        async function fetchTxns() {
            if (!walletId) return;
            setLoading(true);
            setErrorMsg("");
            try {
                const resp = await getTransactions(walletId, skip, limit);
                let data = resp.data;

                // Client-side sorting (because API always returns sorted by date desc)
                data.sort((a, b) => {
                    if (sortField === "date") {
                        const da = new Date(a.date).getTime();
                        const db = new Date(b.date).getTime();
                        return sortOrder === "asc" ? da - db : db - da;
                    } else if (sortField === "amount") {
                        return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
                    }
                    return 0;
                });

                setTransactions(data);
            } catch (err) {
                console.error(err);
                setErrorMsg(err.response?.data?.message || "Failed to load transactions");
            } finally {
                setLoading(false);
            }
        }
        fetchTxns();
    }, [walletId, skip, limit, sortField, sortOrder]);

    // Pagination controls
    const handleNext = () => {
        setSkip((prev) => prev + limit);
    };
    const handlePrev = () => {
        setSkip((prev) => (prev - limit >= 0 ? prev - limit : 0));
    };

    // Handle sort toggles
    const toggleSort = (field) => {
        if (sortField === field) {
            // Flip order
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            // Switch to a new field, default to desc
            setSortField(field);
            setSortOrder("desc");
        }
    };

    // Export CSV
    const handleExportAllCSV = async () => {
        if (!walletId) return;
        setLoading(true);
        setErrorMsg("");
        try {
            let allTxns = [];
            let pageSkip = 0;
            const pageLimit = 50; // fetch 50 at a time to minimize requests
            while (true) {
                const resp = await getTransactions(walletId, pageSkip, pageLimit);
                const chunk = resp.data;
                if (chunk.length === 0) break;
                allTxns = allTxns.concat(chunk);
                if (chunk.length < pageLimit) break;
                pageSkip += pageLimit;
            }
            // sort the full array by current sortField & sortOrder
            allTxns.sort((a, b) => {
                if (sortField === "date") {
                    const da = new Date(a.date).getTime();
                    const db = new Date(b.date).getTime();
                    return sortOrder === "asc" ? da - db : db - da;
                } else {
                    return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
                }
            });

            // Convert to CSV via Papa
            const csv = Papa.unparse(
                allTxns.map((t) => ({
                    id: t.id,
                    walletId: t.walletId,
                    amount: t.amount.toFixed(4),
                    balance: t.balance.toFixed(4),
                    description: t.description,
                    date: new Date(t.date).toISOString(),
                    type: t.type,
                })),
            );
            // Trigger download
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `transactions_${walletId}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            setErrorMsg("Failed to export CSV");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "1rem" }}>
            <button
                onClick={() => navigate("/")}
                style={{
                    marginBottom: "1rem",
                    padding: "0.5rem 1rem",
                    background: "#757575",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                }}
            >
                ← Back to Dashboard
            </button>

            <h1 style={{ textAlign: "center" }}>Transactions</h1>

            {errorMsg && <div style={{ color: "red", marginBottom: "1rem" }}>{errorMsg}</div>}
            {loading && <div style={{ marginBottom: "1rem" }}>Loading…</div>}

            {/* Wallet Info */}
            {walletName && (
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
                        <strong>Current Balance:</strong>{" "}
                        {walletBalance !== null ? walletBalance.toFixed(4) : "—"}
                    </p>
                </div>
            )}

            {/* Controls: Sort, Export CSV */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                {/* Sort Buttons */}
                <div>
                    <span style={{ marginRight: "0.5rem" }}>Sort by:</span>
                    <button
                        onClick={() => toggleSort("date")}
                        style={{
                            padding: "0.3rem 0.6rem",
                            marginRight: "0.5rem",
                            background: sortField === "date" ? "#1976d2" : "#e0e0e0",
                            color: sortField === "date" ? "white" : "black",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Date {sortField === "date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </button>
                    <button
                        onClick={() => toggleSort("amount")}
                        style={{
                            padding: "0.3rem 0.6rem",
                            background: sortField === "amount" ? "#1976d2" : "#e0e0e0",
                            color: sortField === "amount" ? "white" : "black",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Amount {sortField === "amount" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </button>
                </div>

                {/* Export CSV */}
                <button
                    onClick={handleExportAllCSV}
                    style={{
                        padding: "0.5rem 1rem",
                        background: "#388e3c",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                    disabled={loading}
                >
                    Export All CSV
                </button>
            </div>

            {/* Transactions Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
                <thead style={{ background: "#eeeeee" }}>
                    <tr>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Type</th>
                        <th style={thStyle}>Amount</th>
                        <th style={thStyle}>Balance</th>
                        <th style={thStyle}>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.length === 0 && !loading ? (
                        <tr>
                            <td colSpan="5" style={{ textAlign: "center", padding: "1rem" }}>
                                No transactions found.
                            </td>
                        </tr>
                    ) : (
                        transactions.map((t) => (
                            <tr key={t.id} style={{ borderBottom: "1px solid #ddd" }}>
                                <td style={tdStyle}>{new Date(t.date).toLocaleString()}</td>
                                <td style={tdStyle}>{t.type}</td>
                                <td style={tdStyle}>{t.amount.toFixed(4)}</td>
                                <td style={tdStyle}>{t.balance.toFixed(4)}</td>
                                <td style={tdStyle}>{t.description}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Pagination Controls */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                    onClick={handlePrev}
                    disabled={skip === 0 || loading}
                    style={{
                        padding: "0.5rem 1rem",
                        background: skip === 0 ? "#e0e0e0" : "#1976d2",
                        color: skip === 0 ? "#9e9e9e" : "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: skip === 0 ? "default" : "pointer",
                    }}
                >
                    Previous
                </button>
                <span style={{ alignSelf: "center" }}>
                    Page: {Math.floor(skip / limit) + 1} &nbsp;|&nbsp; Showing {transactions.length}{" "}
                    item(s)
                </span>
                <button
                    onClick={handleNext}
                    disabled={transactions.length < limit || loading}
                    style={{
                        padding: "0.5rem 1rem",
                        background: transactions.length < limit ? "#e0e0e0" : "#1976d2",
                        color: transactions.length < limit ? "#9e9e9e" : "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: transactions.length < limit ? "default" : "pointer",
                    }}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

// Simple cell styles
const thStyle = {
    padding: "0.75rem",
    textAlign: "left",
    borderBottom: "2px solid #bbb",
};

const tdStyle = {
    padding: "0.5rem",
};

export default Transactions;

