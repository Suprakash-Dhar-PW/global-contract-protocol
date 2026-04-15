import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LineChart } from 'lucide-react';

const Login = ({ setRole }) => {
  const navigate = useNavigate();

  const handleLogin = (role) => {
    localStorage.setItem('role', role);
    setRole(role);
    navigate(role === 'borrower' ? '/borrow/story' : '/lend/story');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-32 text-center">
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold bg-clip-text text-zinc-100 mb-12"
      >
        Select Your Gateway
      </motion.h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div 
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.1 }}
           className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl hover:bg-zinc-800/80 transition cursor-pointer shadow-xl flex flex-col items-center"
           onClick={() => handleLogin('borrower')}
        >
          <ShieldCheck className="w-16 h-16 text-blue-500 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Borrower Console</h2>
          <p className="text-zinc-400">Mint your identity and manage collateralized loops.</p>
        </motion.div>

        <motion.div 
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.2 }}
           className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl hover:bg-zinc-800/80 transition cursor-pointer shadow-xl flex flex-col items-center"
           onClick={() => handleLogin('lender')}
        >
          <LineChart className="w-16 h-16 text-indigo-500 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Lender Console</h2>
          <p className="text-zinc-400">Provide liquidity, monitor risk metrics, and earn yield.</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
