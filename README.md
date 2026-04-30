# ZKyc - Privacy-Preserving Decentralized Identity & KYC Verification dApp

A **cybersecurity-first** decentralized identity and KYC verification system built with Solidity, Hardhat, React 18, and Ethers.js v6.

## 🎯 Overview

ZKyc is a privacy-preserving dApp that allows users to:

- Register an on-chain identity using commitment hashes (simulating zero-knowledge commitments)
- Receive attestations from trusted KYC issuers
- Issue and verify credentials for different verification levels (AGE_VERIFIED, KYC_PASSED, ACCREDITED_INVESTOR)
- Access gated smart contracts that require specific credentials
- All while protecting personal information through selective disclosure

## 🏗️ Architecture

```
ZKyc
├── contracts/
│   ├── IdentityRegistry.sol          # Identity registration & attestation
│   ├── CredentialVerifier.sol         # Credential issuance & verification
│   └── AccessGate.sol                 # Demo gated contract
├── test/
│   └── ZKyc.test.js                   # Comprehensive test suite
├── scripts/
│   ├── deploy.js                      # Contract deployment
│   └── seedIssuer.js                  # Initialize issuer roles
├── src/
│   ├── components/
│   │   ├── ConnectWallet.jsx          # MetaMask connection
│   │   ├── RegisterIdentity.jsx       # Identity registration UI
│   │   ├── IssuerDashboard.jsx        # Issuer management interface
│   │   ├── VerifyCredential.jsx       # Credential verification
│   │   └── AccessGateUI.jsx           # Gated contract demo
│   ├── hooks/
│   │   ├── useWeb3.js                 # Web3 connection hook
│   │   └── useContract.js             # Contract interaction hook
│   ├── config/
│   │   └── contracts.json             # Contract addresses & ABIs
│   ├── App.js                         # Main app component
│   └── index.css                      # Tailwind CSS styles
└── package.json                       # Dependencies
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- MetaMask browser extension
- Hardhat local network running

### Installation

```bash
# Clone repository
git clone <repo>
cd dapp

# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to Hardhat local network
npx hardhat node  # Terminal 1: Start local node
npm run deploy    # Terminal 2: Deploy contracts

# Start React frontend
npm run dev
```

### Default Test Accounts (Hardhat)

- Account 0 (Deployer): `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Account 1 (Issuer): `0x70997970C51812e339D9B73b0245603564GCF42M`
- Account 2 (User): `0x3C44CdDdB6a900756aDc64B51f1c34471Db5f8e2`

## 📋 Smart Contracts

### IdentityRegistry.sol

Manages on-chain identity registration and attestation.

**Key Functions:**

- `registerIdentity(bytes32 commitmentHash)` - User registers with commitment hash
- `attestIdentity(address user, uint256 expiryDays)` - Issuer attests identity
- `revokeIdentity(address user)` - Issuer revokes identity
- `isIdentityValid(address user)` - Check if identity is valid
- `addIssuer(address issuer)` - Owner adds issuer (onlyOwner)

**Security Features:**

- ✓ One commitment per wallet address (anti-Sybil)
- ✓ Custom errors instead of revert strings
- ✓ Reentrancy guards via OpenZeppelin
- ✓ Commitment hash never reveals private data

### CredentialVerifier.sol

Issues and verifies credentials with selective disclosure.

**Credential Types:**

- `0 = AGE_VERIFIED`
- `1 = KYC_PASSED`
- `2 = ACCREDITED_INVESTOR`

**Key Functions:**

- `issueCredential(address user, uint8 type, bytes32 hash, uint256 days)` - Issue credential
- `verifyCredential(address user, uint8 type)` - Verify (reverts if invalid)
- `hasValidCredential(address user, uint8 type)` - Check validity (returns bool)
- `revokeCredential(address user, uint8 type)` - Revoke credential
- `authorizeIssuer(address issuer)` - Owner authorizes issuer

**Security Features:**

- ✓ O(1) lookup by (address, credentialType)
- ✓ Credential stored as hash (never raw PII)
- ✓ Expiry enforcement
- ✓ Revocation support

### AccessGate.sol

Demo gated contract showing real-world credential usage.

**Gated Functions:**

- `whitelistDeposit()` - Only KYC_PASSED users can deposit
- `whitelistWithdraw(uint256 amount)` - Only KYC_PASSED users can withdraw
- `isUserVerified(address user)` - Check if user has KYC_PASSED credential

**Security Features:**

- ✓ Composable with CredentialVerifier
- ✓ Reentrancy protection on all state changes
- ✓ Role-based access via credentials

## 🎨 Frontend Components

### ConnectWallet

- Detects MetaMask installation
- Displays connected account
- Enforces Hardhat local network (Chain ID 31337)
- Shows network warning if wrong chain

### RegisterIdentity

- User enters secret phrase
- Frontend computes commitment hash: `keccak256(secret + walletAddress)`
- **Secret never leaves browser**
- On-chain registration without PII exposure

### IssuerDashboard

- Attest registered identities
- Issue credentials (AGE_VERIFIED, KYC_PASSED, ACCREDITED_INVESTOR)
- Revoke credentials
- Issuer-only access

### VerifyCredential

- Verify if address holds valid credential
- Selective disclosure (no PII revealed)
- Shows credential metadata (issued, expires, days remaining)
- Public read access (no authentication required)

### AccessGateUI

- Shows KYC verification status
- Deposit/Withdraw ETH to restricted pool
- Real-time balance updates
- Composable with AccessGate contract

## 🔐 Security Architecture

### Privacy by Design

1. **Commitment Scheme**

   - Users create commitment hash: `keccak256(secret + nullifier)`
   - Secret never sent to server or blockchain
   - Hash commitment prevents PII leakage
   - One commitment per wallet prevents Sybil attacks

2. **Selective Disclosure**

   - Verifier checks credential existence without seeing raw data
   - Credential stored as hash, not plaintext
   - Only metadata (issued, expires) is viewable
   - Zero PII exposure on-chain

3. **Client-Side Hashing**
   - All sensitive operations happen in browser
   - Secret phrase never transmitted
   - Commitment hash computed locally using ethers.js
   - Protects against man-in-the-middle attacks

### Reentrancy Vectors & Mitigations

#### Vector 1: `registerIdentity()`

```solidity
// VULNERABLE pattern would be:
identities[msg.sender] = identity;
commitmentToAddress[commitmentHash] = msg.sender;  // Reentrancy point

// MITIGATED with:
✓ ReentrancyGuard (no external calls)
✓ Checks-Effects-Patterns
```

#### Vector 2: `whitelistDeposit()` in AccessGate

```solidity
// VULNERABLE pattern would be:
deposits[msg.sender] += msg.value;
externalContract.notify(msg.sender);  // Reentrancy

// MITIGATED with:
✓ ReentrancyGuard on all functions
✓ Checks-Effects-Interactions pattern
✓ Low-level call wrapped in reentrancy protection
```

#### Vector 3: `whitelistWithdraw()` in AccessGate

```solidity
// VULNERABLE pattern would be:
(bool success, ) = msg.sender.call{value: amount}("");
if (success) deposits[msg.sender] -= amount;  // Reentrancy!

// MITIGATED with:
✓ Deduct BEFORE external call
✓ ReentrancyGuard wraps entire function
deposits[msg.sender] -= amount;  // Effects first
(bool success, ) = msg.sender.call{value: amount}("");  // Interaction last
```

#### Vector 4: `revokeCredential()` & `attestIdentity()`

```solidity
// No external calls → No direct reentrancy risk
// But protected by:
✓ ReentrancyGuard (defense in depth)
✓ State checks before modifications
```

## 🔄 Zero-Knowledge Implementation (Production Roadmap)

Currently, ZKyc uses **commitment hashes** as a simplified privacy mechanism. In production, this would be replaced with real zero-knowledge proofs:

### Current Implementation:

```solidity
// Simplified commitment (hash-based)
bytes32 commitmentHash = keccak256(secret + nullifier);
identities[user].commitmentHash = commitmentHash;
```

### Production Implementation (Circom + snarkjs):

```solidity
// Real ZK proof verification
bytes memory proof = user.generateProof({
  secret: userSecret,
  commitment: publicCommitment,
  attributes: [age >= 18, kycStatus == "PASSED"]
});

require(verifier.verifyProof(proof), "Invalid ZK proof");

// Benefits:
// ✓ Privacy-preserving attribute verification
// ✓ Zero PII disclosure (not even commitment hash)
// ✓ Attribute aggregation (multiple fields in one proof)
// ✓ Interoperability with ZK protocols (ZK rollups, etc.)
```

### ZK Proof Flow:

```
User's Secret Data (PII)
         ↓
    [Circom Circuit] ← Defines what to prove (age ≥ 18)
         ↓
  Generate Proof (snarkjs)
         ↓
  Proof + Public Signals
         ↓
  Submit to Contract → Verify Proof (onchain verifier)
         ↓
  No PII on-chain, just "proof is valid"
```

## 📊 Test Coverage

Run the comprehensive test suite:

```bash
npm run test
```

**Test Cases:**

- ✓ Identity registration (success & Sybil attack prevention)
- ✓ Identity attestation (by issuer)
- ✓ Identity revocation
- ✓ Credential issuance (all types)
- ✓ Credential verification (valid, expired, revoked)
- ✓ Unauthorized issuer rejection
- ✓ AccessGate gating (verified vs. unverified)
- ✓ Full lifecycle integration test

## 🎯 Custom Errors (Gas Optimization)

ZKyc uses custom errors instead of revert strings for better security and gas efficiency:

```solidity
error ZeroAddressNotAllowed();           // 0 bytes saved
error CommitmentAlreadyExists();         // ~50 bytes vs "Commitment Already Exists"
error IdentityNotFound();
error NotAnIssuer();
error UnauthorizedAccess();
error CredentialExpired();
// ... and more

// Usage:
if (user == address(0)) revert ZeroAddressNotAllowed();

// Benefits:
// ✓ Smaller bytecode
// ✓ Cheaper to revert
// ✓ Clear error semantics
// ✓ Matches Solidity 0.8.20+ best practices
```

## 🎨 Modern Web3 UI

The frontend features a premium Web3 design:

- **Color Scheme:** Black, Orange, Purple, Lavender (no blue AI colors)
- **Glass Morphism:** Frosted glass effect backgrounds
- **Gradient Text:** Orange → Purple text effects
- **Animations:** Pulsing glow effects on active states
- **Responsive:** Mobile-first design
- **Dark Theme:** Optimized for eye comfort

## 🚨 Important Security Notes

1. **Secret Phrase Management**

   - Users must keep their secret phrase safe
   - Losing secret phrase = inability to recover identity
   - Recommmend using hardware wallets with dApp integration

2. **Network Safety**

   - Frontend enforces Hardhat local network (Chain 31337)
   - Will reject connections to mainnet/testnet
   - Prevents accidental production deployment

3. **Issuer Role**

   - Only issuer-authorized accounts can attest/issue/revoke
   - Issuers are responsible for KYC verification
   - Owner of contract manages issuer list

4. **Credential Lifecycle**
   - All credentials have expiry dates
   - Expired credentials are automatically invalid
   - Issuers can revoke before expiry if needed

## 📝 Deployment

Deploy to local Hardhat network:

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Deploy contracts
npm run deploy

# Terminal 3: Seed issuer role (optional)
npm run seed

# Terminal 4: Start React app
npm run dev
```

The deploy script will:

1. Compile all contracts
2. Deploy IdentityRegistry, CredentialVerifier, AccessGate
3. Write contract addresses and ABIs to `src/config/contracts.json`
4. Display contract addresses in console

## 📚 Learning Resources

- [Solidity Docs](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Ethers.js v6 Docs](https://docs.ethers.org/v6/)
- [Hardhat Docs](https://hardhat.org/docs)
- [Zero-Knowledge Proofs (Circom)](https://docs.circom.io/)

## 🤝 Contributing

Contributions welcome! Please ensure:

- ✓ All tests pass
- ✓ No security vulnerabilities (use Slither)
- ✓ Code follows security best practices
- ✓ Comments explain complex logic

## 📄 License

MIT License - See LICENSE file for details

---


Stack: Solidity 0.8.20 | Hardhat | React 18 | Ethers.js v6 | Tailwind CSS

## 📸 Screenshots

The application UI (running locally) — screenshots captured from the running React dev server.

- Home / Connect: Output/screenshot-connect.png
- Register Identity: Output/screenshot-register.png
- Issuer Dashboard: Output/screenshot-issuer.png
- Issue Credential form: Output/screenshot-issue.png
- Verify Credential: Output/screenshot-verify.png
- Access Gate (KYC Protected Pool): Output/screenshot-accessgate.png

You can view these images in the `Output/` folder of the repository.
