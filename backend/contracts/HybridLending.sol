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

    struct Loan {
        uint256 collateralAmount;
        uint256 borrowedAmount;
        uint256 debtAmount;
        uint256 timestamp;
        uint256 dueDate;
        bool isActive;
    }

    mapping(address => Loan) public loans;

    event Borrowed(address indexed user, uint256 collateral, uint256 borrowed);
    event Repaid(address indexed user, uint256 amount);
    event LoanLiquidated(
        address indexed user,
        address indexed liquidator,
        uint256 debtRepaid,
        uint256 collateralLiquidated
    );
    event OracleUpdated(address newOracle);

    error NotVerified();
    error LoanAlreadyExists();
    error InvalidPrice();
    error NotLiquidatable();

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
        // if (block.timestamp - updatedAt > 1 hours) revert InvalidPrice();

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
        (uint256 collateralRatioBps, , , uint256 borrowLimit) =
            getRiskParameters(user);

        uint256 maxFromCollateral =
            (collateralValue * 10000) / collateralRatioBps;

        return maxFromCollateral < borrowLimit
            ? maxFromCollateral
            : borrowLimit;
    }

    // -----------------------------
    // HEALTH FACTOR (NEW)
    // -----------------------------

    function getHealthFactor(address user)
        public
        view
        returns (uint256)
    {
        Loan memory userLoan = loans[user];
        if (!userLoan.isActive) return type(uint256).max;

        uint256 bnbPrice = getLatestBnbPrice();
        uint256 collateralValue =
            (userLoan.collateralAmount * bnbPrice) / 1e18;

        (, uint256 liquidationThresholdBps, , ) =
            getRiskParameters(user);

        uint256 requiredCollateral =
            (userLoan.debtAmount * liquidationThresholdBps) / 10000;

        if (requiredCollateral == 0) return type(uint256).max;

        return (collateralValue * 1e18) / requiredCollateral;
    }

    // Frontend helper
    function getUserLoan(address user)
        external
        view
        returns (Loan memory)
    {
        return loans[user];
    }

    // -----------------------------
    // BORROW
    // -----------------------------

    function borrow(uint256 borrowAmount)
        external
        payable
        nonReentrant
    {
        if (!identityRegistry.isVerified(msg.sender))
            revert NotVerified();
        if (loans[msg.sender].isActive)
            revert LoanAlreadyExists();

        require(msg.value > 0, "Collateral required");
        require(borrowAmount > 0, "Borrow amount zero");

        uint256 bnbPrice = getLatestBnbPrice();
        uint256 collateralValue =
            (msg.value * bnbPrice) / 1e18;

        uint256 maxBorrow =
            calculateMaxBorrow(msg.sender, collateralValue);

        require(borrowAmount <= maxBorrow,
            "Exceeds max borrow limits");

        (, , uint256 interestRateBps, ) =
            getRiskParameters(msg.sender);

        uint256 interest =
            (borrowAmount * interestRateBps) / 10000;

        uint256 debtAmount = borrowAmount + interest;

        loans[msg.sender] = Loan({
            collateralAmount: msg.value,
            borrowedAmount: borrowAmount,
            debtAmount: debtAmount,
            timestamp: block.timestamp,
            dueDate: block.timestamp + LOAN_DURATION,
            isActive: true
        });

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

        borrowToken.safeTransferFrom(
            msg.sender,
            address(this),
            debt
        );

        (bool success, ) =
            msg.sender.call{value: collateral}("");

        require(success, "Collateral return failed");

        emit Repaid(msg.sender, debt);
    }

    // -----------------------------
    // LIQUIDATION
    // -----------------------------

    function checkLiquidation(address user)
        public
        view
        returns (bool)
    {
        Loan memory userLoan = loans[user];
        if (!userLoan.isActive) return false;

        if (block.timestamp > userLoan.dueDate)
            return true;

        uint256 bnbPrice = getLatestBnbPrice();
        uint256 collateralValue =
            (userLoan.collateralAmount * bnbPrice) / 1e18;

        (, uint256 liquidationThresholdBps, , ) =
            getRiskParameters(user);

        uint256 requiredCollateral =
            (userLoan.debtAmount * liquidationThresholdBps) / 10000;

        return collateralValue < requiredCollateral;
    }

    function liquidate(address user)
        external
        nonReentrant
    {
        if (!checkLiquidation(user))
            revert NotLiquidatable();

        Loan storage userLoan = loans[user];
        uint256 debtToRepay = userLoan.debtAmount;

        uint256 bnbPrice = getLatestBnbPrice();
        uint256 debtInBnb =
            (debtToRepay * 1e18) / bnbPrice;

        uint256 collateralToLiquidator =
            debtInBnb +
            ((debtInBnb * LIQUIDATION_BONUS_BPS) / 10000);

        if (collateralToLiquidator >
            userLoan.collateralAmount)
        {
            collateralToLiquidator =
                userLoan.collateralAmount;
        }

        uint256 remainingCollateral =
            userLoan.collateralAmount -
            collateralToLiquidator;

        userLoan.isActive = false;
        userLoan.collateralAmount = 0;
        userLoan.debtAmount = 0;

        borrowToken.safeTransferFrom(
            msg.sender,
            address(this),
            debtToRepay
        );

        (bool success1, ) =
            msg.sender.call{
                value: collateralToLiquidator
            }("");
        require(success1,
            "BNB transfer to liquidator failed");

        if (remainingCollateral > 0) {
            (bool success2, ) = user.call{value: remainingCollateral}("");
            require(success2, "BNB transfer to user failed");
        }

        uint256 currentScore =
            creditScore.getScore(user);
        uint256 minScore =
            creditScore.MIN_SCORE();

        uint256 newScore =
            currentScore > (minScore + SCORE_PENALTY)
                ? currentScore - SCORE_PENALTY
                : minScore;

        creditScore.updateScore(user, newScore);

        emit LoanLiquidated(
            user,
            msg.sender,
            debtToRepay,
            collateralToLiquidator
        );
    }

    function depositLiquidity(uint256 amount)
        external
        onlyOwner
    {
        borrowToken.safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );
    }
}