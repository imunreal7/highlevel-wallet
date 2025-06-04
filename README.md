# HighLevel Wallet System

This repository implements a **Wallet System** using the **MERN** stack (MongoDB, Express, React, Node.js). It includes a backend REST API and a frontend React application.

---

## DEMO

[![Demo Video](/frontend/public/Wallet-demo.png)](https://youtu.be/RQ5bPIV9Yh0)

---

## 🌐 Deployed on

Frontend (Vercel): <https://highlevel-wallet-ruddy.vercel.app/>

Backend (Render): <https://highlevel-wallet-80vq.onrender.com>

---

## Table of Contents

1. [Project Setup](#project-setup)
   a. [Backend Setup](#backend-setup)
   b. [Frontend Setup](#frontend-setup)
2. [Database & Query Design](#database--query-design)
3. [API Endpoints](#api-endpoints)
    - [1. Initialize Wallet (POST /setup)](#1-initialize-wallet-post-setup)
    - [2. Credit/Debit Transaction (POST /transact/:walletId)](#2-creditdebit-transaction-post-transactwalletid)
    - [3. Fetch Transactions (GET /transactions)](#3-fetch-transactions-get-transactions)
    - [4. Get Wallet Details (GET /wallet/:id)](#4-get-wallet-details-get-walletid)
4. [Frontend Pages](#frontend-pages)
5. [Deployment](#deployment)

---

## Project Setup

### Backend Setup

1. **Prerequisites**:

    - Node.js (v14 or newer)
    - npm (v6 or newer)
    - MongoDB instance (local or hosted on Atlas)

2. **Clone the repository**:

    ```bash
    git clone https://github.com/imunreal7/highlevel-wallet
    cd highlevel-wallet/backend
    ```

3. **Install dependencies**:

    ```bash
    npm install
    ```

4. **Environment Variables**:
   Create a `.env` file in `backend/` with:

    ```env
    PORT=4000
    MONGO_URI=<your-mongodb-connection-string> or 'mongodb://localhost:27017/highlevel-wallet'
    ```

    - `MONGO_URI` example (Atlas):
      `mongodb+srv://<user>:<password>@cluster0.mongodb.net/highlevel_wallet?retryWrites=true&w=majority`

5. **Start the server**:

    ```bash
    npm run dev
    ```

    The backend will run on `http://localhost:4000`.

### Frontend Setup

1. **Prerequisites**:

    - Node.js (v14 or newer)
    - npm (v6 or newer)

2. **Navigate to frontend**:

    ```bash
    cd ../frontend
    ```

3. **Install dependencies**:

    ```bash
    npm install
    ```

4. **Environment Variables**:
   Create a `.env` file in `frontend/` (optional) with:

    ```env
    REACT_APP_API_BASE=http://localhost:4000
    ```

    - If omitted, the default `API_BASE` in code is `http://localhost:4000`.

5. **Start the React dev server**:

    ```bash
    npm start
    ```

    The frontend will run on `http://localhost:3000`.

---

## Database & Query Design

-   **Database**: MongoDB
-   **Collections**:

    1. **`wallets`**

        - **Schema** (`Wallet`):
            - `_id`: ObjectId (auto-generated)
            - `name`: String (user-provided, required)
            - `balance`: Decimal128 (4-decimal precision)
            - `createdAt`: Date (default: now)
        - **Notes**:
            - We use MongoDB’s `Decimal128` to store balances with exactly 4 decimal places, avoiding JavaScript floating-point inaccuracies.
            - We define a `virtual` field `id` to return `_id` as a string in API JSON.

    2. **`transactions`**
        - **Schema** (`Transaction`):
            - `_id`: ObjectId (auto-generated)
            - `walletId`: ObjectId (reference to the `Wallet`)
            - `amount`: Decimal128 (4-decimal precision; positive → credit, negative → debit)
            - `balance`: Decimal128 (wallet balance immediately after this transaction)
            - `description`: String
            - `date`: Date (default: now)
            - `type`: String (`CREDIT` or `DEBIT`)
        - **Notes**:
            - Each transaction records the running balance, so fetching history requires no additional calculations.
            - We do not use multi-document transactions (requires replica set). Instead, we `findOneAndUpdate` the wallet’s balance and then immediately insert the transaction document.
            - In the rare case a debit would take balance negative, we revert the `$inc` and throw an error to keep consistency.

-   **Query Patterns**:
    -   **Initialize Wallet**:
        -   `insertOne` into `wallets`, then `insertOne` into `transactions` with `type = 'CREDIT'`.
    -   **Credit/Debit**:
        -   `findOneAndUpdate` on `wallets` with `$inc` on `balance` (atomic at document‐level).
        -   If new `balance < 0` (and negative not allowed), revert via `$inc` and error.
        -   `insertOne` into `transactions`.
    -   **Fetch Transactions**:
        -   `find({ walletId })` with `.sort({ date: -1 })`, `.skip(skip)`, `.limit(limit)` for pagination.
    -   **Get Wallet**:
        -   `findById(id)` to fetch basic details.

---

## API Endpoints

### 1. Initialize Wallet (POST /setup)

-   **URL**: `/setup`
-   **Method**: `POST`
-   **Body** (JSON):

    ```json
    {
        "balance": 20.5612,
        "name": "Hello world"
    }
    ```

    -   `balance`: Number (optional if omitted, defaults to 0). Up to 4 decimal places.
    -   `name`: String (required).

-   **Response**: `200 OK`

    ```json
    {
        "id": "60f3c2a9bde1234567890abc",
        "balance": 20.5612,
        "transactionId": "60f3c2bbbde1234567890abd",
        "name": "Hello world",
        "date": "2025-06-04T11:00:00.000Z"
    }
    ```

-   **Errors**:
    -   `400 Bad Request` if `name` missing/empty or `balance` invalid.
    -   `500 Internal Server Error` on other issues.

---

### 2. Credit/Debit Transaction (POST /transact/:walletId)

-   **URL**: `/transact/:walletId`
-   **Method**: `POST`
-   **Path Params**:

    -   `walletId`: string (`ObjectId`)

-   **Body** (JSON):

    ```json
    {
        "amount": 2.4,
        "description": "Recharge"
    }
    ```

    -   `amount`: Number (positive → credit, negative → debit). Up to 4 decimal places.
    -   `description`: String (optional).

-   **Response**: `200 OK`

    ```json
    {
        "balance": 22.9612,
        "transactionId": "60f3c2d7bde1234567890abe"
    }
    ```

-   **Errors**:

    -   `400 Bad Request` if:
        -   `walletId` invalid,
        -   `amount` zero or invalid,
        -   debit would cause negative balance (`Insufficient funds`).
    -   `404 Not Found` if wallet does not exist.
    -   `500 Internal Server Error` on other issues.

-   **Sample curl**:

    ```bash
    curl "http://localhost:4000/transact/60f3c2a9bde1234567890abc"     -H "Content-Type: application/json"     -d '{"amount": 2.4, "description":"Recharge"}'
    ```

---

### 3. Fetch Transactions (GET /transactions)

-   **URL**: `/transactions`
-   **Method**: `GET`
-   **Query Params**:

    -   `walletId`: string (required, `ObjectId`)
    -   `skip`: integer (optional, default = 0)
    -   `limit`: integer (optional, default = 10)

-   **Response**: `200 OK`

    ```json
    [
        {
            "id": "60f3c2d7bde1234567890abe",
            "walletId": "60f3c2a9bde1234567890abc",
            "amount": 2.4,
            "balance": 22.9612,
            "description": "Recharge",
            "date": "2025-06-04T11:05:00.000Z",
            "type": "CREDIT"
        },
        {
            "id": "60f3c2bbbde1234567890abd",
            "walletId": "60f3c2a9bde1234567890abc",
            "amount": 20.5612,
            "balance": 20.5612,
            "description": "Setup",
            "date": "2025-06-04T11:00:00.000Z",
            "type": "CREDIT"
        }
    ]
    ```

-   **Errors**:

    -   `400 Bad Request` if `walletId` missing/invalid, or `skip`/`limit` not valid integers.
    -   `404 Not Found` if wallet does not exist.
    -   `500 Internal Server Error` on other issues.

-   **Sample curl**:

    ```bash
    curl "http://localhost:4000/transactions?walletId=60f3c2a9bde1234567890abc&skip=0&limit=10"
    ```

---

### 4. Get Wallet Details (GET /wallet/:id)

-   **URL**: `/wallet/:id`
-   **Method**: `GET`
-   **Path Params**:

    -   `id`: string (`ObjectId`)

-   **Response**: `200 OK`

    ```json
    {
        "id": "60f3c2a9bde1234567890abc",
        "balance": 22.9612,
        "name": "Hello world",
        "date": "2025-06-04T11:00:00.000Z"
    }
    ```

-   **Errors**:

    -   `400 Bad Request` if `id` invalid.
    -   `404 Not Found` if wallet does not exist.
    -   `500 Internal Server Error` on other issues.

-   **Sample curl**:

    ```bash
    curl http://localhost:4000/wallet/60f3c2a9bde1234567890abc
    ```

---

## Frontend Pages

1. **Home (Dashboard)** (`/`)

    - If no `walletId` in `localStorage`:
        - Show a form for **Name** (required) and **Initial Balance** (optional).
        - On submit, calls **POST /setup**.
    - If `walletId` exists:
        - Fetches **GET /wallet/:id** → displays **name** and **balance** (4 decimals).
        - Shows a form for **New Transaction**:
            - Amount (step=0.0001), Type (Credit/Debit), Description.
            - On submit, calls **POST /transact/:walletId**.
            - Updates displayed balance.
        - “View All Transactions” button → navigates to `/transactions`.

2. **Transactions** (`/transactions`)
    - Reads `walletId` from `localStorage`. If missing, redirects to `/`.
    - Fetches **GET /wallet/:id** → displays **name** and **current balance**.
    - Fetches **GET /transactions?walletId={id}&skip={skip}&limit={limit}**:
        - Default `skip=0`, `limit=10`.
        - Displays a **table**: Date, Type, Amount, Balance, Description.
        - **Pagination**: “Previous” / “Next” buttons adjust `skip`. Disabled appropriately.
        - **Sorting**: Controls to sort by Date or Amount (asc/desc). Client-side `Array.sort`.
        - **Export All CSV**: Fetches all transactions in chunks of 50, concatenates, applies current sort, and triggers CSV download with PapaParse.

---

## Deployment

-   **Backend**:
    1. Provision MongoDB (e.g. Atlas).
    2. Set environment variables:
        - `MONGO_URI` = `<your Atlas connection string>`
        - `PORT` = `4000`
    3. Deploy to Heroku (or similar).
-   **Frontend**:
    1. Build (`npm run build`) with correct `REACT_APP_API_BASE`.
    2. Deploy to Netlify, Vercel, or similar.

---

Thank you for reviewing this implementation!

