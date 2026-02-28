import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Updating scores with account:", deployer.address);

  // Example addresses
  const creditScoreAddress = process.env.CREDIT_SCORE_ADDRESS || "";
  const targetUserAddress = "0xYourUserAddressHere";

  if (!creditScoreAddress) {
    console.log("No CREDIT_SCORE_ADDRESS provided in env.");
    return;
  }

  const creditScore = await ethers.getContractAt("CreditScore", creditScoreAddress);
  
  // Update user score to 750
  const tx = await creditScore.updateScore(targetUserAddress, 750);
  await tx.wait();

  console.log(`Updated score for ${targetUserAddress} to 750.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
