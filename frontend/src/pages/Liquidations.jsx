import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, AlertTriangle, ShieldX } from "lucide-react";
import { ethers } from "ethers";
import { getContracts } from "../utils/contract";

// Example deployed testnet or localhost addresses for MVP
const MOCK_BORROWER_LIST = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
];

const Liquidations = () => {
  const [loading, setLoading] = useState(false);
  const [liveLoans, setLiveLoans] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [bnbPrice, setBnbPrice] = useState(0);

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  const fetchActiveLoans = async () => {
    setFetching(true);
    try {
      if (!window.ethereum) {
        setFetching(false);
        return;
      }
      
      // 1 & 2. Force MetaMask Only & Block others (Phantom, etc.)
      const { ethereum } = window;
      let metaMaskProvider = ethereum;

      if (ethereum?.providers) {
        metaMaskProvider = ethereum.providers.find(p => p.isMetaMask);
      }

      if (!metaMaskProvider || !metaMaskProvider.isMetaMask) {
        console.error("MetaMask is required for this action.");
        setFetching(false);
        return;
      }
      
      // 5. Force Correct Network (BSC Testnet: 0x61)
      try {
        await metaMaskProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x61" }]
        });
      } catch (err) {
        console.error("Network switch failed", err);
      }

      const provider = new ethers.BrowserProvider(metaMaskProvider);
      
      // 3. Add Network Validation
      const network = await provider.getNetwork();
      console.log("Connected Chain:", network.chainId);

      if (network.chainId !== 97n) {
        console.error("Wrong network for liquidations. Please switch to BSC Testnet (97).");
        setFetching(false);
        return;
      }

      const signer = await provider.getSigner();
      const { lendingContract } = getContracts(signer);

      if (lendingContract && lendingContract.target !== ethers.ZeroAddress) {
        console.log("Lending Address:", lendingContract.target);
        const code = await provider.getCode(lendingContract.target);
        if (code === "0x" || code === "0x0") {
          console.error("Lending contract not found on this network");
          setFetching(false);
          return;
        }
      } else {
        setFetching(false);
        return;
      }

      // Fetch bnb price
      const priceRaw = await lendingContract.getLatestBnbPrice();
      const price = Number(ethers.formatUnits(priceRaw, 18));
      setBnbPrice(price);

      // 1. Parallelize RPC calls using Promise.all
      const loanPromises = MOCK_BORROWER_LIST.map(async (address) => {
        try {
          const loan = await lendingContract.getUserLoan(address);
          if (!loan.isActive) return null; // Skip non-active loans

          const hfRaw = await lendingContract.getHealthFactor(address);
          let hfFormatted = null;

          if (hfRaw === ethers.MaxUint256) {
             hfFormatted = 99.99; // Represents practically infinite
          } else {
             hfFormatted = Number(ethers.formatUnits(hfRaw, 18));
          }

          return {
            borrower: address,
            debt: Number(ethers.formatUnits(loan.debtAmount, 18)),
            collateral: Number(ethers.formatUnits(loan.collateralAmount, 18)),
            hf: hfFormatted,
            dueDate: Number(loan.dueDate),
            isActive: loan.isActive
          };
        } catch (e) {
          console.error(`Error fetching debt for ${address}`, e);
          return null;
        }
      });

      // Resolve and filter out nulls
      const resolvedLoans = (await Promise.all(loanPromises)).filter((l) => l !== null);
      
      const mapped = resolvedLoans.map(l => {
          const timeRemaining = l.dueDate - Math.floor(Date.now() / 1000);
          const timeStr = timeRemaining > 0 
             ? `${Math.floor(timeRemaining / 3600)}h` 
             : "Exp!";
          return { ...l, time: timeStr };
      });
      setLiveLoans(mapped);

    } catch (err) {
      console.error("Error connecting to EVM", err);
    }
    setFetching(false);
  };

  const handleLiquidate = async (borrower) => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const { lendingContract } = getContracts(signer);
      
      const tx = await lendingContract.liquidate(borrower);
      await tx.wait();
      
      alert(`Liquidation execution confirmed for ${borrower}!`);
      fetchActiveLoans(); // Refresh UI
    } catch (e) {
      console.error(e);
      alert("Liquidation failed. Ensure the position is actually underwater.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 pb-32">
      <div className="text-center pt-10 pb-6 border-b border-zinc-800">
        <motion.h1
          className="text-4xl md:text-5xl font-extrabold bg-clip-text text-zinc-100 mb-4 flex items-center justify-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertTriangle className="text-purple-500 w-12 h-12" /> Arb Terminal
        </motion.h1>
        <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
          Maintain protocol solvency. Identify and execute on underwater loans
          (HF &lt; 1.0) to earn the 5% arbitrage premium directly in BNB.
        </p>
      </div>

      <div className="grid gap-6">
        {fetching ? (
           <div className="text-center p-12 text-zinc-500 font-mono animate-pulse border border-zinc-800 rounded-3xl">
             Querying testnet nodes for active loans...
           </div>
        ) : liveLoans.length === 0 ? (
           <div className="text-center p-12 text-zinc-500 font-mono border border-zinc-800 rounded-3xl">
             No active positions tracked in the localized segment.
           </div>
        ) : (
          liveLoans.map((loan, idx) => {
            const isDanger = loan.hf <= 1.5 && loan.hf >= 1.0;
            const isLiquidatable = loan.hf < 1.0;

            const panelColor = isLiquidatable
              ? "bg-red-900/10 border-red-500/30 shadow-red-500/10 shadow-2xl animate-pulse ring-1 ring-red-500"
              : isDanger
                ? "bg-yellow-900/10 border-yellow-500/30 shadow-yellow-500/5 shadow-xl"
                : "bg-white/5 border-white/10 hover:border-white/20";

            const hfColor = isLiquidatable
              ? "text-red-500"
              : isDanger
                ? "text-yellow-500"
                : "text-green-500";

            const debtBnbEquiv = bnbPrice > 0 ? loan.debt / bnbPrice : 0;
            const premiumReward = debtBnbEquiv * 0.05;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-6 rounded-2xl backdrop-blur-md border transition-all flex flex-col md:flex-row items-center justify-between ${panelColor}`}
              >
                <div className="flex items-center space-x-6 mb-4 md:mb-0">
                  {isLiquidatable ? (
                    <ShieldX className="text-red-500 w-10 h-10" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">
                      #{idx + 1}
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-mono font-bold text-gray-200 flex items-center gap-2">
                      {loan.borrower.slice(0,6)}...{loan.borrower.slice(-4)}{" "}
                      <Copy className="w-4 h-4 text-gray-600 hover:text-white cursor-pointer" onClick={() => navigator.clipboard.writeText(loan.borrower)} />
                    </h3>
                    <div className="text-xs text-gray-500 flex items-center gap-4 mt-2">
                      <span>Debt: <span className="text-white font-bold">${loan.debt.toLocaleString()} mUSD</span></span>
                      <span>Collat: <span className="text-white font-bold">{loan.collateral.toFixed(4)} BNB</span></span>
                      <span>Due: <span className="text-white font-bold">{loan.time}</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-8">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Health Factor</p>
                    <p className={`text-4xl font-extrabold ${hfColor}`}>{loan.hf.toFixed(2)}</p>
                  </div>

                  {isLiquidatable ? (
                    <button
                      onClick={() => handleLiquidate(loan.borrower)}
                      disabled={loading}
                      className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/30 flex flex-col items-center transition-all active:scale-95 border border-red-400/20"
                    >
                      <span className="text-sm">{loading ? "Wait...":"Execute Arb"}</span>
                      <span className="text-[10px] font-normal opacity-80">Reward: {premiumReward.toFixed(3)} BNB</span>
                    </button>
                  ) : (
                    <button disabled className="px-8 py-3 rounded-xl bg-white/5 text-gray-500 font-bold border border-white/5 cursor-not-allowed uppercase text-xs tracking-widest">
                      Safe
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Liquidations;
