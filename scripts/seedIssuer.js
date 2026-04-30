const fs = require("fs");
const path = require("path");

async function main() {
	console.log("🌱 Seeding Issuer Role...\n");

	const [deployer] = await ethers.getSigners();
	console.log("📋 Account:", deployer.address);

	// Read deployment config
	const configPath = path.join(
		__dirname,
		"..",
		"src",
		"config",
		"contracts.json",
	);
	if (!fs.existsSync(configPath)) {
		throw new Error("contracts.json not found. Run 'npm run deploy' first.");
	}

	const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
	const identityRegistryAddress = config.contracts.IdentityRegistry.address;
	const credentialVerifierAddress = config.contracts.CredentialVerifier.address;

	console.log("\n🔗 IdentityRegistry:  ", identityRegistryAddress);
	console.log("🔗 CredentialVerifier:", credentialVerifierAddress);

	// Get issuer address (use second signer if available, otherwise deployer)
	const signers = await ethers.getSigners();
	const issuerAddress =
		signers.length > 1 ? signers[1].address : deployer.address;

	console.log("\n👤 Issuer Address:", issuerAddress);

	// Attach to contracts
	const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
	const identityRegistry = IdentityRegistry.attach(identityRegistryAddress);

	const CredentialVerifier =
		await ethers.getContractFactory("CredentialVerifier");
	const credentialVerifier = CredentialVerifier.attach(
		credentialVerifierAddress,
	);

	// Add issuer to IdentityRegistry
	console.log("\n1️⃣  Adding issuer to IdentityRegistry...");
	let tx = await identityRegistry.addIssuer(issuerAddress);
	await tx.wait();
	console.log("✅ Issuer added to IdentityRegistry");

	// Add issuer to CredentialVerifier
	console.log("\n2️⃣  Adding issuer to CredentialVerifier...");
	tx = await credentialVerifier.authorizeIssuer(issuerAddress);
	await tx.wait();
	console.log("✅ Issuer authorized in CredentialVerifier");

	console.log("\n✨ Issuer seeding complete!");
	console.log("\n📝 Issuer Configuration:");
	console.log("   Issuer Address:", issuerAddress);
	console.log("   Can attest identities in IdentityRegistry");
	console.log("   Can issue credentials in CredentialVerifier");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
