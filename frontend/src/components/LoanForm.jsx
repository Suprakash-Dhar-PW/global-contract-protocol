import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContracts } from "../utils/contract";

const LoanForm = ({ provider, address, score }) => {
  const [collateralOpen, setCollateralOpen] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [calculatedLimit, setCalculatedLimit] = useState("0.00");
  const [params, setParams] = useState(null);

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

      const [ratio, liqThreshold, rate, maxLimits] =
        await lendingContract.getRiskParameters(address);

      setParams({
        bnbPrice: bnbPriceNum,
        ratio: Number(ratio) / 100, // eg 150
        rate: Number(rate) / 100, // eg 10
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

    // Calculate theoretically
    // Collateral * Live bnbPrice * 100 / ratioBps
    const colPrice = Number(val) * params.bnbPrice;
    let limit = (colPrice * 100) / params.ratio;
    if (limit > Number(params.maxLimits)) {
      limit = Number(params.maxLimits);
    }
    setCalculatedLimit(limit.toFixed(2));
  };

  const handleBorrow = async () => {
    try {
      const signer = await provider.getSigner();
      const { lendingContract } = getContracts(signer);

      const colValueWei = ethers.parseEther(collateralOpen.toString() || "0");
      const borrowWei = ethers.parseUnits(borrowAmount.toString() || "0", 18);

      const tx = await lendingContract.borrow(borrowWei, {
        value: colValueWei,
      });
      await tx.wait();
      alert("Borrow Successful!");
    } catch (error) {
      console.error("Borrow failed", error);
      alert("Borrow failed: " + error.message);
    }
  };

  return (
    <div className="bg-white/5 p-8 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-xl mt-6 max-w-lg mx-auto transform transition duration-500 hover:shadow-blue-500/10">
      <h2 className="text-2xl font-bold text-gray-100 mb-6 flex items-center gap-2">
        <svg
          className="w-6 h-6 text-indigo-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Request Loan
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
        <div className="bg-[#0a0f1d]/50 border border-white/5 p-4 rounded-2xl text-center shadow-inner">
          <span className="block text-indigo-400 mb-1 uppercase tracking-widest text-xs font-bold">
            Interest Rate
          </span>
          <span className="text-2xl font-black text-white">
            {params ? params.rate : "--"}%{" "}
            <span className="text-sm font-medium text-gray-500">APR</span>
          </span>
        </div>
        <div className="bg-[#0a0f1d]/50 border border-white/5 p-4 rounded-2xl text-center shadow-inner">
          <span className="block text-blue-400 mb-1 uppercase tracking-widest text-xs font-bold">
            Req Collateral
          </span>
          <span className="text-2xl font-black text-white">
            {params ? params.ratio : "--"}%
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold tracking-wide uppercase text-gray-400 mb-2">
            Collateral Amount (BNB)
          </label>
          <div className="relative">
            <input
              type="number"
              className="block w-full rounded-xl bg-[#0a0f1d]/80 shadow-inner focus:border-blue-500 focus:ring-blue-500 text-white p-4 pl-4 border border-white/10 transition-all font-mono text-lg"
              placeholder="0.00"
              value={collateralOpen}
              onChange={handleCollateralChange}
            />
            <span className="absolute right-3 top-3 text-gray-400 font-medium">
              BNB
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm font-bold bg-blue-500/10 border border-blue-500/20 px-4 py-3 rounded-xl backdrop-blur-sm">
          <span className="text-gray-400 uppercase tracking-widest text-xs">
            Max USD Limit:
          </span>
          <span className="text-blue-400 font-mono text-lg">
            ${calculatedLimit}
          </span>
        </div>

        <div>
          <label className="block text-sm font-bold tracking-wide uppercase text-gray-400 mb-2 mt-2">
            Borrow Amount (mUSD)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-3 text-gray-400 font-medium">
              $
            </span>
            <input
              type="number"
              className="block w-full rounded-xl bg-[#0a0f1d]/80 shadow-inner focus:border-blue-500 focus:ring-blue-500 text-white p-4 pl-10 border border-white/10 transition-all font-mono text-lg"
              placeholder="100.00"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleBorrow}
          className="w-full mt-8 flex justify-center py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.2)] font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-95 text-lg border border-blue-500/50"
        >
          Confirm Borrow
        </button>
      </div>
    </div>
  );
};

export default LoanForm;
