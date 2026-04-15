import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, WalletCards, Activity, Zap, LogOut, Download } from "lucide-react";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import LenderDashboard from "./pages/LenderDashboard";
import Analytics from "./pages/Analytics";
import Liquidations from "./pages/Liquidations";
import Login from "./pages/Login";

const Navbar = ({ role, setRole }) => {
  const location = useLocation();
  const navigate = useNavigate();

  if (!role) return null;

  const handleLogout = () => {
    localStorage.removeItem('role');
    setRole(null);
    navigate('/');
  };

  const borrowerLinks = [
    { path: "/borrow/story", label: "Protocol Story", icon: <Zap size={18} /> },
    { path: "/borrow/dashboard", label: "Credit Dashboard", icon: <LayoutDashboard size={18} /> }
  ];

  const lenderLinks = [
    { path: "/lend/story", label: "Protocol Story", icon: <Zap size={18} /> },
    { path: "/lend/dashboard", label: "Earn Console", icon: <Download size={18} /> },
    { path: "/lend/analytics", label: "Pool Analytics", icon: <Activity size={18} /> },
    { path: "/lend/liquidations", label: "Liquidations", icon: <WalletCards size={18} /> },
  ];

  const links = role === 'borrower' ? borrowerLinks : lenderLinks;

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
           <Link to={role === 'borrower' ? '/borrow/story' : '/lend/story'} className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition">
            <div className="w-10 h-10 rounded-full bg-zinc-800 p-[1px] flex items-center justify-center">
              <span className="text-zinc-100 font-extrabold text-lg">G</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-zinc-100">
              Global Credit
            </span>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex space-x-2 pr-6 border-r border-zinc-800">
              <span className={`text-xs font-mono uppercase tracking-widest self-center mr-4 ${role === 'borrower' ? 'text-blue-500' : 'text-indigo-500'}`}>
                {role} Mode
              </span>
              {links.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-300 ${
                      isActive
                        ? "text-zinc-100 bg-zinc-800/50"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span className="relative z-10 flex items-center space-x-2">
                      {link.icon}
                      <span className="font-semibold text-sm">{link.label}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
            <button 
               onClick={handleLogout}
               className="text-zinc-500 hover:text-red-400 transition flex items-center gap-1 border border-zinc-800 px-3 py-1.5 rounded-lg text-sm bg-zinc-900 shadow-sm"
            >
              <LogOut size={16} /> Exit
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const AnimatedRoutes = ({ setRole }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Login setRole={setRole} />} />
        
        {/* Borrower Routes */}
        <Route path="/borrow/story" element={<Landing />} />
        <Route path="/borrow/dashboard" element={<Dashboard />} />
        <Route path="/borrow" element={<Dashboard />} />
        
        {/* Lender Routes */}
        <Route path="/lend/story" element={<Landing />} />
        <Route path="/lend/dashboard" element={<LenderDashboard />} />
        <Route path="/lend/analytics/*" element={<Analytics />} />
        <Route path="/lend/liquidations/*" element={<Liquidations />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const [role, setRole] = useState(localStorage.getItem('role') || null);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-zinc-800 overflow-x-hidden relative">
        <div className="fixed top-0 left-1/4 w-[50rem] h-[50rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[40rem] h-[40rem] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

        <Navbar role={role} setRole={setRole} />

        <main className={`${role ? 'pt-24' : 'pt-0'} pb-16 relative z-10 min-h-screen`}>
          <AnimatedRoutes setRole={setRole} />
        </main>
        
        {/* Demo Mode Badge */}
        <div className="fixed bottom-6 right-6 z-[100] px-3 py-1.5 rounded-lg bg-zinc-900/80 backdrop-blur-md border border-white/5 flex items-center gap-2 pointer-events-none shadow-xl">
           <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
           <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Demo Mode Enabled</span>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
