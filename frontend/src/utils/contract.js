import { ethers } from 'ethers';

export const IDENTITY_REGISTRY_ABI = [
  "function isVerified(address user) external view returns (bool)"
];

export const CREDIT_SCORE_ABI = [
  "function getScore(address user) external view returns (uint256)"
];

export const HYBRID_LENDING_ABI = [
  "function getRiskParameters(address user) public view returns (uint256, uint256, uint256, uint256)",
  "function calculateMaxBorrow(address user, uint256 collateralValue) public view returns (uint256)",
  "function borrow(uint256 borrowAmount) external payable",
  "function repay() external",
  "function getLatestBnbPrice() public view returns (uint256)",
  "function getHealthFactor(address user) public view returns (uint256)",
  "function getUserLoan(address user) external view returns (tuple(uint256 collateralAmount, uint256 borrowedAmount, uint256 debtAmount, uint256 timestamp, uint256 dueDate, bool isActive))"
];

// Provide your actual deployed contract addresses here
export const getContracts = (signer) => {
  return {
    identityContract: new ethers.Contract(import.meta.env.VITE_IDENTITY_REGISTRY || ethers.ZeroAddress, IDENTITY_REGISTRY_ABI, signer),
    scoreContract: new ethers.Contract(import.meta.env.VITE_CREDIT_SCORE || ethers.ZeroAddress, CREDIT_SCORE_ABI, signer),
    lendingContract: new ethers.Contract(import.meta.env.VITE_HYBRID_LENDING || ethers.ZeroAddress, HYBRID_LENDING_ABI, signer)
  };
}
