import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getContracts } from "../utils/contract";
import ScoreCard from "../components/ScoreCard";
import HealthFactorCard from "../components/HealthFactorCard";
import LoanForm from "../components/LoanForm";
import { Copy, AlertCircle, ShieldCheck } from "lucide-react";

const Dashboard = () => {
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState("");
  const [score, setScore] = useState(500);
  const [isVerified, setIsVerified] = useState(false);
  const [bnbPrice, setBnbPrice] = useState(0);
  const [healthFactor, setHealthFactor] = useState(null);

  // Data for Loan Form and Graph
  const [activeLoan, setActiveLoan] = useState({
    collateral: 0,
    debt: 0,
    required: 0,
  });

  // KYC Form
  const [aadhaar, setAadhaar] = useState("");
  const [kycLoading, setKycLoading] = useState(false);

  useEffect(() => {
    connectWallet();

    // Auto-refresh interval (15 seconds)
    const interval = setInterval(() => {
      if (provider) {
        provider
          .getSigner()
          .then((signer) => {
            fetchUserData(signer, address, true);
          })
          .catch((err) => console.error(err));
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [provider, address]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const tempProvider = new ethers.BrowserProvider(window.ethereum);
        const tempSigner = await tempProvider.getSigner();
        const tempAddress = await tempSigner.getAddress();
        setProvider(tempProvider);
        setAddress(tempAddress);
        fetchUserData(tempSigner, tempAddress);
      } catch (err) {
        console.error("Wallet connection failed", err);
      }
    } else {
      alert("Please install MetaMask.");
    }
  };

  const fetchUserData = async (signer, userAddress, isSilent = false) => {
    try {
      const { identityContract, scoreContract, lendingContract } =
        getContracts(signer);

      console.log(
        "Connected to Network:",
        (await signer.provider.getNetwork()).name,
      );
      console.log("Using Score Contract at:", scoreContract?.target);

      if (!isSilent) {
        // Restoring original behavior: Do not auto-verify on load. Force user to see form on reload.
        // if (identityContract && identityContract.target !== ethers.ZeroAddress) {
        //   const verified = await identityContract.isVerified(userAddress);
        //   setIsVerified(verified);
        // }
        if (scoreContract && scoreContract.target !== ethers.ZeroAddress) {
          const userScore = await scoreContract.getScore(userAddress);
          setScore(Number(userScore));
        }
      }

      if (lendingContract && lendingContract.target !== ethers.ZeroAddress) {
        // Price & HF
        const price = await lendingContract.getLatestBnbPrice();
        const priceNum = Number(ethers.formatUnits(price, 18));
        setBnbPrice(priceNum);

        // Active Loan details for Chart
        const loanData = await lendingContract.getUserLoan(userAddress);
        const [, liqThresholdBps] =
          await lendingContract.getRiskParameters(userAddress);

        const debtFormatted = Number(
          ethers.formatUnits(loanData.debtAmount, 18),
        );
        const collateralFormattedAmount = Number(
          ethers.formatUnits(loanData.collateralAmount, 18),
        );
        const collateralFormattedValue = collateralFormattedAmount * priceNum;

        const requiredCollat =
          (debtFormatted * Number(liqThresholdBps)) / 10000;

        let hfFormatted = null;
        if (loanData.isActive && requiredCollat > 0) {
          hfFormatted = collateralFormattedValue / requiredCollat;
          setHealthFactor(hfFormatted);
        } else {
          setHealthFactor(null); // No loan
        }

        setActiveLoan({
          collateral: collateralFormattedValue,
          debt: debtFormatted,
          required: loanData.isActive ? requiredCollat : 0,
        });
      }
    } catch (error) {
      console.error("Error fetching user data", error);
      if (
        error.code === "BAD_DATA" ||
        error.message.includes("decode result data")
      ) {
        console.warn(
          "Contract data couldn't be decoded. Is MetaMask on the BSC Testnet?",
        );
        // Only alert if it's the first time and not a silent refresh
        if (!isSilent) {
          alert(
            "Could not fetch protocol data. Please ensure your wallet is connected to the BNB Smart Chain Testnet.",
          );
        }
      }
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setKycLoading(true);
    try {
      const apiUrl =
        import.meta.env.VITE_KYC_API_URL ||
        "http://localhost:3001/api/kyc/verify";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaarNumber: aadhaar,
          walletAddress: address,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        alert("KYC Successful! Identity Hash: " + data.identityHash);
        setIsVerified(true);
      } else {
        alert("KYC Failed: " + data.error);
      }
    } catch (error) {
      console.error("KYC error", error);
      alert("Error connecting to KYC server");
    }
    setKycLoading(false);
  };

  const chartData = [
    {
      name: "Loan State",
      "Collateral Value": activeLoan.collateral,
      "Required Threshold": activeLoan.required,
      "Current Debt": activeLoan.debt,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-32">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
            Borrow Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Deploy collateral against your strictly modeled on-chain reputation.
          </p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-3 mb-1">
            <span
              className={`h-3 w-3 rounded-full ${address ? "bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-red-500"}`}
            ></span>
            <span className="text-sm font-bold text-gray-300 font-mono">
              {address
                ? `${address.slice(0, 6)}...${address.slice(-4)}`
                : "Not Connected"}
            </span>
            {address && (
              <Copy className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer transition-colors" />
            )}
          </div>
          {isVerified ? (
            <span className="text-xs font-bold text-green-400 border border-green-500/30 bg-green-500/10 px-2 py-1 rounded-md flex items-center gap-1">
              <ShieldCheck size={14} /> KYC Authenticated
            </span>
          ) : (
            <span className="text-xs font-bold text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-1 rounded-md flex items-center gap-1">
              <AlertCircle size={14} /> Unverified Identity
            </span>
          )}
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Metrics */}
        <div className="lg:col-span-4 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ScoreCard score={score} isVerified={isVerified} />
          </motion.div>

          {isVerified && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <HealthFactorCard
                healthFactor={healthFactor}
                bnbPrice={bnbPrice}
              />
            </motion.div>
          )}
        </div>

        {/* Right Column: Actions & Charts */}
        <div className="lg:col-span-8 space-y-8">
          {!isVerified && address && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-xl border border-red-500/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[100px] rounded-full pointer-events-none" />
              <h2 className="text-2xl font-bold text-gray-100 mb-2 flex items-center gap-2">
                Mandatory Verification
              </h2>
              <p className="text-gray-400 mb-8 max-w-lg">
                Your wallet holds zero reputation. Mint your cryptographic
                Soulbound Token to unlock credit facilities and Aave-grade
                lending limits.
              </p>

              <form
                onSubmit={handleKycSubmit}
                className="space-y-6 max-w-md relative z-10"
              >
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">
                    Mock Verification Key (12-Digits)
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012"
                    className="block w-full rounded-xl bg-[#0a0f1d]/50 border-gray-700 shadow-inner focus:border-red-500 focus:ring-red-500 text-white p-4 font-mono text-lg transition-all"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value)}
                    required
                    maxLength={12}
                  />
                </div>
                <button
                  type="submit"
                  disabled={kycLoading}
                  className={`w-full py-4 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] font-black text-white text-lg transition-all ${
                    kycLoading
                      ? "bg-gray-700 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-500 active:scale-95"
                  }`}
                >
                  {kycLoading
                    ? "Proving Identity..."
                    : "Mint Soulbound Identity"}
                </button>
              </form>
            </motion.div>
          )}

          {isVerified && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <LoanForm provider={provider} address={address} score={score} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl w-full flex flex-col"
              >
                <h3 className="text-xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
                  Live Position Vector
                </h3>
                {activeLoan.debt > 0 ? (
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#1f2937"
                          vertical={false}
                        />
                        <XAxis dataKey="name" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.05)" }}
                          contentStyle={{
                            backgroundColor: "#0a0f1d",
                            borderRadius: "10px",
                            borderColor: "#1f2937",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="Collateral Value"
                          fill="#10B981"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="Required Threshold"
                          fill="#F59E0B"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="Current Debt"
                          fill="#EF4444"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 min-h-[250px] border-2 border-dashed border-white/10 rounded-2xl">
                    <AlertCircle className="w-12 h-12 text-gray-500 mb-3" />
                    <p className="text-gray-400 font-medium">No Active Loans</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Initiate a borrow to populate risk graph
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {isVerified && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8"
        >
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400 mb-8 drop-shadow-sm text-center md:text-left">
            Structural Math Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative group bg-[#0a0f1d]/50 p-6 rounded-2xl border border-white/5 hover:-translate-y-1 transition duration-500 hover:border-blue-500/50">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mb-4 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                1
              </div>
              <h3 className="font-bold text-gray-200 mb-2">Score Modeling</h3>
              <p className="text-sm text-gray-400">
                Your Credit Score sets your base Risk arrays instantly upon
                contract sync.
              </p>
            </div>
            <div className="relative group bg-[#0a0f1d]/50 p-6 rounded-2xl border border-white/5 hover:-translate-y-1 transition duration-500 hover:border-indigo-500/50">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                2
              </div>
              <h3 className="font-bold text-gray-200 mb-2">
                Volatility Oracles
              </h3>
              <p className="text-sm text-gray-400">
                BNB's USD valuation is verified securely through Chainlink Node
                aggregators.
              </p>
            </div>
            <div className="relative group bg-[#0a0f1d]/50 p-6 rounded-2xl border border-white/5 hover:-translate-y-1 transition duration-500 hover:border-yellow-500/50">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold mb-4 shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                3
              </div>
              <h3 className="font-bold text-gray-200 mb-2">Health Drops</h3>
              <p className="text-sm text-gray-400">
                When Collateral falls below your Liquidation Threshold, HF drops
                beneath 1.0.
              </p>
            </div>
            <div className="relative group bg-[#0a0f1d]/50 p-6 rounded-2xl border border-white/5 hover:-translate-y-1 transition duration-500 hover:border-red-500/50">
              <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold mb-4 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                4
              </div>
              <h3 className="font-bold text-gray-200 mb-2">
                Keeper Arbitration
              </h3>
              <p className="text-sm text-gray-400">
                At &lt;1.0, third-party searchers instantly wipe your debt,
                claiming a 5% bonus.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
