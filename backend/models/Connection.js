
const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  message: {
    type: String
  },
  time: {
    type: String
  },
  flatAnalysis: {
    initialState: String,
    finalState: String,
    input: String,
    transitions: [String],
    transitionTable: [
      {
        currentState: String,
        input: String,
        nextState: String
      }
    ],
    result: String
  }
});

module.exports = mongoose.model("Connection", connectionSchema);
