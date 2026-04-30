const fs = require("fs");
const path = require("path");

async function main() {
	console.log("🚀 Deploying ZKyc contracts...\n");

	const [deployer] = await ethers.getSigners();
	console.log("📋 Deploying with account:", deployer.address);

	// Deploy IdentityRegistry
	console.log("\n1️⃣  Deploying IdentityRegistry...");
	const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
	const identityRegistry = await IdentityRegistry.deploy();
	await identityRegistry.waitForDeployment();
	const identityRegistryAddress = await identityRegistry.getAddress();
	console.log("✅ IdentityRegistry deployed to:", identityRegistryAddress);

	// Deploy CredentialVerifier
	console.log("\n2️⃣  Deploying CredentialVerifier...");
	const CredentialVerifier = await ethers.getContractFactory(
		"CredentialVerifier",
	);
	const credentialVerifier = await CredentialVerifier.deploy();
	await credentialVerifier.waitForDeployment();
	const credentialVerifierAddress = await credentialVerifier.getAddress();
	console.log("✅ CredentialVerifier deployed to:", credentialVerifierAddress);

	// Deploy AccessGate
	console.log("\n3️⃣  Deploying AccessGate...");
	const AccessGate = await ethers.getContractFactory("AccessGate");
	const accessGate = await AccessGate.deploy(credentialVerifierAddress);
	await accessGate.waitForDeployment();
	const accessGateAddress = await accessGate.getAddress();
	console.log("✅ AccessGate deployed to:", accessGateAddress);

	// Prepare deployment data
	const deploymentData = {
		network: (await ethers.provider.getNetwork()).name,
		chainId: String((await ethers.provider.getNetwork()).chainId),
		deployedAt: new Date().toISOString(),
		contracts: {
			IdentityRegistry: {
				address: identityRegistryAddress,
				abi: JSON.parse(IdentityRegistry.interface.formatJson()),
			},
			CredentialVerifier: {
				address: credentialVerifierAddress,
				abi: JSON.parse(CredentialVerifier.interface.formatJson()),
			},
			AccessGate: {
				address: accessGateAddress,
				abi: JSON.parse(AccessGate.interface.formatJson()),
			},
		},
	};

	// Custom JSON replacer to handle BigInt
	const replacer = (key, value) => {
		if (typeof value === "bigint") {
			return value.toString();
		}
		return value;
	};

	// Create config directory if it doesn't exist
	const configDir = path.join(__dirname, "..", "src", "config");
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, { recursive: true });
	}

	// Write contracts.json
	const contractsPath = path.join(configDir, "contracts.json");
	fs.writeFileSync(contractsPath, JSON.stringify(deploymentData, replacer, 2));
	console.log("\n📁 Contracts config written to:", contractsPath);

	console.log("\n✨ Deployment complete!");
	console.log("\n📝 Contract Addresses:");
	console.log("   IdentityRegistry:  ", identityRegistryAddress);
	console.log("   CredentialVerifier:", credentialVerifierAddress);
	console.log("   AccessGate:        ", accessGateAddress);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
