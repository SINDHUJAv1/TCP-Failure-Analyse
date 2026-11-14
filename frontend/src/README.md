# TCP Failure Analysis System

## Project Overview
TCP Failure Analysis System is a full-stack web application designed to test TCP connections using a hostname or IP address and port number. It identifies successful and failed connection attempts, stores connection history in MongoDB, and provides connection analysis through a dashboard.

## Objectives
- Test TCP connections between a client and a server.
- Identify successful and failed connection attempts.
- Store connection details in MongoDB.
- Analyze connection states using a DFA model.
- Generate downloadable PDF reports.

## Technologies Used

**Frontend**
- React.js
- HTML
- CSS
- JavaScript

**Backend**
- Node.js
- Express.js

**Database**
- MongoDB Atlas
- Mongoose

**Other Tools**
- Visual Studio Code
- Git and GitHub
- jsPDF

## Key Features
1. TCP Connection Testing
2. Success and Failure Detection
3. Connection Status Dashboard
4. Connection History Management
5. MongoDB Data Storage
6. FLAT-based DFA State Analysis
7. PDF Report Generation

## FLAT Concept
The project uses a Deterministic Finite Automaton (DFA) model to represent TCP connection states.

- CLOSED
- CONNECTING
- ESTABLISHED
- FAILED

The system represents transitions based on the TCP connection result.

## Project Structure

```text
TCP-Failure-Analyser/
├── backend/
│   ├── models/
│   │   └── Connection.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   └── package.json
├── .gitignore
├── package.json
└── README.md
```

## Installation and Execution

### 1. Clone the Repository

```bash
git clone https://github.com/SINDHUJAv1/TCP-Failure-Analyse.git
cd TCP-Failure-Analyser
```

### 2. Start the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder and add your MongoDB connection string:

```env
MONGO_URI=your_mongodb_connection_string
```

Start the backend:

```bash
node server.js
```

### 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend URL displayed in the terminal, usually:

http://localhost:5173/

## GitHub Repository

https://github.com/SINDHUJAv1/TCP-Failure-Analyse

## Future Enhancements
- Advanced TCP failure diagnostics.
- Real-time connection monitoring.
- Improved network performance analysis.
- Detailed connection analytics.