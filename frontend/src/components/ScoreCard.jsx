import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const ScoreCard = ({ score, isVerified }) => {
  const [animatedScore, setAnimatedScore] = useState(300);

  useEffect(() => {
    // Simple counter animation
    let start = animatedScore;
    const end = score || 500;
    if (start === end) return;
    const duration = 1000;
    const increment = (end - start) / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) {
        start = end;
        clearInterval(timer);
      }
      setAnimatedScore(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  // Determine colors based on score
  let ringColor = "from-red-500 to-red-600";
  let dropShadow = "drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]";
  let statusText = "POOR";
  let textColor = "text-red-400";

  if (score >= 700) {
    ringColor = "from-green-400 to-emerald-600";
    dropShadow = "drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]";
    statusText = "PRIME";
    textColor = "text-green-400";
  } else if (score >= 500) {
    ringColor = "from-yellow-400 to-orange-500";
    dropShadow = "drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]";
    statusText = "FAIR";
    textColor = "text-yellow-400";
  }

  // Calculate SVG stroke DashOffset
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.max(0, animatedScore - 300);
  const percentage = normalizedScore / 700; // max score diff is 1000 - 300 = 700
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <div
      className={`relative bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center justify-center space-y-6 ${dropShadow} transition-all duration-500 hover:scale-[1.02]`}
    >
      <div className="absolute top-4 left-4">
        {isVerified ? (
          <span className="flex items-center gap-2 text-xs font-bold px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full shadow-inner shadow-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />{" "}
            SOULBOUND
          </span>
        ) : (
          <span className="flex items-center gap-2 text-xs font-bold px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full shadow-inner shadow-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />{" "}
            KYC REQUIRED
          </span>
        )}
      </div>

      <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest mt-4">
        Credit Score
      </h2>

      <div className="relative flex items-center justify-center w-48 h-48">
        {/* Background Track */}
        <svg className="absolute w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-gray-800"
          />
        </svg>

        {/* Animated Progress Ring */}
        <svg className="absolute w-full h-full transform -rotate-90">
          <defs>
            <linearGradient
              id="score-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                className={
                  score >= 700
                    ? "stop-color-emerald-400"
                    : score >= 500
                      ? "stop-color-yellow-400"
                      : "stop-color-red-400"
                }
                stopColor="currentColor"
              />
              <stop
                offset="100%"
                className={
                  score >= 700
                    ? "stop-color-green-600"
                    : score >= 500
                      ? "stop-color-orange-500"
                      : "stop-color-red-600"
                }
                stopColor="currentColor"
              />
            </linearGradient>
          </defs>
          <motion.circle
            cx="96"
            cy="96"
            r={radius}
            stroke="url(#score-gradient)"
            strokeWidth="12"
            fill="transparent"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeInOut" }}
            strokeDasharray={circumference}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-white">
            {animatedScore}
          </span>
          <span
            className={`text-sm font-bold tracking-widest mt-1 ${textColor}`}
          >
            {statusText}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ScoreCard;
