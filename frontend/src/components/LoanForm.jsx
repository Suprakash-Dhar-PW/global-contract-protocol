import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContracts } from "../utils/contract";
import { Info, AlertCircle, Zap } from "lucide-react";

const LoanForm = ({ provider, address, score, poolLiquidity, onBorrowSuccess }) => {
  const [collateralOpen, setCollateralOpen] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [calculatedLimit, setCalculatedLimit] = useState("0.00");
  const [params, setParams] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (provider && address && score) {
      fetchRiskParams();
    }
  }, [provider, address, score]);

  const fetchRiskParams = async () => {
    try {
      const signer = await provider.getSigner();
      const { lendingContract } = getContracts(signer);
      const bnbPriceRaw = await lendingContract.getLatestBnbPrice();
      const bnbPriceNum = Number(ethers.formatUnits(bnbPriceRaw, 18));
      const [ratio, liqThreshold, rate, maxLimits] = await lendingContract.getRiskParameters(address);

      setParams({
        bnbPrice: bnbPriceNum,
        ratio: Number(ratio) / 100,
        rate: Number(rate) / 100,
        maxLimits: ethers.formatUnits(maxLimits, 18),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCollateralChange = (e) => {
    const val = e.target.value;
    setCollateralOpen(val);
    if (!params || !val) {
      setCalculatedLimit("0.00");
      return;
    }
    const colPrice = Number(val) * params.bnbPrice;
    let limit = (colPrice * 100) / params.ratio;
    if (limit > Number(params.maxLimits)) limit = Number(params.maxLimits);
    setCalculatedLimit(limit.toFixed(2));
  };

  const handleBorrow = async () => {
    if (!borrowAmount || Number(borrowAmount) <= 0) return;
    
    // 1. Check Pool Liquidity
    if (Number(borrowAmount) > Number(poolLiquidity)) {
        console.warn("Insufficient liquidity in protocol pool.");
        return;
    }

    // 2. Check Collateral Ratio (Manual verify for demo safety)
    if (Number(borrowAmount) > Number(calculatedLimit)) {
        console.warn("Insufficient collateral for this borrow amount.");
        return;
    }

    setIsProcessing(true);
    try {
      const signer = await provider.getSigner();
      const { lendingContract } = getContracts(signer);
      const colValueWei = ethers.parseEther(collateralOpen.toString() || "0");
      const borrowWei = ethers.parseUnits(borrowAmount.toString() || "0", 18);

      const tx = await lendingContract.borrow(borrowWei, { value: colValueWei });
      await tx.wait();
      
      setCollateralOpen("");
      setBorrowAmount("");
      if (onBorrowSuccess) onBorrowSuccess("Loan executed successfully!");
    } catch (error) {
      console.error(error);
      if (onBorrowSuccess) onBorrowSuccess(error.reason || "Transaction failed", "error");
    }
    setIsProcessing(false);
  };

  return (
    <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-xl max-w-lg mx-auto transform transition duration-500 hover:shadow-[0_0_40px_rgba(139,92,246,0.1)] overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-orange-600/5 pointer-events-none" />

      <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-orange-400 mb-8 flex items-center gap-3 relative z-10 uppercase tracking-widest">
        <Zap className="text-purple-500" size={20} /> Request Liquidity
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-8 text-sm relative z-10">
        <div className="bg-[#0a0f1d]/80 border border-white/5 p-5 rounded-2xl text-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)]">
          <span className="block text-zinc-500 mb-2 uppercase tracking-[0.2em] text-[10px] font-black">Interest Rate</span>
          <span className="text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
            {params ? params.rate : "--"}% <span className="text-[10px] font-bold text-zinc-600">APR</span>
          </span>
        </div>
        <div className="bg-[#0a0f1d]/80 border border-white/5 p-5 rounded-2xl text-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)]">
          <span className="block text-zinc-500 mb-2 uppercase tracking-[0.2em] text-[10px] font-black">Min Ratio</span>
          <span className="text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
            {params ? params.ratio : "--"}%
          </span>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div>
          <label className="block text-[10px] font-black tracking-[0.2em] uppercase text-zinc-500 mb-3">Collateral Amount (tBNB)</label>
          <div className="relative">
            <input
              type="number"
              className="block w-full rounded-2xl bg-[#0a0f1d]/80 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] border border-white/5 focus:border-purple-500/50 text-white p-4 pr-16 font-mono text-lg outline-none transition-all"
              placeholder="0.00"
              value={collateralOpen}
              onChange={handleCollateralChange}
            />
            <span className="absolute right-4 top-4 text-zinc-600 font-black text-xs">tBNB</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm font-bold bg-purple-500/5 border border-purple-500/10 px-5 py-4 rounded-2xl backdrop-blur-sm shadow-[inset_0_0_15px_rgba(139,92,246,0.05)]">
          <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-black">Borrow Potential:</span>
          <span className="text-purple-400 font-mono text-lg drop-shadow-[0_0_10px_rgba(167,139,250,0.4)]">${calculatedLimit}</span>
        </div>

        <div>
          <label className="block text-[10px] font-black tracking-[0.2em] uppercase text-zinc-500 mb-3 mt-2">Mint Amount (mUSD)</label>
          <div className="relative group">
            <input
              type="number"
              className="block w-full rounded-2xl bg-[#0a0f1d]/80 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] border border-white/5 focus:border-orange-500/50 text-white p-4 pr-16 font-mono text-lg outline-none transition-all"
              placeholder="0.00"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
            />
            <span className="absolute right-4 top-4 text-zinc-600 font-black text-xs">mUSD</span>
          </div>
        </div>

        <button
          onClick={handleBorrow}
          disabled={isProcessing || !borrowAmount || Number(poolLiquidity) === 0}
          className="w-full mt-4 flex justify-center py-5 px-4 rounded-2xl shadow-[0_4px_30px_rgba(139,92,246,0.3)] font-black text-white bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500 transition-all active:scale-[0.98] text-lg border border-white/10 relative overflow-hidden disabled:from-zinc-800 disabled:to-zinc-900 disabled:text-zinc-600 disabled:shadow-none"
        >
          <span className="relative z-10">{isProcessing ? "PROCESSING SIGNATURES..." : "EXECUTE LOAN"}</span>
        </button>

        {Number(poolLiquidity) === 0 && (
            <div className="flex items-center gap-2 text-orange-500/80 bg-orange-500/5 border border-orange-500/10 p-4 rounded-xl">
                <AlertCircle size={16} className="shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-wider">Pool has no liquidity. Deposit mUSD to enable borrowing.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default LoanForm;
