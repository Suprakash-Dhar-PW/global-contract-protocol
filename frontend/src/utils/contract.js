import HybridLending from "../../../backend/artifacts/contracts/HybridLending.sol/HybridLending.json";
import { ethers } from 'ethers';

export const IDENTITY_REGISTRY_ABI = [
  "function isVerified(address user) external view returns (bool)"
];

export const CREDIT_SCORE_ABI = [
  "function getScore(address user) external view returns (uint256)"
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function mint(address to, uint256 amount) external"
];

export const HYBRID_LENDING_ABI = [
  "function getRiskParameters(address user) public view returns (uint256, uint256, uint256, uint256)",
  "function calculateMaxBorrow(address user, uint256 collateralValue) public view returns (uint256)",
  "function borrow(uint256 borrowAmount) external payable",
  "function repay() external",
  "function repayPartial(uint256 amount) external",
  "function getLatestBnbPrice() public view returns (uint256)",
  "function getHealthFactor(address user) public view returns (uint256)",
  "function getUserLoan(address user) external view returns (tuple(uint256 collateralAmount, uint256 debtAmount, uint40 timestamp, uint40 dueDate, bool isActive))",
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 shares) external",
  "function lenderShares(address) external view returns (uint256)",
  "function getTotalPoolValue() public view returns (uint256)",
  "function totalShares() public view returns (uint256)",
  "function borrowToken() public view returns (address)"
];

// Provide your actual deployed contract addresses here
export const getContracts = (signer) => {
  const lendingAddress = import.meta.env.VITE_HYBRID_LENDING || ethers.ZeroAddress;
  const identityAddress = import.meta.env.VITE_IDENTITY_REGISTRY || ethers.ZeroAddress;
  const scoreAddress = import.meta.env.VITE_CREDIT_SCORE || ethers.ZeroAddress;

  const mUSDAddress = import.meta.env.VITE_MUSD;
  if (!mUSDAddress) {
    console.error("VITE_MUSD environment variable is not defined.");
  }

  return {
    identityContract: new ethers.Contract(identityAddress, IDENTITY_REGISTRY_ABI, signer),
    scoreContract: new ethers.Contract(scoreAddress, CREDIT_SCORE_ABI, signer),
    lendingContract: new ethers.Contract(
      lendingAddress,
      HybridLending.abi,
      signer
    ),
    mUSDContract: mUSDAddress ? new ethers.Contract(mUSDAddress, ERC20_ABI, signer) : null
  };
}
