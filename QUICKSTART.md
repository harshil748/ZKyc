# 🚀 ZKyc Quick Start Guide

Get ZKyc running in 5 minutes!

## Prerequisites

- **Node.js 16+**: [Download](https://nodejs.org/)
- **MetaMask Extension**: [Install](https://metamask.io/)
- **Hardhat Local Node** (will run locally)

## Step 1: Clone & Install

```bash
cd dapp
npm install
```

## Step 2: Compile Smart Contracts

```bash
npm run compile
```

Expected output:

```
Successfully compiled 3 Solidity files
✓ IdentityRegistry.sol
✓ CredentialVerifier.sol
✓ AccessGate.sol
```

## Step 3: Run Tests (Optional)

```bash
npm run test
```

Expected: All 14 test cases pass ✓

## Step 4: Start Local Blockchain

Open **Terminal 1**:

```bash
npx hardhat node
```

You should see:

```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Account #1: 0x70997970C51812e339D9B73b0245603564Gc8a3b (10000 ETH)
...
```

**Copy Account #0 address for MetaMask setup.**

## Step 5: Deploy Contracts

Open **Terminal 2**:

```bash
npm run deploy
```

Expected output:

```
🚀 Deploying ZKyc contracts...

1️⃣  Deploying IdentityRegistry...
✅ IdentityRegistry deployed to: 0x5FbDB2315678afccb333f8032a433D30424B28e0

2️⃣  Deploying CredentialVerifier...
✅ CredentialVerifier deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

3️⃣  Deploying AccessGate...
✅ AccessGate deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

📁 Contracts config written to: src/config/contracts.json
```

## Step 6: Setup MetaMask

1. **Open MetaMask** extension
2. **Add Network**:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`
3. **Import Account**:
   - Private Key (from Hardhat output): Copy Account #0's private key
   - ⚠️ **Never use real private keys! These are test-only.**

## Step 7: Start React Frontend

Open **Terminal 3**:

```bash
npm run dev
```

Expected output:

```
webpack compiled successfully
Local: http://localhost:3000
```

## Step 8: Open Browser

Navigate to: **http://localhost:3000**

You should see the ZKyc interface with 5 tabs.

---

## 🎯 Walkthrough: Full Flow

### Tab 1: Connect Wallet 🔗

1. Click **"Connect MetaMask"**
2. MetaMask popup appears
3. Select account and **Sign**
4. See your connected address displayed

### Tab 2: Register Identity 🔐

1. Enter a secret phrase (e.g., "my_secret_123")
2. Click **"Generate Hash"**
3. See commitment hash generated locally
4. Click **"Register on-chain"**
5. Confirm transaction in MetaMask
6. See `✅ Identity registered successfully!`

### Tab 3: Issuer Dashboard 👨‍💼

⚠️ **Only works if you're the issuer account**

1. **Setup Issuer Role**:

   ```bash
   npm run seed
   ```

   This makes Account #1 an issuer.

2. **Switch MetaMask to Account #1**
3. Go to "Issuer Dashboard"
4. **Attest Identity**:
   - Paste Account #0 address
   - Set expiry: 365 days
   - Click "Attest Identity"
5. **Issue Credential**:
   - Select credential type: "KYC_PASSED"
   - Paste Account #0 address
   - Enter credential data: "kyc_12345"
   - Click "Issue Credential"

### Tab 4: Verify Credential 🔍

1. Enter Account #0 address
2. Select credential type: "KYC_PASSED"
3. Click **"Verify Credential"**
4. See: ✅ **Credential Valid**
5. Shows: Issued date, expires date, days remaining

### Tab 5: Access Gate 🏛️

1. **Switch MetaMask back to Account #0**
2. Refresh page (if needed)
3. You should see: ✅ **KYC Verified**
4. Enter deposit amount: 0.5 ETH
5. Click **"Deposit ETH"**
6. Confirm transaction
7. See balance updated!
8. Click **"Withdraw ETH"** to get funds back

---

## 🧪 Test Different Scenarios

### Scenario 1: Unverified User Access Denied

1. Switch to Account #2 (not verified)
2. Go to Access Gate tab
3. Try to deposit ETH
4. Get error: ❌ **Unauthorized Access**

### Scenario 2: Credential Expiry

1. In Issuer Dashboard, issue credential with 0 days expiry
2. Go to Verify Credential tab
3. After a few seconds, verify again
4. Credential now shows as expired

### Scenario 3: Credential Revocation

1. In Issuer Dashboard, revoke the credential
2. Try to deposit in Access Gate
3. Get error: ❌ **Unauthorized Access**

---

## 🔗 Contract Interactions

All contract addresses are stored in: `src/config/contracts.json`

Use Hardhat console to interact directly:

```bash
npx hardhat console
```

```javascript
// Load contracts
const IR = await ethers.getContractFactory("IdentityRegistry");
const ir = IR.attach("0x5FbDB2315678afccb333f8032a433D30424B28e0");

// Check identity
const identity = await ir.identities(
	"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
);
console.log(identity);
```

---

## 📊 Useful Commands

```bash
# Compile contracts
npm run compile

# Run all tests
npm run test

# Deploy contracts (requires local node running)
npm run deploy

# Seed issuer role
npm run seed

# Start React dev server
npm run dev

# View local node logs
npx hardhat node --verbose
```

---

## 🆘 Troubleshooting

### Error: "Cannot find module ethers"

```bash
npm install --save ethers
```

### Error: "Contract not found in config"

- Make sure you ran `npm run deploy` after starting local node
- Check that `src/config/contracts.json` was created

### Error: "Wrong Network Detected"

- Make sure Hardhat Local network is added to MetaMask
- Chain ID must be exactly `31337`

### MetaMask Not Connecting

- Make sure local node is running: `npx hardhat node`
- Try refreshing browser
- Check MetaMask network is set to Hardhat Local

### Transaction Failing

- Check account has ETH (should have 10000 ETH from Hardhat)
- Make sure you're calling functions with right account
- Check contract addresses in `src/config/contracts.json`

---

## 📚 Next Steps

1. **Read Security Details**: See [SECURITY.md](SECURITY.md)
2. **Understand Contracts**: Review comments in `contracts/*.sol`
3. **Explore Frontend**: Check component code in `src/components/`
4. **Run on Testnet**: Deploy to Goerli or Sepolia (modify hardhat.config.js)
5. **Implement Real ZK**: Add Circom circuits for production privacy

---

## 🎓 Learning Resources

- [Solidity Docs](https://docs.soliditylang.org/)
- [Ethers.js v6 Docs](https://docs.ethers.org/v6/)
- [Hardhat Docs](https://hardhat.org/)
- [React Docs](https://react.dev/)
- [MetaMask Docs](https://docs.metamask.io/)

---

## ⚡ Key Takeaways

✓ **Privacy by Design**: Secrets never leave browser
✓ **On-Chain Verification**: Credentials stored on blockchain
✓ **Composable**: AccessGate shows real-world usage
✓ **Secure**: Reentrancy protected, custom errors
✓ **Educational**: Great learning resource for Web3 + privacy

---

**Happy building! 🚀**
