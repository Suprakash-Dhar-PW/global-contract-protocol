import { ethers } from "hardhat";

async function main() {
    console.log("Funding HybridLending Pool with MUSD...");

    const mUSDAddress = "0x54482519704CF8EB10c013Ceb7a9148804f42095";
    const hybridLendingAddress = "0x1F3bd747E3Dda38317459e97859B56E12883f41e";

    // Grab the signer
    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);

    // Get MockToken contract
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    const mUSD = MockTokenFactory.attach(mUSDAddress) as any;

    // Mint 100,000 MUSD to the Hybrid Lending Pool
    const amountToMint = ethers.parseUnits("100000", 18); // assuming 18 decimals
    console.log(`Minting 100,000 MUSD direct to pool...`);

    const tx = await mUSD.mint(hybridLendingAddress, amountToMint);
    await tx.wait();

    console.log(`Successfully minted 100,000 MUSD to HybridLending!`);
    
    // Check balance
    const balance = await mUSD.balanceOf(hybridLendingAddress);
    console.log(`HybridLending MUSD Balance: ${ethers.formatUnits(balance, 18)}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
