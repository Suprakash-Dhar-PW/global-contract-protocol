// Math model utility that encapsulates the logic matching the smart contract
// score runs from 300 to 1000. 500 is default.
export const calculateRiskParameters = (score) => {
  const s = Number(score);
  const normalizedScore = s < 500 ? 0 : s - 500;

  // Collateral base 15000 bps (150%) at 500 score, scaling down to 11000 bps (110%)
  const collateralRatioBps = 15000 - (normalizedScore * 4000 / 500);

  // Interest base 10% (1000 bps) scaling down to 2% (200 bps)
  const interestRateBps = 1000 - (normalizedScore * 800 / 500);

  // Limit base $1000 (1000) scaling up to $100,000
  const limitRaw = 1000 + (normalizedScore * 99000 / 500);

  return {
    collateralRatio: collateralRatioBps / 100, // percentage e.g. 150
    interestRate: interestRateBps / 100,     // percentage e.g. 10
    maxBorrow: limitRaw
  };
};
