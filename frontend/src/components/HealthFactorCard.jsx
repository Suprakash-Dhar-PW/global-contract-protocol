import React, { useEffect, useState } from "react";

const HealthFactorCard = ({ healthFactor, bnbPrice }) => {
  const [pulse, setPulse] = useState(false);

  // Trigger price pulse animation when bnbPrice changes
  useEffect(() => {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 1000);
    return () => clearTimeout(timer);
  }, [bnbPrice]);

  // Determine status and colors based on health factor
  // If healthFactor is null or extremely high (type(uint256).max equivalent), treat as Safe/No Loan
  const isNoLoan = healthFactor === null || healthFactor > 10000;

  let statusText = "SAFE";
  let statusColor = "text-green-500";
  let barColor = "from-green-400 to-green-600";
  let containerDanger = "";

  if (!isNoLoan) {
    if (healthFactor <= 1.1) {
      statusText = "DANGER";
      statusColor = "text-red-500 animate-pulse";
      barColor = "from-red-500 to-red-700";
      containerDanger = "ring-2 ring-red-500 animate-pulse";
    } else if (healthFactor <= 1.5) {
      statusText = "CAUTION";
      statusColor = "text-yellow-500";
      barColor = "from-yellow-400 to-orange-500";
    }
  }

  // Calculate bar width: min(healthFactor * 50%, 100%)
  // If no loan, map to 100%
  const barWidth = isNoLoan ? 100 : Math.min(healthFactor * 50, 100);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 shadow-2xl transition-all duration-500 hover:shadow-blue-500/10 ${containerDanger}`}
    >
      {/* Decorative gradient orb */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />

      <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-6 drop-shadow-sm">
        Live Risk Engine
      </h3>

      <div className="space-y-6 relative z-10">
        <div className="flex justify-between items-center group">
          <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">
            BNB Price (USD)
          </span>
          <span
            className={`text-2xl font-black text-white transition-all duration-300 ${pulse ? "scale-110 text-blue-400" : ""}`}
          >
            {bnbPrice === 0 ? (
              <div className="h-6 w-24 bg-gray-800 rounded animate-pulse" />
            ) : (
              `$${bnbPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            )}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span
            className="text-gray-400 font-bold uppercase tracking-widest text-xs cursor-help"
            title="Health Factor = Collateral Value / Required Collateral Value"
          >
            Health Factor
          </span>
          <div className="flex items-center space-x-3">
            <span
              className={`text-4xl font-black ${statusColor} drop-shadow-[0_0_10px_currentColor]`}
            >
              {isNoLoan || healthFactor === null
                ? "∞"
                : healthFactor.toFixed(2)}
            </span>
            {!isNoLoan && (
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 ${statusColor}`}
              >
                {statusText}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs text-gray-500 uppercase tracking-widest font-black">
            <span>Danger &lt; 1.0</span>
            <span>Safe</span>
          </div>
          <div className="h-4 w-full bg-[#0a0f1d]/50 border border-white/5 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-sm">
          <span className="text-red-400 px-3 py-1.5 bg-red-500/10 rounded-md ring-1 ring-red-500/20 font-bold text-xs uppercase tracking-wide">
            Keeper Engine Active
          </span>
        </div>
      </div>
    </div>
  );
};

export default HealthFactorCard;
