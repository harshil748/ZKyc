# 📁 ZKyc Project Structure & File Guide

## Project Overview

```
dapp/
├── 📄 Configuration Files
│   ├── package.json                    # Dependencies & scripts
│   ├── hardhat.config.js               # Hardhat configuration
│   ├── tailwind.config.js              # Tailwind CSS config
│   ├── postcss.config.js               # PostCSS config
│   ├── .gitignore                      # Git exclusions
│   └── .env.example                    # Environment template
│
├── 🔐 Smart Contracts (contracts/)
│   ├── IdentityRegistry.sol            # Identity registration & attestation
│   ├── CredentialVerifier.sol          # Credential issuance & verification
│   └── AccessGate.sol                  # Gated access demo contract
│
├── 🧪 Tests (test/)
│   └── ZKyc.test.js                    # Comprehensive test suite (14 tests)
│
├── ⚙️ Deployment Scripts (scripts/)
│   ├── deploy.js                       # Deploy contracts & generate config
│   └── seedIssuer.js                   # Initialize issuer roles
│
├── ⚛️ React Frontend (src/)
│   ├── Components
│   │   ├── ConnectWallet.jsx           # MetaMask connection UI
│   │   ├── RegisterIdentity.jsx        # Identity registration form
│   │   ├── IssuerDashboard.jsx         # Issuer management interface
│   │   ├── VerifyCredential.jsx        # Credential verification tool
│   │   └── AccessGateUI.jsx            # Gated pool demo
│   ├── Hooks
│   │   ├── useWeb3.js                  # Web3 connection management
│   │   └── useContract.js              # Contract interaction & transactions
│   ├── Config
│   │   └── contracts.json              # Contract addresses & ABIs
│   ├── App.js                          # Main app component with tabs
│   ├── index.js                        # React entry point
│   └── index.css                       # Tailwind CSS + custom styles
│
├── 📁 Public Files (public/)
│   └── index.html                      # HTML template
│
├── 📚 Documentation
│   ├── README.md                       # Main documentation
│   ├── SECURITY.md                     # Security deep dive
│   ├── QUICKSTART.md                   # Quick start guide
│   └── PROJECT_INDEX.md                # This file
│
└── .git/                               # Git repository
```

---

## 🔐 Smart Contracts Details

### IdentityRegistry.sol (150 lines)

**Purpose:** Manages decentralized identity registration with on-chain attestation

**Key Components:**

- `Identity struct`: Stores commitment hash, issuer, timestamps, revocation status
- `registerIdentity()`: User registers with keccak256(secret + nullifier)
- `attestIdentity()`: Issuer verifies identity off-chain, attests on-chain
- `revokeIdentity()`: Issuer revokes compromised identity
- `isIdentityValid()`: Check if identity is current and valid
- Role-based access: Owner manages issuers

**Security Features:**

- ✓ Anti-Sybil: One commitment per address
- ✓ Reentrancy guards on all state changes
- ✓ Custom errors (gas efficient)
- ✓ Zero address validation

**Events:** `IdentityRegistered`, `IdentityAttested`, `IdentityRevoked`, `IssuerAdded`, `IssuerRemoved`

---

### CredentialVerifier.sol (190 lines)

**Purpose:** Issues and verifies credentials with selective disclosure

**Key Components:**

- `Credential struct`: Hash, issue date, expiry, revocation flag
- `issueCredential()`: Issue typed credential with O(1) lookup
- `verifyCredential()`: Verify credential (reverts if invalid)
- `hasValidCredential()`: Safe check without reverting
- `revokeCredential()`: Revoke credential before expiry
- Credential types: AGE_VERIFIED (0), KYC_PASSED (1), ACCREDITED_INVESTOR (2)

**Security Features:**

- ✓ Credential hash stored (never raw PII)
- ✓ Expiry enforcement
- ✓ Revocation support
- ✓ O(1) lookup prevents DoS
- ✓ Reentrancy guards

**Events:** `CredentialIssued`, `CredentialRevoked`, `IssuerAuthorized`, `IssuerRemoved`

---

### AccessGate.sol (130 lines)

**Purpose:** Demo gated contract showing credential-based access control

**Key Components:**

- `whitelistDeposit()`: Only KYC_PASSED users can deposit ETH
- `whitelistWithdraw()`: Only KYC_PASSED users can withdraw
- `getBalance()`: Check user's pool balance
- `isUserVerified()`: Check KYC status
- Real-world composability example

**Security Features:**

- ✓ Reentrancy guard on all functions
- ✓ Checks-Effects-Interactions pattern
- ✓ Credential verification before state changes
- ✓ Safe ETH handling with low-level calls

**Events:** `DepositWhitelisted`, `WithdrawalExecuted`

---

## 🧪 Test Suite (ZKyc.test.js)

**14 Test Cases** covering full lifecycle:

### IdentityRegistry Tests

1. ✓ Register identity with commitment hash
2. ✓ Prevent Sybil attack (second registration fails)
3. ✓ Prevent duplicate commitment hashes globally
4. ✓ Allow issuer to attest identity
5. ✓ Reject attestation from non-issuer
6. ✓ Allow issuer to revoke identity
7. ✓ Check identity validity status

### CredentialVerifier Tests

8. ✓ Issue credential successfully
9. ✓ Reject issuance from non-issuer
10. ✓ Verify valid credential
11. ✓ Reject non-existent credential
12. ✓ Reject revoked credentials
13. ✓ Reject expired credentials

### AccessGate Tests

14. ✓ Block deposit from non-KYC user
15. ✓ Allow deposit from KYC-verified user
16. ✓ Allow withdrawal from verified user

### Integration Tests

17. ✓ Full lifecycle: register → attest → issue → verify → gate

**Run tests:**

```bash
npm run test
```

---

## ⚛️ React Components

### ConnectWallet.jsx (80 lines)

- MetaMask detection and connection
- Account display with formatting
- Network validation (enforces Chain ID 31337)
- Disconnect button
- Error messages

**States:** Connected, Disconnected, Wrong Network, MetaMask Not Installed

---

### RegisterIdentity.jsx (180 lines)

- Secret phrase input (password-protected)
- Client-side commitment hash generation
- On-chain registration
- Registration verification
- Transaction hash display

**Features:**

- ✓ Secret never leaves browser
- ✓ Shows generated commitment hash
- ✓ Verifies registration status

---

### IssuerDashboard.jsx (220 lines)

- Attest registered identities
- Issue credentials (all 3 types)
- Revoke credentials
- Form validation
- Transaction feedback

**Issuer Functions:**

- Attest identity with custom expiry
- Issue AGE_VERIFIED, KYC_PASSED, or ACCREDITED_INVESTOR
- Revoke specific credential type
- View transaction hashes

---

### VerifyCredential.jsx (160 lines)

- Verify credential by address + type
- Display credential metadata
- Show expiry and days remaining
- Privacy explanation
- Public read access (no auth needed)

**Verification Result:**

- Valid: Shows issued date, expiry, days remaining
- Invalid: Shows reason (not found, expired, revoked)

---

### AccessGateUI.jsx (220 lines)

- Check KYC verification status (real-time)
- Display user balance and pool total
- Deposit ETH to pool (gated by KYC_PASSED)
- Withdraw ETH from pool (gated by KYC_PASSED)
- Shows setup instructions if not verified

**Real-Time Updates:** Refreshes every 5 seconds

---

### App.js (120 lines)

- Main application component
- Tab-based navigation (5 tabs)
- Header with project info
- Footer with security/architecture info
- Responsive layout
- Dark theme with gradient background

---

## 🎨 Styling

### index.css (280 lines)

**Custom Utilities:**

- `.glass` - Glass morphism effect
- `.glass-dark` - Dark glass effect
- `.gradient-text` - Orange→Purple gradient text
- `.btn-primary` - Orange gradient button
- `.btn-secondary` - Purple gradient button
- `.btn-outline` - Orange outline button
- `.input-field` - Styled input with focus state
- `.card`, `.card-dark` - Card containers
- `.badge-orange`, `.badge-purple`, `.badge-green` - Status badges
- `.status-success`, `.status-warning`, `.status-error` - Status text
- `.animate-pulse-glow` - Pulsing glow animation

**Color Scheme:**

- Primary: #ff6b35 (Orange)
- Secondary: #7c3aed (Purple)
- Accent: #e9d5ff (Lavender)
- Dark: #0f0f0f (Black)
- Background: Gradient slate → purple → black

---

## 🎣 React Hooks

### useWeb3.js (130 lines)

**Functions:**

- `connectWallet()` - Connect MetaMask
- `disconnectWallet()` - Disconnect
- Automatic account/chain change listeners
- Initial connection check

**Returns:**

```javascript
{
	(account, // Connected address
		provider, // Ethers provider
		signer, // Ethers signer
		chainId, // Network chain ID
		isConnecting, // Loading state
		error, // Error message
		connectWallet, // Function
		disconnectWallet, // Function
		isMetaMaskInstalled); // Boolean
}
```

---

### useContract.js (90 lines)

**`useContract()` Hook:**

- Load contract instance from address + ABI
- Returns: `{ contract, loading, error }`

**`useTransaction()` Hook:**

- Execute smart contract transactions
- Track transaction hash
- Handle errors
- Callback on success

**Usage:**

```javascript
const { contract } = useContract("IdentityRegistry", signer);
const { executeTransaction, isLoading, hash } = useTransaction();

await executeTransaction(
	contract.registerIdentity(commitmentHash),
	(receipt) => {
		/* success handler */
	},
);
```

---

## 📜 Configuration Files

### package.json

**Scripts:**

- `npm run compile` - Compile Solidity contracts
- `npm run test` - Run test suite
- `npm run deploy` - Deploy contracts
- `npm run seed` - Seed issuer role
- `npm run dev` - Start React dev server
- `npm run build` - Build React app

**Dependencies:**

- ethers: ^6.11.1
- react: ^18.2.0
- tailwindcss: ^3.3.6
- hardhat: ^2.19.5

---

### hardhat.config.js

**Network Configuration:**

- Solidity version: 0.8.20
- Optimizer enabled (200 runs)
- Hardhat local network (Chain ID: 31337)
- Localhost support for manual node

---

### tailwind.config.js

**Theme Extensions:**

- Custom colors (primary, secondary, accent)
- Pulse glow animation
- Responsive sizing

---

## 🚀 Deployment Scripts

### deploy.js

1. Compile and deploy IdentityRegistry
2. Compile and deploy CredentialVerifier
3. Compile and deploy AccessGate
4. Write addresses and ABIs to `src/config/contracts.json`
5. Display deployed addresses

**Output:**

```json
{
  "network": "hardhat",
  "chainId": 31337,
  "contracts": {
    "IdentityRegistry": { "address": "0x...", "abi": [...] },
    "CredentialVerifier": { "address": "0x...", "abi": [...] },
    "AccessGate": { "address": "0x...", "abi": [...] }
  }
}
```

---

### seedIssuer.js

1. Read deployed contract addresses from `src/config/contracts.json`
2. Add Account #1 as issuer to IdentityRegistry
3. Add Account #1 as issuer to CredentialVerifier
4. Display issuer configuration

---

## 📚 Documentation Files

### README.md

Comprehensive project documentation including:

- Overview and features
- Architecture diagram
- Quick start instructions
- Smart contract descriptions
- Security features
- Frontend components
- Custom errors explanation
- Learning resources
- Contribution guidelines

---

### SECURITY.md

Deep security analysis:

1. **Commitment Scheme Privacy**
   - One-way hash protection
   - PII leakage prevention
   - Privacy limitations

2. **Zero-Knowledge Roadmap**
   - Current vs. ZK comparison
   - Circom circuit example
   - Production implementation

3. **Reentrancy Analysis**
   - 6 attack vectors identified
   - Mitigation strategies
   - CEI pattern explanation
   - Code examples

4. **Additional Security**
   - Custom error benefits
   - Input validation
   - Event logging

---

### QUICKSTART.md

Step-by-step setup guide:

- Prerequisites
- Installation
- Test suite
- Local blockchain setup
- MetaMask configuration
- Frontend startup
- Full workflow walkthrough
- Troubleshooting guide

---

## 📊 Project Statistics

| Metric              | Count   |
| ------------------- | ------- |
| Smart Contracts     | 3       |
| Solidity Lines      | ~470    |
| Test Cases          | 17+     |
| React Components    | 6       |
| React Hooks         | 2       |
| Frontend Lines      | ~1,200  |
| Documentation Lines | ~2,000  |
| CSS Rules           | ~100    |
| Total Lines         | ~3,700+ |

---

## 🔄 Data Flow

```
User Action → React Component
              ↓
           useWeb3 Hook (get signer)
              ↓
           useContract Hook (load contract)
              ↓
        Smart Contract Function
              ↓
         MetaMask Popup
              ↓
        Transaction Signed
              ↓
      Submitted to Blockchain
              ↓
      Block Confirmation
              ↓
       Component Updates State
              ↓
       UI Reflects Change
```

---

## 🔐 Privacy Flow

```
User Secret
    ↓
Client-Side Hash (ethers.js)
    ↓
Commitment Hash (0x4a5f...)
    ↓
Submit to Smart Contract
    ↓
Stored On-Chain (hash only)
    ↓
Issuer Attests (Off-Chain KYC)
    ↓
Credential Issued (hash, not data)
    ↓
Verifier Checks (only "credential exists")
    ↓
Zero PII Disclosure
```

---

## 🚦 Getting Started

1. **Read QUICKSTART.md** - 5 minute setup
2. **Run `npm install`** - Install dependencies
3. **Run `npx hardhat node`** - Start blockchain
4. **Run `npm run deploy`** - Deploy contracts
5. **Run `npm run dev`** - Start frontend
6. **Visit http://localhost:3000** - Open app

---

## 🎓 Learning Path

1. Understand commitment hashes (README.md)
2. Read security architecture (SECURITY.md)
3. Review smart contracts (contracts/\*.sol)
4. Study test cases (test/ZKyc.test.js)
5. Explore frontend (src/components/)
6. Try full workflow (QUICKSTART.md)

---

**ZKyc: Privacy-Preserving Decentralized Identity dApp**
_Built with Solidity, Hardhat, React, Ethers.js v6_
