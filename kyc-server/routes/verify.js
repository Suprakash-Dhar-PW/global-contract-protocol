const express = require('express');
const router = express.Router();
const aadhaarVerifier = require('../services/aadhaarVerifier');

router.post('/', async (req, res) => {
  try {
    const { aadhaarNumber, walletAddress } = req.body;
    const result = await aadhaarVerifier.verifyAndMint(aadhaarNumber, walletAddress);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to complete KYC verification" });
  }
});

module.exports = router;
