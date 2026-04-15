import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
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
import { Copy, AlertCircle, ShieldCheck, CheckCircle2, XCircle, Activity, Info, Coins } from "lucide-react";

const Notification = ({ message, type }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, x: "-50%" }}
    animate={{ opacity: 1, y: 0, x: "-50%" }}
    exit={{ opacity: 0, y: 20, x: "-50%" }}
    className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${
      type === "success" 
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
        : "bg-red-500/10 border-red-500/20 text-red-400"
    }`}
  >
    {type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
    <span className="font-bold text-sm tracking-wide">{message}</span>
  </motion.div>
);

const Dashboard = () => {
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState("");
  const [score, setScore] = useState(500);
  const [isVerified, setIsVerified] = useState(false);
  const [bnbPrice, setBnbPrice] = useState(0);
  const [healthFactor, setHealthFactor] = useState(null);
  const [poolLiquidity, setPoolLiquidity] = useState("0");

  const [activeLoan, setActiveLoan] = useState({
    collateral: 0,
    debt: 0,
    required: 0,
    isActive: false,
  });

  const [aadhaar, setAadhaar] = useState("");
  const [kycLoading, setKycLoading] = useState(false);
  const [repayLoading, setRepayLoading] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Run wallet connection only after user clicks "Connect Wallet"
    // No auto-execution on mount
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (acc) => acc.length > 0 ? connectWallet() : setAddress(""));
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, []);

  const notify = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const connectWallet = async () => {
    // 8. Clear Cached Wallets/Providers
    localStorage.clear();
    sessionStorage.clear();
    setAddress("");
    setProvider(null);

    // 1 & 2. Force MetaMask Only & Block others (Phantom, etc.)
    const { ethereum } = window;
    let metaMaskProvider = ethereum;

    if (ethereum?.providers) {
      metaMaskProvider = ethereum.providers.find(p => p.isMetaMask);
    }

    if (!metaMaskProvider || !metaMaskProvider.isMetaMask) {
      notify("MetaMask is required. Please uninstall other wallets or disable Phantom.", "error");
      return;
    }

    try {
      // 5. Force BSC Testnet Network (0x61 = 97)
      await metaMaskProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x61" }]
      });

      // 4. Request Wallet Connection
      await metaMaskProvider.request({ method: "eth_requestAccounts" });

      const tempProvider = new ethers.BrowserProvider(metaMaskProvider);
      
      // 6. Validate Network
      const network = await tempProvider.getNetwork();
      console.log("Connected Chain:", network.chainId);

      if (network.chainId !== 97n) {
        notify("Switch to BSC Testnet to continue", "error");
        return;
      }

      const tempSigner = await tempProvider.getSigner();
      const tempAddress = await tempSigner.getAddress();
      
      console.log("Wallet Connected:", tempAddress);
      notify("Connected to MetaMask (BSC Testnet)", "success");
      
      setProvider(tempProvider);
      setAddress(tempAddress);
      
      fetchUserData(tempSigner, tempAddress);
    } catch (err) {
      console.error("Connection error:", err);
      if (err.code === 4902) {
        notify("BSC Testnet not found in MetaMask", "error");
      } else {
        notify("Wallet connection failed", "error");
      }
    }
  };

  const fetchUserData = async (signer, userAddress, isSilent = false) => {
    try {
      const { identityContract, scoreContract, lendingContract } = getContracts(signer);
      
      // 4. Fix Contract Initialization - Add logs and improve discovery
      if (lendingContract && lendingContract.target !== ethers.ZeroAddress) {
        console.log("Lending Address:", lendingContract.target);
        
        const code = await signer.provider.getCode(lendingContract.target);
        if (code === "0x" || code === "0x0") {
          console.error("Lending contract not found at address:", lendingContract.target);
          if (!isSilent) notify("Contract not found on this network", "error");
          return;
        }
      }

      if (!isSilent) {
        if (identityContract) setIsVerified(await identityContract.isVerified(userAddress).catch(() => false));
        if (scoreContract) {
            const scoreVal = await scoreContract.getScore(userAddress).catch(() => 500n);
            setScore(Number(scoreVal));
        }
      }

      if (lendingContract) {
        const safeCall = async (fn, fallback) => {
            try { return await fn(); } catch (e) { console.error("Call failed:", e); return fallback; }
        };

        const price = await safeCall(() => lendingContract.getLatestBnbPrice(), 0n);
        const loanData = await safeCall(() => lendingContract.getUserLoan(userAddress), { isActive: false, collateralAmount: 0n, debtAmount: 0n });
        const riskParams = await safeCall(() => lendingContract.getRiskParameters(userAddress), [15000n, 13000n, 1000n, 0n]);
        const poolValue = await safeCall(() => lendingContract.getTotalPoolValue(), 0n);

        const priceNum = Number(ethers.formatUnits(price, 18));
        const debtFormattedValue = Number(ethers.formatUnits(loanData.debtAmount, 18));
        const collateralFormattedAmount = Number(ethers.formatUnits(loanData.collateralAmount, 18));
        const collateralFormattedValue = collateralFormattedAmount * priceNum;
        const liqThresholdBps = riskParams[1];
        const requiredCollat = (debtFormattedValue * Number(liqThresholdBps)) / 10000;

        setBnbPrice(priceNum);
        setPoolLiquidity(ethers.formatEther(poolValue));
        
        if (loanData.isActive && requiredCollat > 0) {
          setHealthFactor(collateralFormattedValue / requiredCollat);
        } else {
          setHealthFactor(null);
        }

        setActiveLoan({
          collateral: collateralFormattedValue,
          debt: debtFormattedValue,
          required: requiredCollat,
          isActive: loanData.isActive
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setKycLoading(true);
    try {
      const response = await fetch(import.meta.env.VITE_KYC_API_URL || "http://localhost:3001/api/kyc/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaarNumber: aadhaar, walletAddress: address }),
      });
      if (response.ok) {
        notify("KYC Successfully Authenticated");
        setIsVerified(true);
      } else {
        notify("KYC Verification Failed", "error");
      }
    } catch (error) {
      notify("Identity Server Offline", "error");
    }
    setKycLoading(false);
  };

  const handleRepay = async (isPartial) => {
    setRepayLoading(true);
    try {
      const activeSigner = await provider.getSigner();
      const { lendingContract, mUSDContract } = getContracts(activeSigner);
      
      const loanData = await lendingContract.getUserLoan(address);
      const amount = isPartial ? ethers.parseEther(partialAmount) : loanData.debtAmount;

      notify("Approving mUSD for repayment...");
      const txApprove = await mUSDContract.approve(lendingContract.target, amount);
      await txApprove.wait();

      notify("Confirming repayment on-chain...");
      const txRepay = isPartial ? await lendingContract.repayPartial(amount) : await lendingContract.repay();
      await txRepay.wait();

      notify(isPartial ? "Partial Liquidation Processed" : "Loan Position Closed Successfully", "success");
      setPartialAmount("");
      fetchUserData(activeSigner, address);
    } catch (err) {
      console.error(err);
      notify(err.reason || "Transaction Failed", "error");
    }
    setRepayLoading(false);
  };

  const addTokenToMetaMask = async () => {
    const mUSDAddress = import.meta.env.VITE_MUSD;
    if (!mUSDAddress || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: mUSDAddress,
            symbol: 'mUSD',
            decimals: 18,
            image: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
          },
        },
      });
      notify("mUSD added to MetaMask!");
    } catch (error) {
      console.error(error);
    }
  };

  const chartData = [{ name: "Current Position", Collateral: activeLoan.collateral, Debt: activeLoan.debt, Maintenance: activeLoan.required }];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-32 relative">
      <AnimatePresence>{notification && <Notification {...notification} />}</AnimatePresence>

      <motion.header 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-orange-400">
              Borrow Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] font-black text-purple-500 uppercase tracking-widest">Borrower Mode</span>
          </div>
          <p className="text-zinc-500 text-sm font-medium">Deploy tBNB collateral to mint protocol-backed mUSD liquidity.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={connectWallet}
            className="flex items-center space-x-3 bg-zinc-900/50 border border-white/5 px-4 py-2.5 rounded-xl backdrop-blur-md hover:bg-zinc-800 transition-all active:scale-[0.98]"
          >
            <div className={`h-2 w-2 rounded-full ${address ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500"}`} />
            <span className="text-xs font-bold text-zinc-300 font-mono">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)} (BSC Testnet)` : "Connect MetaMask"}
            </span>
            {address && <Copy size={14} className="text-zinc-600 hover:text-white cursor-pointer transition-colors" />}
          </button>
          <div className="flex gap-2">
            <button 
              onClick={addTokenToMetaMask}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-black uppercase tracking-widest border border-zinc-700 transition-all flex items-center gap-2"
            >
              <Coins size={14} className="text-orange-400" /> Track mUSD
            </button>
            {isVerified ? (
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={12} /> Identity Verified</span>
            ) : (
              <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5"><AlertCircle size={12} /> Unverified Identity</span>
            )}
            {activeLoan.isActive && (
               <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 ${healthFactor > 1.2 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-orange-400 bg-orange-500/10 border-orange-500/20 animate-pulse'}`}>
                 <Activity size={12} /> {healthFactor > 1.2 ? 'Position Healthy' : 'Liquidation Risk'}
               </span>
            )}
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8 text-orange-400">
          <ScoreCard score={score} isVerified={isVerified} theme="purple" />
          {isVerified && activeLoan.isActive && <HealthFactorCard healthFactor={healthFactor} bnbPrice={bnbPrice} theme="purple" />}
          {isVerified && !activeLoan.isActive && (
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center space-y-4 opacity-70">
              <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Info size={32} />
              </div>
              <h3 className="font-black text-white uppercase tracking-widest text-sm">No Open Positions</h3>
              <p className="text-xs text-zinc-500 font-medium">Supply tBNB to the left to execute your first loan.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 space-y-8">
          {!isVerified && address && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 backdrop-blur-xl border border-red-500/20 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 blur-[100px] pointer-events-none" />
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">Identity Authentication Required</h2>
              <p className="text-zinc-400 mb-8 max-w-lg text-sm font-medium">To maintain regulatory compliance and secure your reputation score, you must mint an identity SBT.</p>
              <form onSubmit={handleKycSubmit} className="space-y-6 max-w-md relative z-10">
                <input type="text" placeholder="12-DIGIT VERIFICATION KEY" className="block w-full rounded-2xl bg-[#0a0f1d]/80 border border-white/5 focus:border-red-500/50 text-white p-4 font-mono text-lg shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] outline-none" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} required maxLength={12} />
                <button type="submit" disabled={kycLoading} className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 font-black text-white text-lg transition-all active:scale-95 shadow-[0_4px_30px_rgba(220,38,38,0.3)]">
                  {kycLoading ? "PROVING..." : "MINT IDENTITY RECORD"}
                </button>
              </form>
            </motion.div>
          )}

          {isVerified && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-8">
                <LoanForm provider={provider} address={address} score={score} poolLiquidity={poolLiquidity} onBorrowSuccess={(msg, type) => {
                  if (msg) notify(msg, type || "success");
                  fetchUserData(provider.getSigner(), address);
                }} />
                {activeLoan.isActive && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
                    <h3 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-orange-400 mb-6 relative z-10 uppercase tracking-widest">Active Position</h3>
                    <div className="space-y-6 relative z-10">
                      <button onClick={() => handleRepay(false)} disabled={repayLoading} className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-black text-white transition-all shadow-xl active:scale-98 border border-white/5">
                        {repayLoading ? "PROCESSING..." : "CLOSE POSITION"}
                      </button>
                      <div className="pt-6 border-t border-white/5">
                        <label className="block text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Partial Repayment (mUSD)</label>
                        <div className="flex gap-2">
                          <input type="number" step="0.01" placeholder="0.00" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} className="flex-1 rounded-2xl bg-[#0a0f1d]/80 border border-white/5 text-white p-4 font-mono shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] outline-none" />
                          <button onClick={() => handleRepay(true)} disabled={repayLoading || !partialAmount} className="px-6 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-purple-400 font-black border border-white/5 transition-all">REPAY</button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl w-full flex flex-col relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent pointer-events-none" />
                <h3 className="text-xl font-black text-white mb-8 border-b border-white/5 pb-4 uppercase tracking-widest text-[10px] text-zinc-500">Risk Distribution Vector</h3>
                {!activeLoan.isActive ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 border-2 border-dashed border-white/5 rounded-3xl m-4">
                    <Activity size={48} className="mb-4 text-purple-400" />
                    <p className="text-sm font-black uppercase tracking-widest">Awaiting Active Debt</p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="name" stroke="#6b7280" hide />
                        <YAxis stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#0a0f1d", border: "none", borderRadius: "1rem", boxShadow: "0 10px 30px #000" }} />
                        <Bar dataKey="Collateral" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Debt" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Maintenance" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-500 mb-4 inline-block tracking-tighter">Financial Reliability Framework</h2>
        <p className="text-zinc-500 max-w-2xl mx-auto text-sm font-medium leading-relaxed mb-12 uppercase tracking-widest">Protocol-enforced risk parameters derived from real-time on-chain credit scoring.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
           {[
             { t: "Dynamic Collateralization", d: "Collateral ratios adjust based on Reputation Score to reward high-integrity borrowers." },
             { t: "Liquidation Arbitration", d: "Positions falling below maintenance thresholds are subject to instant automated clearing." },
             { t: "Yield Aggregation", d: "Interest paid by borrowers is distributed algorithmically to mUSD liquidity providers." }
           ].map((x, i) => (
             <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:bg-white/10 transition-all">
               <h4 className="font-black text-zinc-100 mb-2 uppercase tracking-wider text-xs">{x.t}</h4>
               <p className="text-zinc-500 text-xs font-medium leading-relaxed">{x.d}</p>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
