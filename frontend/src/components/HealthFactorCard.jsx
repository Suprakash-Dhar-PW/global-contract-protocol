import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck, Info } from "lucide-react";

const HealthFactorCard = ({ healthFactor, bnbPrice, theme = "blue" }) => {
  const isPurple = theme === "purple";
  const primaryColor = isPurple ? "purple" : "blue";
  
  const hfValue = healthFactor ? parseFloat(healthFactor).toFixed(2) : "--";
  const hfStatus = healthFactor >= 1.5 ? "Secure" : healthFactor >= 1.1 ? "Caution" : "Danger";
  const statusColor = healthFactor >= 1.5 ? "emerald" : healthFactor >= 1.1 ? "orange" : "red";

  return (
    <div className="relative group">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
      >
        {/* Dynamic glow based on status */}
        <div className={`absolute inset-0 bg-gradient-to-br from-${statusColor}-500/5 to-transparent pointer-events-none opacity-40`} />
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em]">Position Health Factor</h3>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-${statusColor}-500/10 border border-${statusColor}-500/20`}>
              <div className={`w-1.5 h-1.5 rounded-full bg-${statusColor}-400 animate-pulse`} />
              <span className={`text-[10px] font-black text-${statusColor}-400 uppercase tracking-widest`}>{hfStatus}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-7xl font-black tabular-nums tracking-tighter ${healthFactor && healthFactor < 1.1 ? 'text-red-400' : 'text-white'}`}>
              {hfValue}
            </span>
            {healthFactor && (
                <div className={`text-${statusColor}-500 mb-2`}>
                   {healthFactor >= 1.5 ? <ShieldCheck size={24} /> : <AlertTriangle size={24} />}
                </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-10">
            <div className={`bg-${primaryColor}-500/5 border border-${primaryColor}-500/10 p-4 rounded-2xl`}>
              <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">BNB Price</span>
              <p className="text-lg font-black text-white font-mono">${bnbPrice ? parseFloat(bnbPrice).toFixed(2) : "0.00"}</p>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
              <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Liquidation at</span>
              <p className="text-lg font-black text-red-500 font-mono tracking-tighter">&lt; 1.00 HF</p>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-medium leading-relaxed text-zinc-500">
             <div className="flex gap-2">
                <Info size={14} className={`flex-shrink-0 text-${primaryColor}-400`} />
                <p>If the Health Factor falls below 1.0, your collateral will be liquidated to cover the outstanding debt.</p>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HealthFactorCard;
