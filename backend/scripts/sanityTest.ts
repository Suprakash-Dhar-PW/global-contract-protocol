import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const identityRegistry = await ethers.getContractAt(
    "IdentityRegistry",
    process.env.IDENTITY_REGISTRY_ADDRESS!
  );
  const creditScore = await ethers.getContractAt(
    "CreditScore",
    process.env.CREDIT_SCORE_ADDRESS!
  );
  const hybridLending = await ethers.getContractAt(
    "HybridLending",
    process.env.HYBRID_LENDING_ADDRESS!
  );

  console.log("--- 1. MINT IDENTITY ---");
  const isVerified = await identityRegistry.isVerified(deployer.address);
  if (!isVerified) {
    console.log("Minting Identity NFT...");
    const tx = await identityRegistry.mintIdentity(deployer.address);
    await tx.wait();
    console.log("Identity minted.");
  } else {
    console.log("Identity already verified.");
  }

  console.log("--- 2. UPDATE SCORE ---");
  const scoreParams = await hybridLending.getRiskParameters(deployer.address);
  console.log(`Current Score Limit: ${ethers.formatEther(scoreParams.borrowLimit)}`);
  
  const txScore = await creditScore.updateScore(deployer.address, 900);
  await txScore.wait();
  console.log("Score updated to 900.");

  console.log("--- 3. FETCH PRICE & MACROS ---");
  const bnbPrice = await hybridLending.getLatestBnbPrice();
  console.log(`BNB Price: $${Number(bnbPrice) / 1e18}`);

  const collateralAmount = ethers.parseEther("0.01");
  console.log(`Simulating collateral value for 0.01 BNB...`);
  const maxBorrow = await hybridLending.calculateMaxBorrow(deployer.address, (collateralAmount * bnbPrice) / ethers.parseEther("1"));
  console.log(`Max Borrow: ${ethers.formatEther(maxBorrow)} mUSD`);

  const borrowAmount = ethers.parseEther("1");

  console.log("--- 4. BORROW ---");
  const loanBefore = await hybridLending.getUserLoan(deployer.address);
  if (!loanBefore.isActive) {
      console.log(`Borrowing 1 mUSD with 0.01 BNB...`);
      const txBorrow = await hybridLending.borrow(borrowAmount, { value: collateralAmount });
      await txBorrow.wait();
      console.log("Borrow successful!");
  } else {
      console.log("Loan already active, skipping borrow...");
  }

  const hf = await hybridLending.getHealthFactor(deployer.address);
  console.log(`Health Factor: ${ethers.formatEther(hf)}`);

  console.log("--- 5. CONFIRM THRESHOLDS ---");
  const riskHigh = await hybridLending.getRiskParameters(deployer.address);
  console.log(`At score 900 - Liq Threshold: ${Number(riskHigh.liquidationThresholdBps)/100}%`);
  
  const txScoreLow = await creditScore.updateScore(deployer.address, 300);
  await txScoreLow.wait();
  console.log("Score dropped to 300.");

  const riskLow = await hybridLending.getRiskParameters(deployer.address);
  console.log(`At score 300 - Liq Threshold: ${Number(riskLow.liquidationThresholdBps)/100}%`);

  const hfLow = await hybridLending.getHealthFactor(deployer.address);
  console.log(`Health Factor after score drop: ${ethers.formatEther(hfLow)}`);
  console.log("Sanity test complete.");
}

main().catch((error) => {
  console.log("SANITY TEST ERROR: ", error.message ? error.message : error);
});
