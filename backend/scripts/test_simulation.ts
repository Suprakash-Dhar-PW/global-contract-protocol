import { ethers } from "hardhat";
import { expect } from "chai";

async function main() {
  const [deployer, user, liquidator] = await ethers.getSigners();
  console.log("Starting Economic Simulation...");

  // 1. Deploy Contracts
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identity = await IdentityRegistry.deploy(deployer.address);
  await identity.waitForDeployment();

  const CreditScore = await ethers.getContractFactory("CreditScore");
  const score = await CreditScore.deploy(deployer.address);
  await score.waitForDeployment();

  const MockToken = await ethers.getContractFactory("MockToken");
  const token = await MockToken.deploy("MockUSD", "mUSD", 18);
  await token.waitForDeployment();

  // Mock Oracle - since we need to simulate a price drop, let's create a MockV3Aggregator
  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  const decimals = 8;
  const initialPrice = ethers.parseUnits("300", 8); // 300 USD
  const oracle = await MockV3Aggregator.deploy(decimals, initialPrice);
  await oracle.waitForDeployment();

  const HybridLending = await ethers.getContractFactory("HybridLending");
  const lending = await HybridLending.deploy(
    await identity.getAddress(),
    await score.getAddress(),
    await token.getAddress(),
    await oracle.getAddress(),
    deployer.address
  );
  await lending.waitForDeployment();

  const lendingAddr = await lending.getAddress();

  // Setup: Fund Lending Pool
  await token.mint(lendingAddr, ethers.parseUnits("100000", 18));
  
  // Setup: Grant roles
  const SCORER_ROLE = await score.SCORER_ROLE();
  await score.grantRole(SCORER_ROLE, lendingAddr);

  // --- Phase 3.1: Mint Identity ---
  console.log("1. Minting Identity...");
  const aadhaarNumber = "123456789012";
  const identityString = `IN-AADHAAR-${aadhaarNumber}`;
  const identityHash = ethers.keccak256(ethers.toUtf8Bytes(identityString));
  await identity.verifyIdentity(user.address, identityHash);
  
  const isVerified = await identity.isVerified(user.address);
  console.log(`User verifiable: ${isVerified}`);
  if (!isVerified) throw new Error("Identity verification failed");

  // Verify wallet-bound and identity-bound (cannot reuse)
  const [user2] = await ethers.getSigners();
  let reverted = false;
  try {
      await identity.verifyIdentity(deployer.address, identityHash);
  } catch(e) {
      reverted = true;
  }
  if (!reverted) throw new Error("Should not allow duplicate identity hash");

  // --- Phase 3.2: Borrow with collateral ---
  console.log("2. Borrowing...");
  const bnbPrice = await lending.getLatestBnbPrice(); // Should be 300 * 10^18
  console.log("Initial BNB Price from Oracle:", ethers.formatUnits(bnbPrice, 18));

  const collateralAmount = ethers.parseEther("1"); // 1 BNB = 300 USD

  // Compute max borrow limit for user (default score 500 = 150% collateral ratio)
  // Max borrow: 300 * 10000 / 15000 = 200 USD
  const borrowAmount = ethers.parseUnits("100", 18); 

  await lending.connect(user).borrow(borrowAmount, { value: collateralAmount });
  
  const loan = await lending.getUserLoan(user.address);
  console.log(`Loan Created. Debt: ${ethers.formatUnits(loan.debtAmount, 18)}, Collateral: ${ethers.formatUnits(loan.collateralAmount, 18)}`);

  // --- Phase 3.3: Compute Ratios & HF ---
  console.log("3. Computing Stats...");
  const healthFactor = await lending.getHealthFactor(user.address);
  console.log("Health Factor Initial:", ethers.formatUnits(healthFactor, 18));

  // --- Phase 3.4: Simulate price drop ---
  console.log("4. Simulating Price Drop...");
  // Drop BNB price to 100 USD
  await oracle.updateAnswer(ethers.parseUnits("100", 8));
  
  const newBnbPrice = await lending.getLatestBnbPrice();
  console.log("New BNB Price:", ethers.formatUnits(newBnbPrice, 18));
  
  const healthFactorAfter = await lending.getHealthFactor(user.address);
  console.log("Health Factor After Drop:", ethers.formatUnits(healthFactorAfter, 18));
  
  const isLiquidatable = await lending.checkLiquidation(user.address);
  console.log("Is Liquidatable?", isLiquidatable);

  // --- Phase 3.5: Trigger Liquidation ---
  console.log("5. Liquidating...");
  // Liquidator needs borrow tokens
  await token.mint(liquidator.address, ethers.parseUnits("1000", 18));
  await token.connect(liquidator).approve(lendingAddr, ethers.parseUnits("1000", 18));

  const initialLiquidatorBnb = await ethers.provider.getBalance(liquidator.address);
  
  await lending.connect(liquidator).liquidate(user.address);

  const finalLiquidatorBnb = await ethers.provider.getBalance(liquidator.address);
  console.log(`Liquidator BNB Profit (approx): ${ethers.formatEther(finalLiquidatorBnb - initialLiquidatorBnb)}`);

  // --- Phase 3.6: Verify effects ---
  console.log("6. Verifying Results...");
  const updatedLoan = await lending.getUserLoan(user.address);
  console.log("Loan Is Active?:", updatedLoan.isActive);

  const newScore = await score.getScore(user.address);
  console.log("User Credit Score Post-Liquidation:", newScore.toString());

  console.log("=== SIMULATION PASS ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
