# Global Credit Protocol - 2-Minute Pitch & Page Workflow

## Introduction (The Hook)

**Time:** 15 Seconds
**Pitch Script:** "Welcome to the Global Credit Protocol. We are solving one of the biggest problems in DeFi today: capital inefficiency due to over-collateralization. By uniting decentralized identity, on-chain credit scores, and dynamic risk premiums, we allow trusted users to borrow _more_ with _less_ collateral, while keeping the protocol 100% secure. Let me walk you through our platform."

---

## 1. Landing Page (`/` or Home)

**Purpose:** To explain the value proposition and core mechanics (Identity, Credit Scoring, Hybrid Lending).
**Functionality:**

- Serves as the entry point for the user.
- Highlights the core features: "Deploy Collateral against strictly modeled on-chain reputation."
- Contains the Connect Wallet button (MetaMask integration).
  **Pitch Script (20 Seconds):** "Our journey begins on the Landing Page. It’s designed to be sleek and instantly communicate our value: identity-driven lending. Notice how users must connect their web3 wallet to interact. Everything is non-custodial and secure."

---

## 2. Borrow Dashboard (`/borrow`)

**Purpose:** The central hub for users to mint their identity, view their credit risk, and take out loans.
**Functionality:**

- **KYC Verification (Soulbound Token):** Users without a history must mint a Soulbound Identity using a mock 12-digit verification key (simulating real-world KYC/Aadhaar).
- **Credit Score Display:** Fetches the user's score from the `CreditScore` smart contract (default 500).
- **Live Risk Engine:** Pulls real-time BNB prices from Chainlink Oracles to display exact USD values.
- **Loan Origination:** Users input BNB as collateral and borrow MUSD. The UI enforces max borrow limits based on the user's exact credit score.
- **Live Position Vector (Chart):** A dynamic bar chart showing Collateral Value, Required Threshold, and Current Debt. Gives a visual cue to the user's Health Factor.
  **Pitch Script (45 Seconds):** "This is the heart of the application: the Borrow Dashboard. First, unknown wallets must verify themselves by minting a Soulbound Identity Token. Once verified, the dashboard fetches their on-chain Credit Score.

Here is where the magic happens: a higher score mathematically grants a lower collateral requirement and lower interest rate algorithms. Users deposit BNB, borrow MUSD, and can monitor their exact liquidation threshold and 'Health Factor' on this dynamic chart powered by live Chainlink data."

---

## 3. Pool Analytics / Protocol Stats

**Purpose:** Full transparency of the protocol's liquidity and economic health.
**Functionality:**

- Displays Total Value Locked (TVL), Total Borrowed, and Available Liquidity in the system.
- Provides insights into the average credit score of borrowers protecting the protocol.
  **Pitch Script (20 Seconds):** "Lenders need transparency. Our Pool Analytics page provides real-time data on Total Value Locked, active debts, and the overall health of the protocol. It shows lenders that our identity-based risk algorithms successfully prevent bad debt from accumulating."

---

## 4. Liquidations Engine (`/liquidations`)

**Purpose:** A place for 'Keepers' (third-party arbitragers) to monitor risky loans and liquidate them for profit.
**Functionality:**

- Scans the blockchain for active loans.
- Calculates the Health Factor of every borrower dynamically based on real-time oracle prices.
- If a borrower's Health Factor drops below 1.0 (or their loan expires), the "Liquidate" button becomes active.
- Liquidators pay off the debt and receive the borrower's BNB collateral plus a 5% liquidation bonus.
  **Pitch Script (20 Seconds):** "Lastly, we have the Liquidations Engine. Decentralized finance relies on economic incentives to stay solvent. When a borrower's collateral value drops, their Health Factor falls below 1.0. This page allows 'Keepers' to instantly liquidate bad debt, earning a 5% bonus for themselves and keeping the protocol perfectly balanced."

---

## Conclusion

**Time:** 10 Seconds
**Pitch Script:** "Global Credit Protocol is not just another lending pool. It is the bridge between real-world identity and efficient decentralized capital. Thank you."
