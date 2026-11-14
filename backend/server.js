
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const net = require("net");
const mongoose = require("mongoose");

const Connection = require("./models/Connection");

const app = express();

app.use(cors());
app.use(express.json());

// Regular Expression Validation

const hostnameRegex =
  /^(?=.{1,253}$)(?!-)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.(?!-)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const portRegex = /^[1-9][0-9]{0,4}$/;

function validateHostAndPort(host, port) {
  if (typeof host !== "string" || !host.trim()) {
    return false;
  }

  return (
    (hostnameRegex.test(host.trim()) ||
      net.isIP(host.trim()) !== 0) &&
    portRegex.test(String(port)) &&
    Number(port) <= 65535
  );
}

// FLAT - DFA Analysis

function analyzeDFA(status) {
  const transitionTable = [
    {
      currentState: "CLOSED",
      input: "Start Connection",
      nextState: "CONNECTING"
    },
    {
      currentState: "CONNECTING",
      input: "Connection Successful",
      nextState: "ESTABLISHED"
    },
    {
      currentState: "CONNECTING",
      input: "Connection Failed",
      nextState: "FAILED"
    }
  ];

  const finalState =
    status === "Success" ? "ESTABLISHED" : "FAILED";

  const input =
    status === "Success"
      ? "Connection Successful"
      : "Connection Failed";

  return {
    initialState: "CLOSED",
    finalState,
    input,
    transitions: ["CLOSED", "CONNECTING", finalState],
    transitionTable,
    result: status
  };
}

// Home Route

app.get("/", (req, res) => {
  res.send("TCP Failure Analysis Backend is Running!");
});

// TCP Connection Test

app.post("/api/test-connection", async (req, res) => {
  const { host, port } = req.body;

  if (!validateHostAndPort(host, port)) {
    return res.status(400).json({
      status: "Failed",
      message: "Invalid hostname or port"
    });
  }

  const socket = new net.Socket();
  let completed = false;

  const finish = async (status, message) => {
    if (completed) return;
    completed = true;

    socket.destroy();

    const result = {
      host: host.trim(),
      port: Number(port),
      status,
      message,
      time: new Date().toLocaleString(),
      flatAnalysis: analyzeDFA(status)
    };

    try {
      const savedConnection = await Connection.create(result);
      res.json(savedConnection);
    } catch (error) {
      console.error("MongoDB Save Error:", error.message);

      res.status(500).json({
        status: "Error",
        message: "Connection tested, but history could not be saved"
      });
    }
  };

  socket.setTimeout(5000);

  socket.connect(Number(port), host.trim(), () => {
    finish("Success", "TCP connection established");
  });

  socket.on("error", (error) => {
    finish("Failed", error.message);
  });

  socket.on("timeout", () => {
    finish("Failed", "Connection timeout");
  });
});

// Get Connection History from MongoDB

app.get("/api/history", async (req, res) => {
  try {
    const history = await Connection.find().sort({ _id: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch connection history"
    });
  }
});

// Clear Connection History

app.delete("/api/history", async (req, res) => {
  try {
    await Connection.deleteMany({});

    res.json({
      message: "Connection history cleared"
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to clear connection history"
    });
  }
});

// Connect MongoDB and Start Server

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB Connection Failed:", error.message);
  });
