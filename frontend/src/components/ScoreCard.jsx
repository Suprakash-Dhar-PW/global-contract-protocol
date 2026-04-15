import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, Zap } from "lucide-react";

const ScoreCard = ({ score, isVerified, theme = "blue" }) => {
  const isPurple = theme === "purple";
  const primaryColor = isPurple ? "purple" : "blue";
  const secondaryColor = isPurple ? "orange" : "indigo";
  const glowColor = isPurple ? "rgba(168,85,247,0.4)" : "rgba(59,130,246,0.4)";

  return (
    <div className="relative group perspective-1000">
      <motion.div
        initial={{ opacity: 0, rotateY: -10 }}
        animate={{ opacity: 1, rotateY: 0 }}
        className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all duration-700 hover:shadow-[0_20px_80px_rgba(0,0,0,0.4)]"
      >
        {/* Animated background glow */}
        <div className={`absolute -top-24 -right-24 w-64 h-64 bg-${primaryColor}-500/10 rounded-full blur-[100px] group-hover:bg-${primaryColor}-500/20 transition-all duration-1000`} />
        <div className={`absolute -bottom-24 -left-24 w-64 h-64 bg-${secondaryColor}-500/10 rounded-full blur-[100px] group-hover:bg-${secondaryColor}-500/20 transition-all duration-1000`} />

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-10">
            <div className={`p-4 rounded-2xl bg-${primaryColor}-500/10 border border-${primaryColor}-500/20 text-${primaryColor}-400 shadow-[0_0_20px_rgba(0,0,0,0.2)]`}>
              <Zap size={24} />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Reputation Tier</span>
              <p className={`text-sm font-black text-${primaryColor}-400 uppercase tracking-widest`}>
                {score > 700 ? "Prime" : score > 500 ? "Gold" : "Standard"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center py-6">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">On-Chain Credit Score</h2>
            <div className="relative">
               {/* Radial shadow for number */}
              <div 
                className="absolute inset-0 blur-[40px] opacity-50"
                style={{ backgroundColor: glowColor }}
              />
              <span className="text-8xl font-black text-white relative z-10 tabular-nums tracking-tighter drop-shadow-2xl">
                {score}
              </span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full mt-8 overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(score / 900) * 100}%` }}
                    className={`h-full bg-gradient-to-r from-${primaryColor}-500 to-${secondaryColor}-500 shadow-[0_0_10px_${glowColor}]`}
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-10">
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
              <span className="block text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Status</span>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className={isVerified ? "text-emerald-400" : "text-zinc-600"} />
                <span className={`text-xs font-black ${isVerified ? "text-emerald-400" : "text-zinc-500"} uppercase`}>
                  {isVerified ? "Verified" : "Pending"}
                </span>
              </div>
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
              <span className="block text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Growth</span>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" />
                <span className="text-xs font-black text-emerald-400 uppercase">+12 pts</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ScoreCard;
