import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, WalletCards, Activity, Zap } from "lucide-react";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Liquidations from "./pages/Liquidations";

const Navbar = () => {
  const location = useLocation();

  const links = [
    { path: "/", label: "Story", icon: <Zap size={18} /> },
    {
      path: "/borrow",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    {
      path: "/analytics",
      label: "Pool Analytics",
      icon: <Activity size={18} />,
    },
    {
      path: "/liquidations",
      label: "Liquidations",
      icon: <WalletCards size={18} />,
    },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#0a0f1d]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-[1px]">
              <div className="w-full h-full rounded-full bg-[#0a0f1d] flex items-center justify-center">
                <span className="text-white font-extrabold text-lg">G</span>
              </div>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
              Global Credit
            </span>
          </div>
          <div className="hidden md:flex space-x-2">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-300 ${
                    isActive
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-white/10 rounded-xl"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center space-x-2">
                    {link.icon}
                    <span className="font-semibold text-sm">{link.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/borrow" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/liquidations" element={<Liquidations />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#060813] text-gray-200 font-sans selection:bg-blue-500/30 overflow-x-hidden">
        {/* Ambient background glows */}
        <div className="fixed top-0 left-1/4 w-[50rem] h-[50rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[40rem] h-[40rem] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

        <Navbar />

        <main className="pt-24 pb-16 relative z-10 min-h-screen">
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
