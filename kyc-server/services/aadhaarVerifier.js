const { ethers } = require('ethers');

// In a real environment, load securely. Here using from .env or fallback for setup
const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545');

let privateKey = process.env.PRIVATE_KEY;
if (!privateKey || privateKey === 'your_private_key_here' || privateKey === '0xyour_private_key_here') {
  privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
}
const wallet = new ethers.Wallet(privateKey, provider);

const IdentityRegistryABI = [
  "function verifyIdentity(address user, bytes32 identityHash) external",
  "function isVerified(address user) external view returns (bool)"
];

const registryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
const identityRegistryContract = new ethers.Contract(registryAddress || ethers.ZeroAddress, IdentityRegistryABI, wallet);

module.exports = {
  async verifyAndMint(aadhaarNumber, walletAddress) {
    // Mock Aadhaar validation (12 digits)
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      throw new Error("Invalid Mock Aadhaar number format. Must be 12 digits.");
    }

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      throw new Error("Invalid EVM wallet address.");
    }

    const identityString = `IN-AADHAAR-${aadhaarNumber}`;
    const identityHash = ethers.keccak256(ethers.toUtf8Bytes(identityString));

    if (registryAddress) {
      const isVerified = await identityRegistryContract.isVerified(walletAddress);
      if (isVerified) {
        throw new Error("Wallet already verified.");
      }

      // Send transaction
      const tx = await identityRegistryContract.verifyIdentity(walletAddress, identityHash);
      await tx.wait(); // wait for confirmation

      return {
        success: true,
        message: "KYC verified successfully",
        txHash: tx.hash,
        identityHash: identityHash
      };
    } else {
      // Mock response if contract not setup yet
      return {
        success: true,
        message: "KYC verified locally (Contract not yet configured)",
        identityHash: identityHash
      };
    }
  }
};
