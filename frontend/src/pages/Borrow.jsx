import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import LoanForm from "../components/LoanForm";
import { getContracts } from "../utils/contract";

const Borrow = () => {
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState("");
  const [score, setScore] = useState(500);

  useEffect(() => {
    if (window.ethereum) {
      const initProvider = new ethers.BrowserProvider(window.ethereum);
      initProvider.getSigner().then(async (signer) => {
        const userAddr = await signer.getAddress();
        setProvider(initProvider);
        setAddress(userAddr);

        // Fetch dynamic score
        const { scoreContract } = getContracts(signer);
        if (scoreContract.target !== ethers.ZeroAddress) {
          try {
            const s = await scoreContract.getScore(userAddr);
            setScore(Number(s));
          } catch (e) {
            console.log("Could not fetch score");
          }
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col items-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
            Borrow Hub
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl font-medium">
            Your decentralized credit score directly dictates your lending
            terms. Higher scores unlock lower collateral requirements and
            interest ratios.
          </p>
        </header>

        {provider && address ? (
          <LoanForm provider={provider} address={address} score={score} />
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500 font-medium">
              Please connect your wallet to access borrowing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Borrow;
