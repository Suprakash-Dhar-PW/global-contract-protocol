import React, { useState } from "react";
import { motion } from "framer-motion";
import { Copy, AlertTriangle, ShieldX } from "lucide-react";

// Mock Active Loans fetched theoretically from the pool / subgraph
const mockActiveLoans = [
  {
    borrower: "0x1A4F...9C11",
    hf: 2.4,
    debt: 15400,
    collateral: 14.5,
    time: "4d",
  },
  {
    borrower: "0x89D2...BB3E",
    hf: 1.6,
    debt: 8900,
    collateral: 6.2,
    time: "2d",
  },
  {
    borrower: "0xFE11...4BA9",
    hf: 1.15,
    debt: 45000,
    collateral: 17.1,
    time: "18h",
  },
  {
    borrower: "0x53AC...89FA",
    hf: 0.95,
    debt: 12400,
    collateral: 3.8,
    time: "Exp!",
  },
];

const Liquidations = () => {
  const [loading, setLoading] = useState(false);

  const handleLiquidate = (borrower) => {
    setLoading(true);
    setTimeout(() => {
      alert(`Simulation: Sent Liquidate tx for ${borrower}`);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      <div className="text-center pt-10 pb-6 border-b border-white/10">
        <motion.h1
          className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-400 mb-4 flex items-center justify-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertTriangle className="text-red-500 w-12 h-12" /> Keeper Node
        </motion.h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Maintain protocol solvency. Identify and execute on underwater loans
          (HF &lt; 1.0) to earn the 5% arbitrage premium directly in BNB.
        </p>
      </div>

      <div className="grid gap-6">
        {mockActiveLoans.map((loan, idx) => {
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

          // Calculate Arbitrage
          // debt in USD / 3000 (mock bnb price equivalent calculation) * 1.05
          const debtBnbEquiv = loan.debt / 3000;
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
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-500">
                    #{idx + 1}
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-mono font-bold text-gray-200 flex items-center gap-2">
                    {loan.borrower}{" "}
                    <Copy className="w-4 h-4 text-gray-600 hover:text-white cursor-pointer" />
                  </h3>
                  <div className="text-sm text-gray-500 flex items-center gap-4 mt-2">
                    <span>
                      Debt:{" "}
                      <span className="text-white font-semibold">
                        ${loan.debt.toLocaleString()}
                      </span>
                    </span>
                    <span>
                      Collat:{" "}
                      <span className="text-white font-semibold">
                        {loan.collateral} BNB
                      </span>
                    </span>
                    <span>
                      Due:{" "}
                      <span className="text-white font-semibold">
                        {loan.time}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-8">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                    Health Factor
                  </p>
                  <p className={`text-4xl font-extrabold ${hfColor}`}>
                    {loan.hf}
                  </p>
                </div>

                {isLiquidatable ? (
                  <button
                    onClick={() => handleLiquidate(loan.borrower)}
                    disabled={loading}
                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/30 flex items-center flex-col transition-all active:scale-95"
                  >
                    <span>Execute Arb</span>
                    <span className="text-xs font-normal opacity-80">
                      Reward: {premiumReward.toFixed(3)} BNB
                    </span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-6 py-3 rounded-xl bg-gray-800 text-gray-500 font-bold border border-gray-700 cursor-not-allowed"
                  >
                    Safe
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Liquidations;
