const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ----------------------
// 🔗 Blockchain Setup
// ----------------------
const provider = new ethers.JsonRpcProvider(
  process.env.BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545'
);

const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error("❌ PRIVATE_KEY not set in environment variables");
}

const wallet = new ethers.Wallet(privateKey, provider);

// ----------------------
// 📜 Contract Setup
// ----------------------
const IdentityRegistryABI = [
  "function verifyIdentity(address user, bytes32 identityHash) external",
  "function isVerified(address user) external view returns (bool)"
];

const registryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;

if (!registryAddress) {
  console.warn("⚠️ IDENTITY_REGISTRY_ADDRESS not set. Running in mock mode.");
}

const identityRegistryContract = new ethers.Contract(
  registryAddress || ethers.ZeroAddress,
  IdentityRegistryABI,
  wallet
);

// ----------------------
// 🧪 Health Check Route
// ----------------------
app.get("/", (req, res) => {
  res.send("🚀 KYC Server is running");
});

// ----------------------
// 🔐 KYC Verification API
// ----------------------
app.post('/api/kyc/verify', async (req, res) => {
  try {
    const { aadhaarNumber, walletAddress } = req.body;

    // ✅ Validate Aadhaar (mock)
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({
        error: "Invalid Aadhaar number. Must be exactly 12 digits."
      });
    }

    // ✅ Validate wallet address
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        error: "Invalid wallet address."
      });
    }

    // 🔒 Create hashed identity (privacy-safe)
    const identityString = `IN-AADHAAR-${aadhaarNumber}`;
    const identityHash = ethers.keccak256(
      ethers.toUtf8Bytes(identityString)
    );

    // ----------------------
    // 🧠 Smart Contract Flow
    // ----------------------
    if (registryAddress) {
      // Check if already verified
      const isVerified = await identityRegistryContract.isVerified(walletAddress);

      if (isVerified) {
        return res.status(200).json({
          success: true,
          message: "✅ Already verified on-chain",
          identityHash
        });
      }

      // 🔥 Send transaction
      const tx = await identityRegistryContract.verifyIdentity(
        walletAddress,
        identityHash
      );

      console.log("⏳ Sending transaction:", tx.hash);

      await tx.wait(); // wait for confirmation

      return res.status(200).json({
        success: true,
        message: "✅ KYC verified successfully on-chain",
        txHash: tx.hash,
        identityHash
      });

    } else {
      // ⚠️ Mock fallback (if contract not set)
      return res.status(200).json({
        success: true,
        message: "⚠️ KYC verified locally (no contract configured)",
        identityHash
      });
    }

  } catch (error) {
    console.error("❌ KYC Verification Error:", error);

    return res.status(500).json({
      error: "KYC verification failed",
      details: error.message
    });
  }
});

// ----------------------
// 🚀 Start Server
// ----------------------
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 KYC Server running on port ${PORT}`);
});