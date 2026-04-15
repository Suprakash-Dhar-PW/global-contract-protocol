import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import { getContracts } from "../utils/contract";
import { ArrowDownCircle, ArrowUpCircle, Wallet, AlertCircle, Coins, CheckCircle2, XCircle } from "lucide-react";

const Notification = ({ message, type, onClose }) => (
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

const LenderDashboard = () => {
  const [address, setAddress] = useState("");
  const [signer, setSigner] = useState(null);
  
  const [sharesStr, setSharesStr] = useState("0");
  const [mUsdValueStr, setMUsdValueStr] = useState("0");
  const [walletBalance, setWalletBalance] = useState("0");
  const [poolLiquidity, setPoolLiquidity] = useState("0");
  const [mockApy] = useState(8.5);

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawShares, setWithdrawShares] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
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
    setSigner(null);

    // 1 & 2. Force MetaMask Only & Block others (Phantom, etc.)
    const { ethereum } = window;
    let metaMaskProvider = ethereum;

    if (ethereum?.providers) {
      metaMaskProvider = ethereum.providers.find(p => p.isMetaMask);
    }

    if (!metaMaskProvider || !metaMaskProvider.isMetaMask) {
      notify("MetaMask is required. Please install MetaMask and disable other wallets.", "error");
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

      setSigner(tempSigner);
      setAddress(tempAddress);
      
      fetchLenderData(tempSigner, tempAddress);
    } catch (err) {
      console.error("Wallet connection failed", err);
      if (err.code === 4902) {
        notify("BSC Testnet not found in MetaMask", "error");
      } else {
        notify("Failed to connect wallet", "error");
      }
    }
  };

  const fetchLenderData = async (activeSigner, userAddress) => {
    try {
      // Network Validation
      const currentNetwork = await activeSigner.provider.getNetwork();
      if (Number(currentNetwork.chainId) !== 97) {
        console.warn("User is on wrong network:", currentNetwork.chainId);
        notify("Connect to BSC Testnet (Chain ID: 97)", "error");
        return;
      }

      const { lendingContract, mUSDContract } = getContracts(activeSigner);
      
      // 4. Fix Contract Initialization - Add logs and check code
      if (lendingContract && lendingContract.target !== ethers.ZeroAddress) {
        console.log("Lending Address:", lendingContract.target);
        
        const code = await activeSigner.provider.getCode(lendingContract.target);
        if (code === "0x" || code === "0x0") {
          console.error("No contract found at address:", lendingContract.target);
          notify("Contract not found on this network", "error");
          return;
        }
      }

      // Individual calls with fallback to prevent whole-page crash on RPC glitches
      const safeCall = async (fn, fallback = 0n) => {
          try { 
              const res = await fn(); 
              return res !== undefined ? res : fallback;
          } catch (e) { 
              console.error("Contract call failed:", e); 
              return fallback; 
          }
      };

      const shares = await safeCall(() => lendingContract.lenderShares(userAddress), 0n);
      const totalShares = await safeCall(() => lendingContract.totalShares(), 0n);
      const poolValue = await safeCall(() => lendingContract.getTotalPoolValue(), 0n);
      
      let userValue = "0";
      if (totalShares > 0n && shares > 0n) {
          try {
            const valueNative = (shares * poolValue) / totalShares;
            userValue = ethers.formatEther(valueNative);
          } catch (e) {
            console.error("Error calculating user value:", e);
          }
      }

      setSharesStr(ethers.formatEther(shares));
      setMUsdValueStr(userValue);
      setPoolLiquidity(ethers.formatEther(poolValue));

      if (mUSDContract) {
          const bal = await safeCall(() => mUSDContract.balanceOf(userAddress), 0n);
          setWalletBalance(ethers.formatEther(bal));
      }

    } catch (e) {
      console.error("Error fetching lender data:", e);
    }
  };

  const handleMintTestTokens = async () => {
    if (!signer) return;
    setIsLoading(true);
    try {
      const { mUSDContract } = getContracts(signer);
      const mintTx = await mUSDContract.mint(address, ethers.parseEther("5000"));
      await mintTx.wait();
      notify("Minted 5,000 Test mUSD successfully!");
      fetchLenderData(signer, address);
    } catch (err) {
      console.error(err);
      notify("Minting failed", "error");
    }
    setIsLoading(false);
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) return;
    
    setIsLoading(true);
    try {
      const { lendingContract, mUSDContract } = getContracts(signer);
      const parsedAmount = ethers.parseEther(depositAmount);

      const approveTx = await mUSDContract.approve(lendingContract.target, parsedAmount);
      await approveTx.wait();

      const depositTx = await lendingContract.deposit(parsedAmount);
      await depositTx.wait();

      notify("Liquidity supplied successfully!");
      setDepositAmount("");
      fetchLenderData(signer, address);
    } catch (error) {
      console.error(error);
      notify("Deposit failed. Check balance/approval.", "error");
    }
    setIsLoading(false);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawShares || Number(withdrawShares) <= 0) return;

    setIsLoading(true);
    try {
      const { lendingContract } = getContracts(signer);
      const parsedShares = ethers.parseEther(withdrawShares);

      const withdrawTx = await lendingContract.withdraw(parsedShares);
      await withdrawTx.wait();

      notify("Funds withdrawn successfully!");
      setWithdrawShares("");
      fetchLenderData(signer, address);
    } catch (error) {
      console.error(error);
      notify("Withdrawal failed. Insufficient shares?", "error");
    }
    setIsLoading(false);
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-32 relative">
      <AnimatePresence>
        {notification && <Notification {...notification} />}
      </AnimatePresence>

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              Earn Console
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-500 uppercase tracking-widest">Lender Mode</span>
          </div>
          <p className="text-zinc-500 text-sm font-medium">
            Provide liquidity in mUSD to earn yield from borrower interest.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={addTokenToMetaMask}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-black uppercase tracking-widest border border-zinc-700 transition-all flex items-center gap-2"
          >
            <Coins size={14} className="text-emerald-400" /> Track mUSD
          </button>
          
          <button 
            onClick={handleMintTestTokens}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest border border-zinc-700 transition-all flex items-center gap-2"
          >
            <Coins size={14} className="text-teal-400" /> Mint 5k mUSD
          </button>
          
          <button 
            onClick={connectWallet}
            className="flex items-center space-x-3 bg-zinc-900/50 border border-white/5 px-4 py-2.5 rounded-xl backdrop-blur-md hover:bg-zinc-800 transition-all active:scale-[0.98]"
          >
            <Wallet size={16} className="text-emerald-400" />
            <span className="text-xs font-bold text-zinc-300 font-mono">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)} (BSC Testnet)` : "Connect MetaMask"}
            </span>
          </button>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Global Pool Liquidity", value: Number(poolLiquidity).toFixed(2), unit: "mUSD", color: "emerald" },
          { label: "Your Supplied Capital", value: Number(mUsdValueStr).toFixed(2), unit: "mUSD", color: "teal" },
          { label: "Wallet Principal", value: Number(walletBalance).toFixed(2), unit: "mUSD", color: "zinc" },
          { label: "Net Fixed APY", value: mockApy, unit: "%", color: "blue" },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }} 
            className="group bg-white/5 border border-white/10 p-6 rounded-[1.5rem] flex flex-col justify-between hover:border-emerald-500/30 transition-all shadow-lg relative overflow-hidden"
          >
            <div className={`absolute -right-4 -bottom-4 w-16 h-16 bg-${stat.color}-500/5 rounded-full blur-xl group-hover:bg-${stat.color}-500/10 transition-all`} />
            <h3 className="text-zinc-500 font-bold uppercase tracking-[0.15em] text-[10px] mb-4 relative z-10">{stat.label}</h3>
            <div className="relative z-10">
              <p className="text-3xl font-black text-white">{stat.value} <span className={`text-${stat.color}-400 text-sm font-bold tracking-widest ml-1 uppercase`}>{stat.unit}</span></p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
              <h2 className="text-xl font-black flex items-center gap-3 mb-8 relative z-10 text-emerald-400 uppercase tracking-widest">
                <ArrowDownCircle className="text-emerald-400" /> Supply Capital
              </h2>
              <form onSubmit={handleDeposit} className="space-y-6 relative z-10">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-[0.2em]">Deposit Amount (mUSD)</label>
                  <div className="relative group">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="block w-full rounded-2xl bg-[#0a0f1d]/80 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] border border-white/5 focus:border-emerald-500/50 text-white p-4 font-mono text-lg outline-none transition-all"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                    <span className="absolute right-4 top-4 text-zinc-600 font-bold group-focus-within:text-emerald-500 transition-colors">mUSD</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !depositAmount}
                  className="w-full py-4 rounded-2xl font-black text-white text-lg transition-all shadow-[0_4px_30px_rgba(16,185,129,0.2)] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-zinc-800 disabled:to-zinc-900 disabled:text-zinc-600 active:scale-[0.98] border border-emerald-500/20"
                >
                  {isLoading ? "Executing..." : "Activate Deposit"}
                </button>
              </form>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
              <h2 className="text-xl font-black flex items-center gap-3 mb-8 relative z-10 text-teal-400 uppercase tracking-widest">
                <ArrowUpCircle className="text-teal-400" /> Withdraw Earnings
              </h2>
              {Number(sharesStr) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/5 rounded-2xl opacity-40">
                  <Coins size={32} className="mb-2" />
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">No Liquidity Supplied</p>
                </div>
              ) : (
                <form onSubmit={handleWithdraw} className="space-y-6 relative z-10">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-[0.2em]">Withdraw Amount (Shares)</label>
                    <div className="relative group">
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="0.00"
                        className="block w-full rounded-2xl bg-[#0a0f1d]/80 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] border border-white/5 focus:border-teal-500/50 text-white p-4 font-mono text-lg outline-none transition-all"
                        value={withdrawShares}
                        onChange={(e) => setWithdrawShares(e.target.value)}
                      />
                      <span className="absolute right-4 top-4 text-zinc-600 font-bold group-focus-within:text-teal-500 transition-colors">SHARES</span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !withdrawShares}
                    className="w-full py-4 rounded-2xl font-black text-white text-lg transition-all shadow-[0_4px_30px_rgba(20,184,166,0.2)] bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-900 active:scale-[0.98] border border-teal-500/20"
                  >
                    {isLoading ? "Executing..." : "Collect Capital"}
                  </button>
                  <div className="flex items-start gap-2 p-4 rounded-xl bg-teal-500/5 border border-teal-500/10 text-teal-500/60 text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                      <span>Burns protocol shares to unlock underlying principal + accrued yield.</span>
                  </div>
                </form>
              )}
          </motion.div>
      </div>
    </div>
  );
};

export default LenderDashboard;
