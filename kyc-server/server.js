const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config({ path: '../.env' }); // Adjust if .env is higher up

const app = express();
app.use(express.json());
app.use(cors());

// Contract configuration
const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545');
// In a real environment, load securely. Here using from .env or fallback for setup
let privateKey = process.env.PRIVATE_KEY;
if (!privateKey || privateKey === 'your_private_key_here' || privateKey === '0xyour_private_key_here') {
  privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
}
const wallet = new ethers.Wallet(privateKey, provider);


// Use ABI for the IdentityRegistry contract
const IdentityRegistryABI = [
  "function verifyIdentity(address user, bytes32 identityHash) external",
  "function isVerified(address user) external view returns (bool)"
];
const registryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
// NOTE: Will fail gracefully if contract not deployed yet
const identityRegistryContract = new ethers.Contract(registryAddress || ethers.ZeroAddress, IdentityRegistryABI, wallet);

app.post('/api/kyc/verify', async (req, res) => {
  try {
    const { aadhaarNumber, walletAddress } = req.body;

    // Mock Aadhaar validation (12 digits)
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({ error: "Invalid Mock Aadhaar number format. Must be 12 digits." });
    }

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: "Invalid EVM wallet address." });
    }

    // Hash the identity to preserve privacy on-chain
    const identityString = `IN-AADHAAR-${aadhaarNumber}`;
    const identityHash = ethers.keccak256(ethers.toUtf8Bytes(identityString));

    if (registryAddress) {
      // Check if already verified
      const isVerified = await identityRegistryContract.isVerified(walletAddress);
      if (isVerified) {
        return res.status(200).json({
          success: true,
          message: "Welcome back, wallet was already verified on-chain",
          identityHash: identityHash
        });
      }

      // Send transaction
      const tx = await identityRegistryContract.verifyIdentity(walletAddress, identityHash);
      await tx.wait(); // wait for confirmation

      return res.status(200).json({
        success: true,
        message: "KYC verified successfully",
        txHash: tx.hash,
        identityHash: identityHash
      });
    } else {
      // Mock response if contract not setup yet
      return res.status(200).json({
        success: true,
        message: "KYC verified locally (Contract not yet configured)",
        identityHash: identityHash
      });
    }

  } catch (error) {
    console.error("KYC Verification Error:", error);
    res.status(500).json({ error: "Failed to complete KYC verification", details: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`KYC Server running on port ${PORT}`);
});
