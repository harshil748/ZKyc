const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZKyc - Full System Tests", function () {
	let identityRegistry;
	let credentialVerifier;
	let accessGate;
	let owner, issuer, user1, user2;

	beforeEach(async () => {
		[owner, issuer, user1, user2] = await ethers.getSigners();

		// Deploy IdentityRegistry
		const IdentityRegistry = await ethers.getContractFactory(
			"IdentityRegistry",
		);
		identityRegistry = await IdentityRegistry.deploy();
		await identityRegistry.waitForDeployment();

		// Deploy CredentialVerifier
		const CredentialVerifier = await ethers.getContractFactory(
			"CredentialVerifier",
		);
		credentialVerifier = await CredentialVerifier.deploy();
		await credentialVerifier.waitForDeployment();

		// Deploy AccessGate
		const AccessGate = await ethers.getContractFactory("AccessGate");
		accessGate = await AccessGate.deploy(await credentialVerifier.getAddress());
		await accessGate.waitForDeployment();

		// Add issuer roles
		await identityRegistry.addIssuer(issuer.address);
		await credentialVerifier.authorizeIssuer(issuer.address);
	});

	describe("IdentityRegistry", function () {
		it("should register an identity with commitment hash", async () => {
			const secret = ethers.id("mySecret");
			const commitmentHash = ethers.solidityPackedKeccak256(
				["bytes32", "address"],
				[secret, user1.address],
			);

			const tx = await identityRegistry
				.connect(user1)
				.registerIdentity(commitmentHash);

			// Just check that the event was emitted without validating all arguments
			// because timestamp is dynamic
			await expect(tx).to.emit(identityRegistry, "IdentityRegistered");

			const identity = await identityRegistry.identities(user1.address);
			expect(identity.commitmentHash).to.equal(commitmentHash);
		});

		it("should prevent Sybil attack: second registration from same address", async () => {
			const secret1 = ethers.id("secret1");
			const commitmentHash1 = ethers.solidityPackedKeccak256(
				["bytes32", "address"],
				[secret1, user1.address],
			);

			await identityRegistry.connect(user1).registerIdentity(commitmentHash1);

			// Try to register again with different hash
			const secret2 = ethers.id("secret2");
			const commitmentHash2 = ethers.solidityPackedKeccak256(
				["bytes32", "address"],
				[secret2, user1.address],
			);

			await expect(
				identityRegistry.connect(user1).registerIdentity(commitmentHash2),
			).to.be.revertedWithCustomError(
				identityRegistry,
				"CommitmentAlreadyExists",
			);
		});

		it("should prevent duplicate commitment hashes globally", async () => {
			const secret = ethers.id("sharedSecret");
			const commitmentHash = ethers.solidityPackedKeccak256(
				["bytes32", "address"],
				[secret, user1.address],
			);

			await identityRegistry.connect(user1).registerIdentity(commitmentHash);

			// Try user2 to use same commitment hash
			await expect(
				identityRegistry.connect(user2).registerIdentity(commitmentHash),
			).to.be.revertedWithCustomError(
				identityRegistry,
				"CommitmentAlreadyExists",
			);
		});

		it("should allow issuer to attest identity", async () => {
			const secret = ethers.id("mySecret");
			const commitmentHash = ethers.solidityPackedKeccak256(
				["bytes32", "address"],
				[secret, user1.address],
			);

			await identityRegistry.connect(user1).registerIdentity(commitmentHash);

			const expiryDays = 365;
			const tx = await identityRegistry
				.connect(issuer)
				.attestIdentity(user1.address, expiryDays);

			await expect(tx).to.emit(identityRegistry, "IdentityAttested");

			const identity = await identityRegistry.identities(user1.address);
			expect(identity.issuer).to.equal(issuer.address);
		});

		it("should reject attestation from non-issuer", async () => {
			const secret = ethers.id("mySecret");
			const commitmentHash = ethers.solidityPackedKeccak256(
				["bytes32", "address"],
				[secret, user1.address],
			);

			await identityRegistry.connect(user1).registerIdentity(commitmentHash);

			await expect(
				identityRegistry.connect(user2).attestIdentity(user1.address, 365),
			).to.be.revertedWithCustomError(identityRegistry, "NotAnIssuer");
		});

		it("should allow issuer to revoke identity", async () => {
			const secret = ethers.id("mySecret");
			const commitmentHash = ethers.solidityPackedKeccak256(
				["bytes32", "address"],
				[secret, user1.address],
			);

			await identityRegistry.connect(user1).registerIdentity(commitmentHash);
			await identityRegistry.connect(issuer).attestIdentity(user1.address, 365);

			const tx = await identityRegistry
				.connect(issuer)
				.revokeIdentity(user1.address);

			await expect(tx)
				.to.emit(identityRegistry, "IdentityRevoked")
				.withArgs(user1.address, issuer.address);

			const identity = await identityRegistry.identities(user1.address);
			expect(identity.revoked).to.be.true;
		});

		it("should check identity validity", async () => {
			const secret = ethers.id("mySecret");
			const commitmentHash = ethers.solidityPackedKeccak256(
				["bytes32", "address"],
				[secret, user1.address],
			);

			// Not registered yet
			let isValid = await identityRegistry.isIdentityValid(user1.address);
			expect(isValid).to.be.false;

			// After registration
			await identityRegistry.connect(user1).registerIdentity(commitmentHash);
			isValid = await identityRegistry.isIdentityValid(user1.address);
			expect(isValid).to.be.false; // Not attested yet

			// After attestation
			await identityRegistry.connect(issuer).attestIdentity(user1.address, 365);
			isValid = await identityRegistry.isIdentityValid(user1.address);
			expect(isValid).to.be.true;

			// After revocation
			await identityRegistry.connect(issuer).revokeIdentity(user1.address);
			isValid = await identityRegistry.isIdentityValid(user1.address);
			expect(isValid).to.be.false;
		});
	});

	describe("CredentialVerifier", function () {
		it("should issue a credential", async () => {
			const credentialData = ethers.id("kyc_data");
			const credentialHash = ethers.solidityPackedKeccak256(
				["bytes32"],
				[credentialData],
			);

			const tx = await credentialVerifier
				.connect(issuer)
				.issueCredential(user1.address, 1, credentialHash, 365); // 1 = KYC_PASSED

			await expect(tx).to.emit(credentialVerifier, "CredentialIssued");
		});
		it("should reject credential issuance from non-issuer", async () => {
			const credentialData = ethers.id("kyc_data");
			const credentialHash = ethers.solidityPackedKeccak256(
				["bytes32"],
				[credentialData],
			);

			await expect(
				credentialVerifier
					.connect(user2)
					.issueCredential(user1.address, 1, credentialHash, 365),
			).to.be.revertedWithCustomError(credentialVerifier, "NotAnIssuer");
		});

		it("should verify a valid credential", async () => {
			const credentialData = ethers.id("kyc_data");
			const credentialHash = ethers.solidityPackedKeccak256(
				["bytes32"],
				[credentialData],
			);

			await credentialVerifier
				.connect(issuer)
				.issueCredential(user1.address, 1, credentialHash, 365);

			const isValid = await credentialVerifier.hasValidCredential(
				user1.address,
				1,
			);
			expect(isValid).to.be.true;
		});

		it("should reject credential verification for non-existent credential", async () => {
			await expect(
				credentialVerifier.verifyCredential(user1.address, 1),
			).to.be.revertedWithCustomError(credentialVerifier, "CredentialNotFound");
		});

		it("should reject revoked credentials", async () => {
			const credentialData = ethers.id("kyc_data");
			const credentialHash = ethers.solidityPackedKeccak256(
				["bytes32"],
				[credentialData],
			);

			await credentialVerifier
				.connect(issuer)
				.issueCredential(user1.address, 1, credentialHash, 365);

			await credentialVerifier
				.connect(issuer)
				.revokeCredential(user1.address, 1);

			const isValid = await credentialVerifier.hasValidCredential(
				user1.address,
				1,
			);
			expect(isValid).to.be.false;
		});

		it("should reject expired credentials", async () => {
			const credentialData = ethers.id("kyc_data");
			const credentialHash = ethers.solidityPackedKeccak256(
				["bytes32"],
				[credentialData],
			);

			// Issue credential with 0 days expiry (expires immediately)
			await credentialVerifier
				.connect(issuer)
				.issueCredential(user1.address, 1, credentialHash, 0);

			// Move time forward
			await ethers.provider.send("hardhat_mine", ["0x100"]); // Mine 256 blocks

			const isValid = await credentialVerifier.hasValidCredential(
				user1.address,
				1,
			);
			expect(isValid).to.be.false;
		});
	});

	describe("AccessGate", function () {
		it("should block deposit from non-KYC user", async () => {
			await expect(
				accessGate
					.connect(user1)
					.whitelistDeposit({ value: ethers.parseEther("1") }),
			).to.be.revertedWithCustomError(accessGate, "UnauthorizedAccess");
		});

		it("should allow deposit from KYC-verified user", async () => {
			const credentialData = ethers.id("kyc_data");
			const credentialHash = ethers.solidityPackedKeccak256(
				["bytes32"],
				[credentialData],
			);

			// Issue KYC credential
			await credentialVerifier
				.connect(issuer)
				.issueCredential(user1.address, 1, credentialHash, 365);

			const depositAmount = ethers.parseEther("1");
			const tx = await accessGate
				.connect(user1)
				.whitelistDeposit({ value: depositAmount });

			await expect(tx)
				.to.emit(accessGate, "DepositWhitelisted")
				.withArgs(user1.address, depositAmount);

			const balance = await accessGate.getBalance(user1.address);
			expect(balance).to.equal(depositAmount);
		});

		it("should allow withdrawal from KYC-verified user", async () => {
			const credentialData = ethers.id("kyc_data");
			const credentialHash = ethers.solidityPackedKeccak256(
				["bytes32"],
				[credentialData],
			);

			// Issue KYC credential
			await credentialVerifier
				.connect(issuer)
				.issueCredential(user1.address, 1, credentialHash, 365);

			// Deposit
			const depositAmount = ethers.parseEther("1");
			await accessGate
				.connect(user1)
				.whitelistDeposit({ value: depositAmount });

			// Withdraw
			const withdrawAmount = ethers.parseEther("0.5");
			const tx = await accessGate
				.connect(user1)
				.whitelistWithdraw(withdrawAmount);

			await expect(tx)
				.to.emit(accessGate, "WithdrawalExecuted")
				.withArgs(user1.address, withdrawAmount);

			const remainingBalance = await accessGate.getBalance(user1.address);
			expect(remainingBalance).to.equal(depositAmount - withdrawAmount);
		});

		it("should verify user KYC status", async () => {
			const credentialData = ethers.id("kyc_data");
			const credentialHash = ethers.solidityPackedKeccak256(
				["bytes32"],
				[credentialData],
			);

			// Not verified initially
			let isVerified = await accessGate.isUserVerified(user1.address);
			expect(isVerified).to.be.false;

			// After issuing credential
			await credentialVerifier
				.connect(issuer)
				.issueCredential(user1.address, 1, credentialHash, 365);

			isVerified = await accessGate.isUserVerified(user1.address);
			expect(isVerified).to.be.true;
		});
	});

	describe("Full Integration Lifecycle", function () {
		it("should complete full lifecycle: register → attest → issue → verify → gate", async () => {
			// Step 1: User registers identity
			const secret = ethers.id("mySecret");
			const commitmentHash = ethers.solidityPackedKeccak256(
				["bytes32", "address"],
				[secret, user1.address],
			);

			await identityRegistry.connect(user1).registerIdentity(commitmentHash);
			let isValid = await identityRegistry.isIdentityValid(user1.address);
			expect(isValid).to.be.false; // Not attested yet

			// Step 2: Issuer attests identity
			await identityRegistry.connect(issuer).attestIdentity(user1.address, 365);
			isValid = await identityRegistry.isIdentityValid(user1.address);
			expect(isValid).to.be.true;

			// Step 3: Issuer issues KYC credential
			const credentialData = ethers.id("kyc_data");
			const credentialHash = ethers.solidityPackedKeccak256(
				["bytes32"],
				[credentialData],
			);

			await credentialVerifier
				.connect(issuer)
				.issueCredential(user1.address, 1, credentialHash, 365);

			// Step 4: Anyone can verify credential (selective disclosure)
			const hasCredential = await credentialVerifier.hasValidCredential(
				user1.address,
				1,
			);
			expect(hasCredential).to.be.true;

			// Step 5: User can access gated function
			const depositAmount = ethers.parseEther("2");
			const tx = await accessGate
				.connect(user1)
				.whitelistDeposit({ value: depositAmount });

			await expect(tx)
				.to.emit(accessGate, "DepositWhitelisted")
				.withArgs(user1.address, depositAmount);

			// Step 6: Issuer revokes credential
			await credentialVerifier
				.connect(issuer)
				.revokeCredential(user1.address, 1);

			// Step 7: Gated function now blocks user
			await expect(
				accessGate
					.connect(user1)
					.whitelistDeposit({ value: ethers.parseEther("1") }),
			).to.be.revertedWithCustomError(accessGate, "UnauthorizedAccess");
		});
	});
});
