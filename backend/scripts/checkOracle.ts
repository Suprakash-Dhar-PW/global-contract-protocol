import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function main() {
  const hybridAddress = process.env.HYBRID_LENDING_ADDRESS!
  const HybridLending = await ethers.getContractFactory("HybridLending");
  const hybrid = HybridLending.attach(hybridAddress);

  console.log("Checking HybridLending at:", hybridAddress);

  const priceOracle = await hybrid.priceOracle();
  console.log("priceOracle():", priceOracle);

  try {
    const bnbPrice = await hybrid.getLatestBnbPrice();
    console.log("getLatestBnbPrice():", bnbPrice.toString());
    console.log("BNB Price in USD:", Number(bnbPrice) / 1e18);
  } catch (error) {
    console.error("getLatestBnbPrice() reverted:", error.message);
  }
}

main().catch(console.error);
