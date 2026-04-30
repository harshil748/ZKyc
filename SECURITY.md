# ZKyc Security Architecture Deep Dive

## 1. Commitment Scheme & PII Privacy Protection

### The Problem: Storing Identity On-Chain

Traditional identity systems face a critical challenge: how to prove someone is KYC-verified without storing their personal information on the public blockchain.

**Naive Approach (INSECURE):**

```solidity
struct Identity {
    string name;        // ❌ On-chain, visible to all
    uint256 age;        // ❌ PII exposed
    string idNumber;    // ❌ Searchable
}

// Anyone can read:
function getIdentity(address user) public view returns (Identity) {
    return identities[user];  // Alice's full KYC data visible!
}
```

**Risk:** Complete privacy violation. Any blockchain observer can correlate addresses to real-world identities.

---

### Our Solution: Commitment Hash Scheme

ZKyc uses a **commitment hash** approach where:

1. **User Creates Secret**

   ```javascript
   // Frontend (client-side, never sent anywhere)
   const secret = "my_very_secret_phrase_12345";
   const nullifier = userAddress; // Prevents replay attacks

   // Compute hash locally
   const commitmentHash = keccak256(secret + nullifier);
   // Result: 0x4a5f8e9c2b1d3e7f6a9b8c7d6e5f4a3b2c1d0e0f
   ```

2. **User Submits Only Hash On-Chain**

   ```solidity
   // Smart contract never sees the secret
   identities[user].commitmentHash = 0x4a5f8e9c2b1d3e7f6a9b8c7d6e5f4a3b2c1d0e0f;

   // Anyone can verify the commitment exists
   // But cannot derive secret from hash (cryptographically impossible)
   ```

3. **Issuer Verifies Off-Chain**

   ```
   Issuer's Process:
   1. KYC process happens offline (video call, docs verification)
   2. Issuer confirms user is legitimate
   3. Issuer attests the identity on-chain
   4. NO PII submitted to blockchain
   ```

4. **Credential Verification is Selective**

   ```solidity
   // Verifier only learns: "This address has valid KYC_PASSED"
   // Zero details about the person

   function hasValidCredential(address user, uint8 credType)
       external view returns (bool)
   {
       // Returns true/false only
       // Not the name, age, ID number, etc.
   }
   ```

---

### Security Analysis: Why This Protects Privacy

#### 1. Hash Function Properties (One-Way)

```
Secret → keccak256() → Commitment Hash
  ❌   ← (impossible to reverse)

Secret ≠ Hash
Without secret, cannot reverse-engineer the original value
```

**Mathematically:**

- `keccak256(x) = y` is computationally feasible
- Finding `x` given `y` requires `2^256` iterations (brute force)
- With `10^15` hash attempts/second: `2^256 / 10^15` ≈ millions of years

#### 2. Commitment Binding

```
User claims: "I'm Alice"
Proof: "I know the preimage to commitment 0x4a5f..."

User cannot prove same commitment for different secret because:
- Only they know the original secret
- Changing secret changes the hash completely
- On-chain verification prevents repudiation
```

#### 3. Zero Information Leakage

```
On-Chain Observable Data:
- ✓ Address has KYC_PASSED credential
- ✗ Name (not stored)
- ✗ Age (not stored)
- ✗ ID number (not stored)
- ✗ Nationality (not stored)
- ✗ Any PII (never on-chain)

Linked Data: Cannot correlate credential to real identity
without issuer's private records (off-chain)
```

---

### Privacy Limitations of Current Scheme

The commitment hash scheme is **not zero-knowledge** in the strict sense:

```
WHAT IS REVEALED:
✓ Address has credential
✓ Credential type
✓ Issued timestamp
✓ Expiry date
✗ Issued by specific issuer (if issuer stored on-chain)

WHAT IS NOT REVEALED:
✓ Any PII
✓ How address obtained credential
✓ Proof of underlying attributes
```

**For stronger privacy, use real ZK proofs (see next section).**

---

## 2. Zero-Knowledge Proofs: Production Implementation

### Current Limitation: Credential Existence Proof

Current system proves: "This address has a credential"

But doesn't prove underlying attributes without modification:

```solidity
// Current: Only credential existence
function hasValidCredential(address user, uint8 credType)
    public view returns (bool)
{
    // Returns: true/false
    // Hidden: HOW you proved KYC (manual review, docs, etc.)
}
```

### ZK Proof Advantage: Attribute Proof

Real ZK proofs would prove attributes without identity:

```solidity
// FUTURE: Prove attributes without identity
function verifyAttribute(
    bytes calldata zkProof,
    bytes calldata publicSignals
) public returns (bool) {
    // User proves: "I am ≥18 years old AND KYC passed"
    // Without revealing: name, age, ID, nationality, etc.

    // Verifier only checks: "This proof is cryptographically valid"
    // Result: No PII, just "attribute verified"
}
```

---

### Implementation: Circom + snarkjs + ZK Verifier

#### Step 1: Define Attributes in Circom

```circom
// age-verification.circom
pragma circom 2.0;

template AgeVerification() {
    signal private input dateOfBirth;      // Hidden from verifier
    signal private input secret;           // Hidden from verifier
    signal public input ageCommitment;     // Only this is public

    signal output isOfAge;                 // Output: 1 = over 18

    // Prove: dateOfBirth converts to age ≥ 18
    // Without revealing: dateOfBirth value

    var currentDate = <timestamp>;
    var age = (currentDate - dateOfBirth) / (365 * 24 * 60 * 60);

    // Constraint: age must be ≥ 18
    signal ageCheck <== age - 18;
    ageCheck * (ageCheck - 1) * (ageCheck - 2) * ... === 0;

    // Commitment matches (prevents lying)
    var commitmentCheck = sha256(dateOfBirth, secret);
    commitmentCheck === ageCommitment;

    isOfAge <== (age >= 18) ? 1 : 0;
}

component main = AgeVerification();
```

#### Step 2: Generate Proof (Off-Chain)

```javascript
// User generates proof on frontend/server
const snarkjs = require("snarkjs");

async function generateProof() {
	// Private inputs (never sent anywhere)
	const inputs = {
		dateOfBirth: "946771200", // 2000-01-01 (hidden)
		secret: "my_secret_phrase", // (hidden)
		ageCommitment: "0x4a5f8e...", // Public commitment
	};

	// Generate proof
	const { proof, publicSignals } = await snarkjs.groth16.fullProve(
		inputs,
		"age-verification.wasm",
		"age-verification_final.zkey",
	);

	// Send only proof + publicSignals (dateOfBirth/secret hidden!)
	return { proof, publicSignals };
}
```

#### Step 3: Verify On-Chain

```solidity
// Verifier contract (on-chain)
pragma solidity 0.8.20;

interface IZKVerifier {
    function verifyProof(
        bytes calldata proof,
        uint256[] calldata publicSignals
    ) external view returns (bool);
}

contract AgeGate {
    IZKVerifier public zkVerifier;

    // Once verified, can access restricted functions
    mapping(bytes32 => bool) public verifiedProofs;

    function verifyAge(
        bytes calldata proof,
        uint256[] calldata publicSignals
    ) external {
        // Verify the ZK proof
        require(
            zkVerifier.verifyProof(proof, publicSignals),
            "Invalid ZK proof"
        );

        // Extract public signals
        bytes32 ageCommitment = bytes32(publicSignals[0]);
        uint256 isOfAge = publicSignals[1];

        require(isOfAge == 1, "Must be 18+");

        // Mark proof as used (prevent replay)
        verifiedProofs[ageCommitment] = true;

        // User can now access age-restricted features
        // without ever revealing birthdate!
    }

    modifier onlyAgeVerified(bytes32 ageCommitment) {
        require(verifiedProofs[ageCommitment], "Not verified");
        _;
    }
}
```

---

### Comparison: Commitment Hash vs ZK Proof

| Feature                | Current (Hash)                        | ZK Proof (Future)                |
| ---------------------- | ------------------------------------- | -------------------------------- |
| **Proof Method**       | One-way hash                          | Cryptographic proof              |
| **PII Leakage**        | None                                  | None                             |
| **Attribute Proof**    | No (only credential exists)           | Yes (age ≥ 18, KYC passed)       |
| **Revealability**      | Cannot prove without revealing secret | Can selectively prove attributes |
| **Gas Cost**           | ~50k gas                              | ~250k gas (worth it for privacy) |
| **Circuit Complexity** | N/A                                   | Medium (age ≥ 18 logic)          |
| **User Experience**    | Simple (hash locally)                 | More complex (generate proof)    |
| **Privacy Grade**      | Good                                  | Excellent                        |

---

### Why We Don't Use ZK Now (Roadmap)

**Reasons for current commitment hash approach:**

1. **Simplicity** - Easy to understand and audit
2. **Educational Value** - Teaches privacy concepts without ZK complexity
3. **Gas Efficiency** - Registration ~50k gas vs ~250k with ZK
4. **Proof Generation** - Requires computational resources (5-30 seconds per proof)
5. **Standards Still Evolving** - Multiple ZK protocols competing (Groth16, Plonk, etc.)

**Production Roadmap:**

```
Phase 1: Commitment Hash (Current)
  └─> Teaches privacy preservation

Phase 2: Add ZK Proofs (Next)
  └─> Optional attribute verification
  └─> Hybrid mode: use hash OR ZK

Phase 3: Full ZK System
  └─> All verification via ZK proofs
  └─> Maximum privacy
  └─> Integration with ZK rollups
```

---

## 3. Reentrancy Vectors & Mitigations

### Reentrancy: The Attack

**What is it?** An attacker recursively calls a function before state updates complete.

```solidity
// VULNERABLE pattern
function withdraw(uint amount) external {
    require(balance[msg.sender] >= amount);

    // ❌ State not updated yet!
    (bool success, ) = msg.sender.call{value: amount}("");

    // ⚠️ If msg.sender is contract, it runs code here
    // Attacker's contract calls withdraw() again
    // Still sees old balance, steals funds again!

    balance[msg.sender] -= amount;  // Too late!
}
```

**Impact:** Attacker can drain contract repeatedly.

---

### Vector 1: IdentityRegistry.registerIdentity()

**Analysis:**

```solidity
function registerIdentity(bytes32 commitmentHash)
    external nonReentrant
{
    // No external calls
    // No reentrancy vector!

    identities[msg.sender] = Identity({...});
    commitmentToAddress[commitmentHash] = msg.sender;
}
```

**Mitigations:**

- ✓ `nonReentrant` guard (defense in depth)
- ✓ No external calls (no hook points)
- ✓ State changes are atomic

**Risk Level:** 🟢 None

---

### Vector 2: IdentityRegistry.attestIdentity()

**Analysis:**

```solidity
function attestIdentity(address user, uint256 expiryDays)
    external nonReentrant
{
    // ✓ Validation checks run first (checks)
    require(identities[user].commitmentHash != bytes32(0));

    // ✓ State updated (effects)
    identities[user].issuer = msg.sender;
    identities[user].issuedAt = block.timestamp;
    identities[user].expiresAt = block.timestamp + (expiryDays * 1 days);

    // ✓ No interactions (no external calls)

    // ✓ Event emitted after state update (good practice)
    emit IdentityAttested(user, msg.sender, expiresAt);
}
```

**Mitigations:**

- ✓ Checks-Effects pattern (no interactions)
- ✓ `nonReentrant` guard
- ✓ No external calls possible

**Risk Level:** 🟢 None

---

### Vector 3: CredentialVerifier.issueCredential()

**Analysis:**

```solidity
function issueCredential(
    address user,
    uint8 credentialType,
    bytes32 credentialHash,
    uint256 expiryDays
)
    external nonReentrant
{
    // ✓ Validation (checks)
    require(!issuers[msg.sender] == false);

    // ✓ Storage update (effects)
    credentials[user][CredentialType(credentialType)] = Credential({
        credentialHash: credentialHash,
        issuedAt: block.timestamp,
        expiresAt: block.timestamp + (expiryDays * 1 days),
        revoked: false
    });

    // ✓ No external calls (no interactions)
    emit CredentialIssued(user, credentialType, expiresAt);
}
```

**Mitigations:**

- ✓ Pure state change (no external hooks)
- ✓ `nonReentrant` guard
- ✓ Atomic operation

**Risk Level:** 🟢 None

---

### Vector 4: AccessGate.whitelistDeposit()

**Analysis:**

```solidity
function whitelistDeposit()
    external payable nonReentrant onlyKYCPassed
{
    // ✓ Validation (checks)
    require(msg.value > 0);

    // ✓ State update FIRST (effects)
    deposits[msg.sender] += msg.value;
    totalDeposits += msg.value;

    // ✓ No external calls (interactions)

    emit DepositWhitelisted(msg.sender, msg.value);
}
```

**Why no reentrancy:**

- Value already transferred by EVM (`payable`)
- No callbacks to user contract
- State updated before any possible external interaction

**Mitigations:**

- ✓ `nonReentrant` guard
- ✓ Checks-Effects pattern
- ✓ No external calls

**Risk Level:** 🟢 None

---

### Vector 5: AccessGate.whitelistWithdraw() ⚠️ CRITICAL

**This is where reentrancy is most likely!**

**Vulnerable Pattern:**

```solidity
// ❌ BAD (reentrancy vulnerable)
function whitelistWithdraw_bad(uint256 amount)
    external
    onlyKYCPassed
{
    require(deposits[msg.sender] >= amount);

    // Interaction: LOW-LEVEL CALL (attacker hook point!)
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);

    // ❌ State updated AFTER external call!
    // Attacker's contract receives control here
    // Can call withdrawAgain -> still sees old balance!
    deposits[msg.sender] -= amount;
}
```

**Attack:**

```solidity
// Attacker contract
contract Attacker {
    AccessGate gate;

    function attack() external {
        gate.whitelistWithdraw(1 ether);  // First call
    }

    // Fallback is called when receiving ETH
    fallback() external payable {
        if (gate.getBalance(address(this)) > 0) {
            gate.whitelistWithdraw(1 ether);  // Recursive call!
            // Balance still shows 2 ether, not 1!
        }
    }
}
```

---

### Our Mitigation: Checks-Effects-Interactions

**Our Secure Pattern:**

```solidity
function whitelistWithdraw(uint256 amount)
    external
    nonReentrant
    onlyKYCPassed
{
    // ✓ CHECKS: Validate inputs
    require(amount > 0, "Withdrawal must be > 0");
    require(deposits[msg.sender] >= amount, "Insufficient balance");

    // ✓ EFFECTS: Update state FIRST
    deposits[msg.sender] -= amount;    // Deduct BEFORE sending!
    totalDeposits -= amount;

    // ✓ INTERACTIONS: External calls LAST
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Withdrawal failed");

    // ✓ Event last
    emit WithdrawalExecuted(msg.sender, amount);
}
```

**Why it's safe:**

```
1. State is updated FIRST:
   deposits[user] -= amount;

2. External call happens AFTER:
   (bool success, ) = msg.sender.call{...}("");

3. Even if attacker re-enters:
   - Balance check fails (balance already deducted)
   - Cannot steal more funds

4. ReentrancyGuard adds extra protection:
   - Only allows one level of function execution
   - Subsequent reentries blocked at contract level
```

**Attack Prevention:**

```solidity
// Attacker tries to re-enter
call withdraw() -> 1st time
  └─> update state (deposits[attacker] -= 1 eth)
  └─> call {value: 1 eth}
      └─> attacker's fallback calls withdraw() -> 2nd time
          └─> nonReentrant guard blocks it!
              Error: ReentrancyGuard: reentrant call
```

**Mitigations (Multiple Layers):**

- ✓ `nonReentrant` guard (first line of defense)
- ✓ Checks-Effects-Interactions pattern (best practice)
- ✓ State deduction before external call (fundamental protection)
- ✓ Low-level call wrapped safely (no unchecked assertions)

**Risk Level:** 🟡→🟢 Mitigated (was high, now defended)

---

### Vector 6: Supply Chain / Signature Verification (Hypothetical Future)

If ZKyc were to add off-chain signature verification:

```solidity
// HYPOTHETICAL FUTURE FEATURE (not in current code)
function attestBySignature(
    address user,
    uint256 expiryDays,
    bytes memory signature
) external {
    // Verify issuer signed this transaction
    address issuer = recoverSigner(signature);
    require(issuers[issuer]);

    // ❌ Potential vector: untrusted token callback
    // If ERC777 or callback-enabled token involved
    token.transferFrom(issuer, address(this), fee);  // Could reentrancy

    // ✓ Fix: Always use nonReentrant + CEI pattern
}
```

**Prevention in Code:**

- ✓ Current code has NO token transfers
- ✓ If added, would use `ReentrancyGuard`
- ✓ Would follow CEI pattern

**Risk Level:** 🟢 Not applicable (no token interactions)

---

## Summary: Reentrancy Matrix

| Function              | External Calls   | Reentrancy Risk | Mitigations        |
| --------------------- | ---------------- | --------------- | ------------------ |
| `registerIdentity()`  | None             | 🟢 None         | nonReentrant guard |
| `attestIdentity()`    | None             | 🟢 None         | nonReentrant guard |
| `revokeIdentity()`    | None             | 🟢 None         | nonReentrant guard |
| `issueCredential()`   | None             | 🟢 None         | nonReentrant guard |
| `revokeCredential()`  | None             | 🟢 None         | nonReentrant guard |
| `whitelistDeposit()`  | None             | 🟢 None         | nonReentrant guard |
| `whitelistWithdraw()` | `call{value:}()` | 🟡→🟢           | nonReentrant + CEI |

---

## 4. Additional Security Measures

### Custom Errors (Gas + Security)

```solidity
// Old way (inefficient)
require(msg.sender == owner, "Only owner");  // String in bytecode

// New way (efficient + better errors)
if (msg.sender != owner) revert NotOwner();  // Error selector only

// Benefits:
// ✓ Smaller bytecode
// ✓ Cheaper reverts
// ✓ Clear error semantics
// ✓ Better debugging
```

### Input Validation

```solidity
if (user == address(0)) revert ZeroAddressNotAllowed();
if (!issuers[msg.sender]) revert NotAnIssuer();
if (credentialType > 2) revert InvalidCredentialType();
```

### Event Logging

```solidity
// Track all state changes with events
emit IdentityRegistered(user, commitmentHash, block.timestamp);
emit IdentityAttested(user, issuer, expiresAt);
emit CredentialIssued(user, credType, expiresAt);

// Benefits:
// ✓ Off-chain monitoring
// ✓ Audit trail
// ✓ Replay attack detection
```

---

## Conclusion

ZKyc implements **defense-in-depth** security:

```
Layer 1: Privacy Design
  └─> Commitment hashes prevent PII leakage

Layer 2: Reentrancy Protection
  └─> nonReentrant guards + CEI pattern

Layer 3: Input Validation
  └─> Zero address checks, role verification

Layer 4: Event Logging
  └─> Full audit trail for monitoring

Layer 5: Custom Errors
  └─> Clear semantics, gas efficient

Layer 6: Role-Based Access
  └─> Owner, Issuer, User separation
```

**For Production Deployment:**

- Run Slither security analysis
- Get professional audit
- Upgrade to real ZK proofs
- Add bug bounty program
- Enable rate limiting on frontend
