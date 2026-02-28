import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // -----------------------------
  // 1️⃣ Deploy IdentityRegistry
  // -----------------------------
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(deployer.address);
  await identityRegistry.waitForDeployment();
  const identityAddress = await identityRegistry.getAddress();
  console.log("IdentityRegistry:", identityAddress);

  // -----------------------------
  // 2️⃣ Deploy CreditScore
  // -----------------------------
  const CreditScore = await ethers.getContractFactory("CreditScore");
  const creditScore = await CreditScore.deploy(deployer.address);
  await creditScore.waitForDeployment();
  const creditAddress = await creditScore.getAddress();
  console.log("CreditScore:", creditAddress);

  // -----------------------------
  // 3️⃣ Deploy MockToken (Your Version)
  // -----------------------------
  const MockToken = await ethers.getContractFactory("MockToken");
  const mockToken = await MockToken.deploy(
    "MockUSD",
    "mUSD",
    18
  );
  await mockToken.waitForDeployment();
  const tokenAddress = await mockToken.getAddress();
  console.log("MockToken:", tokenAddress);

  // Mint some tokens to deployer for liquidity
  const mintTx = await mockToken.mint(
    deployer.address,
    ethers.parseUnits("1000000", 18)
  );
  await mintTx.wait();
  console.log("Minted 1,000,000 mUSD to deployer");

  // -----------------------------
  // 4️⃣ BNB/USD Oracle (BSC Testnet)
  // -----------------------------
  // Official BNB/USD Oracle on BSC Testnet (Decimals: 8)
const BNB_USD_ORACLE = ethers.getAddress(
  "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526"
);

  // -----------------------------
  // 5️⃣ Deploy HybridLending
  // -----------------------------
  const HybridLending = await ethers.getContractFactory("HybridLending");
  const hybrid = await HybridLending.deploy(
    identityAddress,
    creditAddress,
    tokenAddress,
    BNB_USD_ORACLE,
    deployer.address
  );

  await hybrid.waitForDeployment();
  const hybridAddress = await hybrid.getAddress();
  console.log("HybridLending:", hybridAddress);

  // -----------------------------
  // 6️⃣ Grant SCORER_ROLE
  // -----------------------------
  const SCORER_ROLE = await creditScore.SCORER_ROLE();
  const grantTx = await creditScore.grantRole(SCORER_ROLE, hybridAddress);
  await grantTx.wait();
  console.log("SCORER_ROLE granted");

  // --- SAVE ADDRESSES ---
  const fs = require("fs");
  const path = require("path");

  const rootEnvPath = path.join(__dirname, "../../.env");
  const frontendEnvPath = path.join(__dirname, "../../frontend/.env");

  let rootEnv = fs.existsSync(rootEnvPath) ? fs.readFileSync(rootEnvPath, "utf8") : "";
  rootEnv = rootEnv.replace(/IDENTITY_REGISTRY_ADDRESS=.*\n?/, `IDENTITY_REGISTRY_ADDRESS=${identityAddress}\n`);
  rootEnv = rootEnv.replace(/CREDIT_SCORE_ADDRESS=.*\n?/, `CREDIT_SCORE_ADDRESS=${creditAddress}\n`);
  rootEnv = rootEnv.replace(/HYBRID_LENDING_ADDRESS=.*\n?/, `HYBRID_LENDING_ADDRESS=${hybridAddress}\n`);
  rootEnv = rootEnv.replace(/BORROW_TOKEN_ADDRESS=.*\n?/, `BORROW_TOKEN_ADDRESS=${tokenAddress}\n`);
  
  if (!rootEnv.includes("IDENTITY_REGISTRY_ADDRESS=")) {
      rootEnv += `\nIDENTITY_REGISTRY_ADDRESS=${identityAddress}\n`;
      rootEnv += `CREDIT_SCORE_ADDRESS=${creditAddress}\n`;
      rootEnv += `HYBRID_LENDING_ADDRESS=${hybridAddress}\n`;
      rootEnv += `BORROW_TOKEN_ADDRESS=${tokenAddress}\n`;
  }
  fs.writeFileSync(rootEnvPath, rootEnv);

  let frontendEnv = fs.existsSync(frontendEnvPath) ? fs.readFileSync(frontendEnvPath, "utf8") : "";
  frontendEnv = frontendEnv.replace(/VITE_IDENTITY_REGISTRY=.*\n?/, `VITE_IDENTITY_REGISTRY=${identityAddress}\n`);
  frontendEnv = frontendEnv.replace(/VITE_CREDIT_SCORE=.*\n?/, `VITE_CREDIT_SCORE=${creditAddress}\n`);
  frontendEnv = frontendEnv.replace(/VITE_HYBRID_LENDING=.*\n?/, `VITE_HYBRID_LENDING=${hybridAddress}\n`);
  
  if (!frontendEnv.includes("VITE_IDENTITY_REGISTRY=")) {
      frontendEnv += `\nVITE_IDENTITY_REGISTRY=${identityAddress}\n`;
      frontendEnv += `VITE_CREDIT_SCORE=${creditAddress}\n`;
      frontendEnv += `VITE_HYBRID_LENDING=${hybridAddress}\n`;
  }
  fs.writeFileSync(frontendEnvPath, frontendEnv);

  console.log("\n✅ Deployment Complete. Saved to .env files.\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});