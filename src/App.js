import React, { useState } from "react";
import ConnectWallet from "./components/ConnectWallet";
import RegisterIdentity from "./components/RegisterIdentity";
import IssuerDashboard from "./components/IssuerDashboard";
import VerifyCredential from "./components/VerifyCredential";
import AccessGateUI from "./components/AccessGateUI";

function App() {
	const [activeTab, setActiveTab] = useState("connect");

	const tabs = [
		{ id: "connect", label: "🔗 Connect", icon: "🔗" },
		{ id: "register", label: "🔐 Register", icon: "🔐" },
		{ id: "issuer", label: "👨‍💼 Issuer", icon: "👨‍💼" },
		{ id: "verify", label: "🔍 Verify", icon: "🔍" },
		{ id: "gate", label: "🏛️ Access Gate", icon: "🏛️" },
	];

	const renderContent = () => {
		switch (activeTab) {
			case "connect":
				return <ConnectWallet />;
			case "register":
				return <RegisterIdentity />;
			case "issuer":
				return <IssuerDashboard />;
			case "verify":
				return <VerifyCredential />;
			case "gate":
				return <AccessGateUI />;
			default:
				return null;
		}
	};

	return (
		<div className='min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-black'>
			{/* Animated Background Elements */}
			<div className='fixed inset-0 overflow-hidden pointer-events-none'>
				<div className='absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl'></div>
				<div className='absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl'></div>
			</div>

			{/* Main Content */}
			<div className='relative z-10 min-h-screen flex flex-col'>
				{/* Header */}
				<header className='glass-dark border-b border-white/10 py-6 sticky top-0'>
					<div className='max-w-6xl mx-auto px-4'>
						<div className='flex items-center justify-between mb-6'>
							<div>
								<h1 className='text-4xl font-bold gradient-text'>🚀 ZKyc</h1>
								<p className='text-gray-400 text-sm mt-1'>
									Privacy-Preserving Decentralized Identity & KYC Verification
								</p>
							</div>
							<div className='text-right text-xs text-gray-500'>
								<p>Solidity ^0.8.20</p>
								<p>Ethers.js v6 • React 18</p>
							</div>
						</div>

						{/* Tab Navigation */}
						<nav className='flex gap-2 overflow-x-auto pb-2'>
							{tabs.map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all duration-300 ${
										activeTab === tab.id ?
											"bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/50"
										:	"bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
									}`}>
									{tab.icon} {tab.label}
								</button>
							))}
						</nav>
					</div>
				</header>

				{/* Main Content Area */}
				<main className='flex-1 py-8'>
					<div className='max-w-6xl mx-auto px-4'>{renderContent()}</div>
				</main>

				{/* Footer */}
				<footer className='glass-dark border-t border-white/10 py-6 mt-12'>
					<div className='max-w-6xl mx-auto px-4'>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-400 mb-6'>
							<div>
								<h4 className='font-semibold text-white mb-2'>🔐 Security</h4>
								<ul className='space-y-1 text-xs'>
									<li>✓ Client-side hashing only</li>
									<li>✓ Reentrancy guards on all state changes</li>
									<li>✓ Privacy by design</li>
									<li>✓ Custom errors for security</li>
								</ul>
							</div>
							<div>
								<h4 className='font-semibold text-white mb-2'>
									🏗️ Architecture
								</h4>
								<ul className='space-y-1 text-xs'>
									<li>✓ Anti-Sybil enforcement</li>
									<li>✓ Role-based access control</li>
									<li>✓ Selective disclosure model</li>
									<li>✓ Composable credential system</li>
								</ul>
							</div>
							<div>
								<h4 className='font-semibold text-white mb-2'>💡 Features</h4>
								<ul className='space-y-1 text-xs'>
									<li>✓ Identity registration</li>
									<li>✓ Credential issuance & revocation</li>
									<li>✓ Gated smart contracts</li>
									<li>✓ Lifetime credential management</li>
								</ul>
							</div>
						</div>

						<div className='border-t border-white/10 pt-4 text-center text-xs text-gray-500'>
							<p>
								Built with Solidity • Hardhat • React • Ethers.js v6
								{" | "}
								<span className='text-orange-400'>Cybersecurity First</span>
							</p>
						</div>
					</div>
				</footer>
			</div>
		</div>
	);
}

export default App;
