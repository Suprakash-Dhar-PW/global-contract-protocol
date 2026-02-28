require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Global Credit Protocol KYC Server Running 🚀");
});

// Mock KYC route
app.post("/api/kyc/verify", async (req, res) => {
  try {
    const { aadhaarNumber, walletAddress } = req.body;

    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({ error: "Invalid Aadhaar format" });
    }

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    const identityString = `IN-AADHAAR-${aadhaarNumber}`;
    const identityHash = ethers.keccak256(
      ethers.toUtf8Bytes(identityString)
    );

    return res.status(200).json({
      success: true,
      message: "Mock KYC verified",
      identityHash
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`KYC Server running on port ${PORT}`);
});