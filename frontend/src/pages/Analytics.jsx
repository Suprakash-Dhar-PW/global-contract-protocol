import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { getContracts } from "../utils/contract";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Activity, Users, Disc, ShieldAlert, ArrowUpRight } from "lucide-react";

const MOCK_BORROWER_LIST = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
];

const Analytics = () => {
  const [stats, setStats] = useState({ tvl: 0, borrowers: 0, apy: 0 });
  const [loading, setLoading] = useState(true);

  const [riskDistribution, setRiskDistribution] = useState([
    { name: "Prime (700+)", value: 0, color: "#8b5cf6" },
    { name: "Fair (500-699)", value: 0, color: "#6366f1" },
    { name: "Poor (300-499)", value: 0, color: "#3b82f6" },
  ]);

  const [healthDistribution, setHealthDistribution] = useState([
    { name: "Safe (>1.5)", Safe: 0, Warning: 0, Danger: 0 },
    { name: "Warning (1.1-1.5)", Safe: 0, Warning: 0, Danger: 0 },
    { name: "Danger (<1.1)", Safe: 0, Warning: 0, Danger: 0 },
  ]);

  const [liveLiquidations, setLiveLiquidations] = useState([]);

  useEffect(() => {
    fetchGlobalAnalytics();
  }, []);

  const fetchGlobalAnalytics = async () => {
    setLoading(true);
    try {
      if (!window.ethereum) {
        setLoading(false);
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
        setLoading(false);
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
        console.error("Wrong network for analytics. Please switch to BSC Testnet (97).");
        setLoading(false);
        return;
      }

      const signer = await provider.getSigner();
      const { lendingContract, scoreContract } = getContracts(signer);

      if (lendingContract && lendingContract.target !== ethers.ZeroAddress) {
        console.log("Lending Address:", lendingContract.target);
        const code = await provider.getCode(lendingContract.target);
        if (code === "0x" || code === "0x0") {
          console.error("Lending contract not found on this network");
          setLoading(false);
          return;
        }
      } else {
        setLoading(false);
        return;
      }

      // 1. Compute TVL directly from HybridLending Contract logic
      const poolValueRaw = await lendingContract.getTotalPoolValue();
      const tvlFormatted = Number(ethers.formatEther(poolValueRaw));

      // 2. Compute Borrower Metrics via Promise.all on MOCK_BORROWER_LIST
      let activeLoansCount = 0;
      let primeCount = 0, fairCount = 0, poorCount = 0;
      let safeCount = 0, warnCount = 0, dangerCount = 0;
      const feed = [];

      const queryPromises = MOCK_BORROWER_LIST.map(async (address) => {
          try {
             const loan = await lendingContract.getUserLoan(address);
             if (!loan.isActive) return;

             activeLoansCount++;

             // Fetch dynamic credit score
             const scoreRaw = await scoreContract.getScore(address);
             const score = Number(scoreRaw);
             if (score >= 700) primeCount++;
             else if (score >= 500) fairCount++;
             else poorCount++;

             // Fetch dynamic Health Factor
             const hfRaw = await lendingContract.getHealthFactor(address);
             const hf = hfRaw === ethers.MaxUint256 ? 99 : Number(ethers.formatUnits(hfRaw, 18));
             
             if (hf > 1.5) safeCount++;
             else if (hf >= 1.0 && hf <= 1.5) warnCount++;
             else dangerCount++;

             // Populate the mock live liquidation feed
             feed.push({
               borrower: address.slice(0,6) + "..." + address.slice(-4),
               debt: Number(ethers.formatEther(loan.debtAmount)).toFixed(2) + " mUSD",
               collateral: Number(ethers.formatEther(loan.collateralAmount)).toFixed(4) + " BNB",
               status: hf < 1.0 ? "Liquidatable" : "Active"
             });

          } catch (e) {
             console.error(`Error processing analytics for ${address}`, e);
          }
      });

      await Promise.all(queryPromises);

      // Edge case: UI requires at least 1 count to render Recharts pie slices without crashing visually
      const safeDiv = safeCount + warnCount + dangerCount === 0;

      setStats({
          tvl: tvlFormatted,
          borrowers: activeLoansCount,
          apy: 8.5 // Mock APY
      });

      setRiskDistribution([
         { name: "Prime (700+)", value: safeDiv ? 1 : primeCount, color: "#8b5cf6" },
         { name: "Fair (500-699)", value: safeDiv ? 1 : fairCount, color: "#6366f1" },
         { name: "Poor (300-499)", value: safeDiv ? 1 : poorCount, color: "#3b82f6" },
      ]);

      setHealthDistribution([
         { name: "Safe (>1.5)",   Safe: safeCount, Warning: 0, Danger: 0 },
         { name: "Warning (1.0-1.5)", Safe: 0, Warning: warnCount, Danger: 0 },
         { name: "Danger (<1.0)",  Safe: 0, Warning: 0, Danger: dangerCount },
      ]);

      setLiveLiquidations(feed);

    } catch (err) {
      console.error("Analytics extraction failed", err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-24">
      {/* Header */}
      <div className="text-center pt-10">
         <motion.h1
          className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300 mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Lender Pool Analytics
        </motion.h1>
         <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
          Transparent, mathematically protected yields generated through
          dynamically priced debt and automated Keeper liquidations.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-indigo-400 font-mono animate-pulse border border-zinc-800 rounded-3xl">
           Synchronizing On-Chain Vectors...
        </div>
      ) : (
      <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Total Value Locked",
            value: `${stats.tvl.toLocaleString(undefined, {maximumFractionDigits: 2})} mUSD`,
            icon: <Disc className="text-blue-400" />,
            color: "border-blue-500/30",
          },
          {
            label: "Active Borrowers",
            value: stats.borrowers,
            icon: <Users className="text-indigo-400" />,
            color: "border-indigo-500/30",
          },
          {
            label: "Average APR",
            value: `${stats.apy}%`,
            icon: <Activity className="text-green-400" />,
            color: "border-green-500/30",
          },
          {
            label: "Total Processed",
            value: "0",
            icon: <ShieldAlert className="text-red-400" />,
            color: "border-red-500/30",
          },
        ].map((kpi, i) => (
           <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-[#0a0f1d]/50 backdrop-blur-md rounded-2xl p-6 border ${kpi.color} shadow-lg relative overflow-hidden group`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-zinc-400 font-semibold">{kpi.label}</span>
              <div className="p-2 bg-white/5 rounded-lg border border-zinc-800 group-hover:scale-110 transition-transform">
                {kpi.icon}
              </div>
            </div>
            <span className="text-3xl font-black text-white">
              {kpi.value}
            </span>
             <div
              className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent to-${kpi.color.split("-")[1]}-500/50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left`}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Donut Chart: Score Distribution */}
         <motion.div className="bg-[#0a0f1d]/50 backdrop-blur-md border border-zinc-800 p-6 rounded-2xl col-span-1 shadow-xl">
           <h3 className="text-xl font-bold text-white mb-6">
            Credit Score Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0f1d",
                    borderRadius: "10px",
                    borderColor: "#1f2937",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-6">
            {riskDistribution.map((item, i) => (
              <div key={i} className="flex items-center text-xs text-zinc-400">
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                ></span>
                {item.name}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bar Chart: Health Factor Tiers */}
         <motion.div className="bg-[#0a0f1d]/50 backdrop-blur-md border border-zinc-800 p-6 rounded-2xl col-span-2 shadow-xl">
           <h3 className="text-xl font-bold text-white mb-6">
            Aggregate Health Matrix
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={healthDistribution}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  tick={{ fill: "#9ca3af" }}
                />
                <YAxis stroke="#6b7280" tick={{ fill: "#9ca3af" }} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{
                    backgroundColor: "#0a0f1d",
                    borderRadius: "10px",
                    borderColor: "#1f2937",
                  }}
                />
                <Legend iconType="circle" />
                <Bar
                   dataKey="Safe"
                  stackId="a"
                   fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                   dataKey="Warning"
                  stackId="a"
                   fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                   dataKey="Danger"
                  stackId="a"
                   fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Feed */}
       <motion.div className="bg-[#0a0f1d]/50 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
         <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
           <h3 className="text-xl font-bold text-white">
            Live Protocol Feed
          </h3>
           <ArrowUpRight className="text-zinc-500 cursor-pointer hover:text-white transition-colors" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
             <thead className="text-xs text-zinc-500 uppercase bg-black/20 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Borrower
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                   Active Debt
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                   Collateral Array
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
               {liveLiquidations.length === 0 ? (
                  <tr>
                     <td colSpan="4" className="text-center p-8 text-zinc-600">No active positions tracked in the localized EVM segment.</td>
                  </tr>
               ) : (
                 liveLiquidations.map((liq, i) => (
                   <tr
                    key={i}
                     className="border-b border-zinc-800 hover:bg-white/[0.02] transition-colors"
                  >
                     <td className="px-6 py-4 font-medium text-indigo-400">
                      {liq.borrower}
                    </td>
                     <td className="px-6 py-4 text-zinc-300">{liq.debt}</td>
                     <td className="px-6 py-4 text-zinc-300">{liq.collateral}</td>
                    <td className="px-6 py-4">
                      <span
                         className={`px-3 py-1 rounded-full text-xs font-bold border ${liq.status === "Liquidatable" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"}`}
                      >
                        {liq.status}
                      </span>
                    </td>
                  </tr>
                 ))
               )}
            </tbody>
          </table>
        </div>
      </motion.div>
      </>
      )}
    </div>
  );
};

export default Analytics;
