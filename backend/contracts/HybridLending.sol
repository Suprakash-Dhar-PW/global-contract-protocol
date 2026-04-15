// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interfaces
interface IIdentityRegistry {
    function isVerified(address user) external view returns (bool);
}

interface ICreditScore {
    function getScore(address user) external view returns (uint256);
    function updateScore(address user, uint256 newScore) external;
    function MIN_SCORE() external view returns (uint256);
}

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title HybridLending
 * @dev Credit Score + Collateral Based Hybrid Lending Protocol
 */
contract HybridLending is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IIdentityRegistry public identityRegistry;
    ICreditScore public creditScore;
    IERC20 public borrowToken;
    AggregatorV3Interface public priceOracle;

    uint256 public constant LOAN_DURATION = 7 days;
    uint256 public constant LIQUIDATION_BONUS_BPS = 500; // 5%
    uint256 public constant SCORE_PENALTY = 100;

    // Packed struct to save gas
    struct Loan {
        uint128 collateralAmount;
        uint128 debtAmount;
        uint40 timestamp;
        uint40 dueDate;
        bool isActive;
    }

    mapping(address => Loan) public loans;

    // ERC4626-Lite Accounting for Lenders
    mapping(address => uint256) public lenderShares;
    uint256 public totalShares;
    uint256 public totalDebt; // Track active debt to calculate pool value

    event Borrowed(address indexed user, uint256 collateral, uint256 borrowed);
    event Repaid(address indexed user, uint256 amount);
    event PartialRepaid(address indexed user, uint256 amount, uint256 remainingDebt);
    event LoanLiquidated(address indexed user, address indexed liquidator, uint256 debtRepaid, uint256 collateralLiquidated);
    event OracleUpdated(address newOracle);
    event Deposited(address indexed lender, uint256 amount, uint256 shares);
    event Withdrawn(address indexed lender, uint256 amount, uint256 shares);

    error NotVerified();
    error LoanAlreadyExists();
    error InvalidPrice();
    error StaleOracle();
    error NotLiquidatable();
    error ZeroAmount();
    error ExceedsMaxBorrow();
    error TransferFailed();
    error InsufficientShares();

    constructor(
        address _identityRegistry,
        address _creditScore,
        address _borrowToken,
        address _priceOracle,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_priceOracle != address(0), "Oracle cannot be zero address");
        identityRegistry = IIdentityRegistry(_identityRegistry);
        creditScore = ICreditScore(_creditScore);
        borrowToken = IERC20(_borrowToken);
        priceOracle = AggregatorV3Interface(_priceOracle);
    }

    function setPriceOracle(address _priceOracle) external onlyOwner {
        priceOracle = AggregatorV3Interface(_priceOracle);
        emit OracleUpdated(_priceOracle);
    }

    // -----------------------------
    // LENDER POOL ACCOUNTING
    // -----------------------------

    function getTotalPoolValue() public view returns (uint256) {
        return borrowToken.balanceOf(address(this)) + totalDebt;
    }

    function deposit(uint256 amount) external nonReentrant {
        if(amount == 0) revert ZeroAmount();
        
        uint256 poolValue = getTotalPoolValue();
        uint256 shares = (totalShares == 0 || poolValue == 0) 
            ? amount 
            : (amount * totalShares) / poolValue;
            
        borrowToken.safeTransferFrom(msg.sender, address(this), amount);
        
        lenderShares[msg.sender] += shares;
        totalShares += shares;
        
        emit Deposited(msg.sender, amount, shares);
    }

    function withdraw(uint256 shares) external nonReentrant {
        if(shares == 0) revert ZeroAmount();
        if(lenderShares[msg.sender] < shares) revert InsufficientShares();
        
        uint256 amount = (shares * getTotalPoolValue()) / totalShares;
        
        lenderShares[msg.sender] -= shares;
        totalShares -= shares;
        
        borrowToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount, shares);
    }

    // -----------------------------
    // ORACLE
    // -----------------------------

    function getLatestBnbPrice() public view returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceOracle.latestRoundData();

        if (price <= 0) revert InvalidPrice();
        if (answeredInRound < roundId) revert InvalidPrice();
        if (block.timestamp - updatedAt > 2 hours) revert StaleOracle();

        return uint256(price) * 1e10; // scale 8 decimals → 18
    }

    // -----------------------------
    // RISK MODEL
    // -----------------------------

    function getRiskParameters(address user)
        public
        view
        returns (
            uint256 collateralRatioBps,
            uint256 liquidationThresholdBps,
            uint256 interestRateBps,
            uint256 borrowLimit
        )
    {
        uint256 score = creditScore.getScore(user);
        uint256 normalizedScore = score < 500 ? 0 : score - 500;

        collateralRatioBps = 15000 - (normalizedScore * 4000 / 500); // 150% → 110%
        liquidationThresholdBps = 13000 - (normalizedScore * 2500 / 500); // 130% → 105%
        interestRateBps = 1000 - (normalizedScore * 800 / 500); // 10% → 2%

        uint256 limitRaw = 1000 + (normalizedScore * 99000 / 500);
        borrowLimit = limitRaw * 1e18;
    }

    function calculateMaxBorrow(address user, uint256 collateralValue)
        public
        view
        returns (uint256)
    {
        (uint256 collateralRatioBps, , , uint256 borrowLimit) = getRiskParameters(user);

        uint256 maxFromCollateral = (collateralValue * 10000) / collateralRatioBps;

        return maxFromCollateral < borrowLimit ? maxFromCollateral : borrowLimit;
    }

    function getHealthFactor(address user) public view returns (uint256) {
        Loan memory userLoan = loans[user];
        if (!userLoan.isActive || userLoan.debtAmount == 0) return type(uint256).max;

        uint256 bnbPrice = getLatestBnbPrice();
        uint256 collateralValue = (userLoan.collateralAmount * bnbPrice) / 1e18;

        (, uint256 liquidationThresholdBps, , ) = getRiskParameters(user);

        uint256 requiredCollateral = (userLoan.debtAmount * liquidationThresholdBps) / 10000;

        if (requiredCollateral == 0) return type(uint256).max;
        return (collateralValue * 1e18) / requiredCollateral;
    }

    function getUserLoan(address user) external view returns (Loan memory) {
        return loans[user];
    }

    // -----------------------------
    // BORROW
    // -----------------------------

    function borrow(uint256 borrowAmount) external payable nonReentrant {
        if (!identityRegistry.isVerified(msg.sender)) revert NotVerified();
        if (loans[msg.sender].isActive) revert LoanAlreadyExists();
        if (msg.value == 0 || borrowAmount == 0) revert ZeroAmount();

        uint256 bnbPrice = getLatestBnbPrice();
        uint256 collateralValue = (msg.value * bnbPrice) / 1e18;

        uint256 maxBorrow = calculateMaxBorrow(msg.sender, collateralValue);
        if (borrowAmount > maxBorrow) revert ExceedsMaxBorrow();

        (, , uint256 interestRateBps, ) = getRiskParameters(msg.sender);
        uint256 interest = (borrowAmount * interestRateBps) / 10000;
        uint128 debtAmount = uint128(borrowAmount + interest);

        loans[msg.sender] = Loan({
            collateralAmount: uint128(msg.value),
            debtAmount: debtAmount,
            timestamp: uint40(block.timestamp),
            dueDate: uint40(block.timestamp + LOAN_DURATION),
            isActive: true
        });
        
        totalDebt += debtAmount;

        borrowToken.safeTransfer(msg.sender, borrowAmount);
        emit Borrowed(msg.sender, msg.value, borrowAmount);
    }

    // -----------------------------
    // REPAY
    // -----------------------------

    function repay() external nonReentrant {
        Loan storage userLoan = loans[msg.sender];
        require(userLoan.isActive, "No active loan");

        uint256 debt = userLoan.debtAmount;
        uint256 collateral = userLoan.collateralAmount;

        userLoan.isActive = false;
        userLoan.collateralAmount = 0;
        userLoan.debtAmount = 0;
        
        totalDebt -= debt;

        borrowToken.safeTransferFrom(msg.sender, address(this), debt);

        (bool success, ) = msg.sender.call{value: collateral}("");
        if (!success) revert TransferFailed();

        emit Repaid(msg.sender, debt);
    }
    
    function repayPartial(uint256 amount) external nonReentrant {
        if(amount == 0) revert ZeroAmount();
        Loan storage userLoan = loans[msg.sender];
        require(userLoan.isActive, "No active loan");
        
        if (amount >= userLoan.debtAmount) {
            // Full repayment alias
            uint256 debt = userLoan.debtAmount;
            uint256 collateral = userLoan.collateralAmount;

            userLoan.isActive = false;
            userLoan.collateralAmount = 0;
            userLoan.debtAmount = 0;
            totalDebt -= debt;

            borrowToken.safeTransferFrom(msg.sender, address(this), debt);

            (bool success, ) = msg.sender.call{value: collateral}("");
            if (!success) revert TransferFailed();

            emit Repaid(msg.sender, debt);
        } else {
            userLoan.debtAmount -= uint128(amount);
            totalDebt -= amount;
            
            borrowToken.safeTransferFrom(msg.sender, address(this), amount);
            emit PartialRepaid(msg.sender, amount, userLoan.debtAmount);
        }
    }

    // -----------------------------
    // LIQUIDATION
    // -----------------------------

    function checkLiquidation(address user) public view returns (bool) {
        Loan memory userLoan = loans[user];
        if (!userLoan.isActive) return false;
        if (block.timestamp > userLoan.dueDate) return true;

        uint256 bnbPrice = getLatestBnbPrice();
        uint256 collateralValue = (userLoan.collateralAmount * bnbPrice) / 1e18;

        (, uint256 liquidationThresholdBps, , ) = getRiskParameters(user);
        uint256 requiredCollateral = (userLoan.debtAmount * liquidationThresholdBps) / 10000;

        return collateralValue < requiredCollateral;
    }

    function liquidate(address user) external nonReentrant {
        if (!checkLiquidation(user)) revert NotLiquidatable();

        Loan storage userLoan = loans[user];
        uint256 debtToRepay = userLoan.debtAmount;

        uint256 bnbPrice = getLatestBnbPrice();
        uint256 debtInBnb = (debtToRepay * 1e18) / bnbPrice;

        uint256 collateralToLiquidator = debtInBnb + ((debtInBnb * LIQUIDATION_BONUS_BPS) / 10000);

        if (collateralToLiquidator > userLoan.collateralAmount) {
            collateralToLiquidator = userLoan.collateralAmount;
        }

        uint256 remainingCollateral = userLoan.collateralAmount - collateralToLiquidator;

        userLoan.isActive = false;
        userLoan.collateralAmount = 0;
        userLoan.debtAmount = 0;
        
        totalDebt -= debtToRepay;

        borrowToken.safeTransferFrom(msg.sender, address(this), debtToRepay);

        (bool success1, ) = msg.sender.call{value: collateralToLiquidator}("");
        if (!success1) revert TransferFailed();

        if (remainingCollateral > 0) {
            (bool success2, ) = user.call{value: remainingCollateral}("");
            if (!success2) revert TransferFailed();
        }

        uint256 currentScore = creditScore.getScore(user);
        uint256 minScore = creditScore.MIN_SCORE();
        uint256 newScore = currentScore > (minScore + SCORE_PENALTY) ? currentScore - SCORE_PENALTY : minScore;

        creditScore.updateScore(user, newScore);

        emit LoanLiquidated(user, msg.sender, debtToRepay, collateralToLiquidator);
    }
}