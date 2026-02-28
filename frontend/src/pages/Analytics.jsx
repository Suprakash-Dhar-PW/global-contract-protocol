import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

// Mock Data for hackathon demo scaling since we can't iterate blockchain states easily without TheGraph
const riskDistribution = [
  { name: "Prime (700+)", value: 65, color: "#10B981" },
  { name: "Fair (500-699)", value: 25, color: "#F59E0B" },
  { name: "Poor (300-499)", value: 10, color: "#EF4444" },
];

const healthDistribution = [
  { name: "Safe (>1.5)", Safe: 85, Warning: 0, Danger: 0 },
  { name: "Warning (1.1-1.5)", Safe: 0, Warning: 10, Danger: 0 },
  { name: "Danger (<1.1)", Safe: 0, Warning: 0, Danger: 5 },
];

const mockLiquidations = [
  {
    borrower: "0x12..34C",
    debt: "15,000 mUSD",
    collateral: "5.2 BNB",
    status: "Liquidated",
  },
  {
    borrower: "0x98..21B",
    debt: "2,400 mUSD",
    collateral: "0.9 BNB",
    status: "Liquidated",
  },
  {
    borrower: "0xFE..89D",
    debt: "89,000 mUSD",
    collateral: "31.4 BNB",
    status: "At Risk",
  },
];

const Analytics = () => {
  const [stats, setStats] = useState({ tvl: 0, borrowers: 0, apy: 0 });

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setStats({
        tvl: 4520930,
        borrowers: 1284,
        apy: 12.4,
      });
    }, 1000);
  }, []);

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
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Transparent, mathematically protected yields generated through
          dynamically priced debt and automated Keeper liquidations.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Total Value Locked",
            value: `$${stats.tvl.toLocaleString()}`,
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
            label: "Recent Liquidations",
            value: "24",
            icon: <ShieldAlert className="text-red-400" />,
            color: "border-red-500/30",
          },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-white/5 backdrop-blur-md rounded-2xl p-6 border ${kpi.color} shadow-lg relative overflow-hidden group`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-400 font-semibold">{kpi.label}</span>
              <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover:scale-110 transition-transform">
                {kpi.icon}
              </div>
            </div>
            {stats.tvl === 0 ? (
              <div className="h-10 w-32 bg-gray-800 rounded animate-pulse" />
            ) : (
              <span className="text-3xl font-black text-white">
                {kpi.value}
              </span>
            )}
            <div
              className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent to-${kpi.color.split("-")[1]}-500/50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left`}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Donut Chart: Score Distribution */}
        <motion.div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl col-span-1 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-6">
            User Risk Distribution
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
              <div key={i} className="flex items-center text-xs text-gray-400">
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
        <motion.div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl col-span-2 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-6">
            Aggregate Loan Health
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
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Warning"
                  stackId="a"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Danger"
                  stackId="a"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Feed */}
      <motion.div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">
            Live Liquidation Feed
          </h3>
          <ArrowUpRight className="text-gray-500 cursor-pointer hover:text-white transition-colors" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-black/20 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Borrower
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Debt Repaid
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Collateral Seized
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {mockLiquidations.map((liq, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-blue-400">
                    {liq.borrower}
                  </td>
                  <td className="px-6 py-4 text-gray-300">{liq.debt}</td>
                  <td className="px-6 py-4 text-gray-300">{liq.collateral}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${liq.status === "Liquidated" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}
                    >
                      {liq.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
