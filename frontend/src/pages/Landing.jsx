import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShieldCheck, LineChart, Banknote, ArrowRight } from "lucide-react";
import { ethers } from "ethers";

const Landing = () => {
  const [sliderScore, setSliderScore] = useState(600);
  const [bnbPrice, setBnbPrice] = useState(null);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const provider = new ethers.JsonRpcProvider(
          "https://data-seed-prebsc-1-s1.binance.org:8545",
        );
        const abi = ["function getLatestBnbPrice() view returns (uint256)"];
        const hybridContract = new ethers.Contract(
          import.meta.env.VITE_HYBRID_LENDING,
          abi,
          provider,
        );
        const price = await hybridContract.getLatestBnbPrice();
        console.log("Fetched BNB Price:", price.toString());
        setBnbPrice(Number(price) / 1e18);
      } catch (err) {
        console.error("Failed to fetch BNB price:", err);
      }
    }
    fetchPrice();
  }, []);

  // Quick dynamic calc mock for UI demo
  const normalized = Math.max(0, sliderScore - 500);
  const ratio = 150 - (normalized * 40) / 500;
  const rate = 10 - (normalized * 8) / 500;
  const limit = 1000 + (normalized * 99000) / 500;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
      {/* Hero Section */}
      <section className="text-center pt-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-block p-[1px] rounded-full bg-gradient-to-r from-blue-500/50 to-indigo-500/50 mb-8"
        >
          <div className="px-5 py-2 rounded-full bg-[#0a0f1d] text-sm text-blue-300 backdrop-blur-md">
            The World's First Hybrid Credit Engine
          </div>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-7xl font-extrabold pb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-gray-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Reputation is <br className="hidden md:block" /> the New Collateral.
        </motion.h1>

        <motion.p
          className="mt-6 text-xl text-gray-400 max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          DeFi lending has strictly required 150%+ collateral arrays. I built a
          mathematically robust protocol that merges on-chain Credit Scores with
          your Collateral Requirements.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link
            to="/borrow"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold text-lg shadow-lg shadow-blue-500/25 transition-all hover:scale-105 flex items-center justify-center gap-2 group"
          >
            Launch DApp{" "}
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/analytics"
            className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-lg backdrop-blur-md transition-all flex items-center justify-center gap-2"
          >
            Pool Metrics
          </Link>
        </motion.div>
      </section>

      {/* Story Boxes */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: <ShieldCheck className="text-blue-400 w-8 h-8" />,
            title: "Identity NFT",
            desc: "Soulbound KYC strictly enforces one loan per human without storing plaintext PII.",
          },
          {
            icon: <LineChart className="text-indigo-400 w-8 h-8" />,
            title: "Dynamic Score",
            desc: "Based on borrow/repay history, your Credit Score adjusts automatically via Oracles.",
          },
          {
            icon: <Banknote className="text-green-400 w-8 h-8" />,
            title: "Capital Efficiency",
            desc: "Prime borrowers unlock 110% thresholds, vastly improving leverage.",
          },
        ].map((feat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2 }}
            className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md hover:bg-white/[0.07] transition-colors"
          >
            <div className="bg-[#0a0f1d] w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/5">
              {feat.icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
            <p className="text-gray-400 leading-relaxed">{feat.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Simulator Parallax */}
      <motion.section
        className="relative bg-gradient-to-br from-blue-900/20 to-[#0a0f1d] border border-blue-500/20 rounded-3xl p-8 md:p-16 backdrop-blur-lg overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-extrabold text-white mb-6">
              Experience the Math.
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Slide to see how your on-chain Credit Score dynamically rewrites
              your smart contract risk boundaries in real-time.
            </p>
            {bnbPrice && (
              <div className="mb-4 text-green-400 font-bold border border-green-400/20 p-4 rounded-xl bg-green-400/5 inline-block">
                Live Risk Engine panel - Current BNB Price: $
                {bnbPrice.toFixed(2)}
              </div>
            )}

            <div className="space-y-6 bg-black/40 p-6 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center text-blue-400 font-bold mb-2">
                <span>Poor (300)</span>
                <span className="text-2xl text-white">{sliderScore}</span>
                <span>Prime (1000)</span>
              </div>
              <input
                type="range"
                min="300"
                max="1000"
                value={sliderScore}
                onChange={(e) => setSliderScore(Number(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-colors shadow-2xl">
              <p className="text-gray-400 mb-2">Required Ratio</p>
              <p className="text-4xl font-extrabold text-white">
                {ratio.toFixed(0)}
                <span className="text-blue-400 text-xl">%</span>
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-indigo-500/50 transition-colors shadow-2xl">
              <p className="text-gray-400 mb-2">Interest Rate</p>
              <p className="text-4xl font-extrabold text-white">
                {rate.toFixed(1)}
                <span className="text-indigo-400 text-xl">%</span>
              </p>
            </div>
            <div className="col-span-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 p-6 rounded-2xl border border-blue-500/30 shadow-blue-500/10 shadow-2xl text-center">
              <p className="text-gray-300 font-medium mb-2 uppercase tracking-wide">
                Dynamic Borrow Limit
              </p>
              <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                ${limit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default Landing;
