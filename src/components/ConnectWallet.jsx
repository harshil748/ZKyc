import React from "react";
import { useWeb3 } from "../hooks/useWeb3";

const ConnectWallet = () => {
	const {
		account,
		chainId,
		isConnecting,
		error,
		connectWallet,
		disconnectWallet,
		isMetaMaskInstalled,
	} = useWeb3();

	const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

	const getNetworkName = (chainId) => {
		const networks = {
			31337: "Hardhat Local",
			1: "Ethereum Mainnet",
			5: "Goerli",
			11155111: "Sepolia",
		};
		return networks[chainId] || `Chain ${chainId}`;
	};

	if (!isMetaMaskInstalled) {
		return (
			<div className='glass p-6 border-2 border-red-500/50'>
				<p className='text-red-400'>
					⚠️ MetaMask is not installed. Please install MetaMask to use ZKyc.
				</p>
				<a
					href='https://metamask.io/download'
					target='_blank'
					rel='noopener noreferrer'
					className='mt-4 inline-block btn-primary'>
					Install MetaMask
				</a>
			</div>
		);
	}

	if (account) {
		const isLocalNetwork = chainId === 31337;

		if (!isLocalNetwork) {
			return (
				<div className='glass p-6 border-2 border-yellow-500/50'>
					<p className='text-yellow-400 mb-4'>
						⚠️ Wrong Network Detected: {getNetworkName(chainId)}
					</p>
					<p className='text-gray-300 text-sm mb-4'>
						ZKyc only works on Hardhat Local (Chain 31337). Please switch to a
						local Hardhat network.
					</p>
					<button onClick={disconnectWallet} className='btn-secondary'>
						Disconnect Wallet
					</button>
				</div>
			);
		}

		return (
			<div className='glass p-6 border-orange-500/30 border-2 animate-pulse-glow'>
				<div className='flex items-center justify-between'>
					<div>
						<p className='text-sm text-gray-400 mb-2'>Connected Account</p>
						<p className='font-mono text-orange-400 text-lg'>
							{formatAddress(account)}
						</p>
						<p className='text-xs text-purple-300 mt-2'>
							🌐 {getNetworkName(chainId)}
						</p>
					</div>
					<button
						onClick={disconnectWallet}
						className='btn-outline transition-all duration-300'>
						Disconnect
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className='glass p-6 border-purple-500/30'>
			<p className='text-gray-300 mb-4'>
				Connect your MetaMask wallet to get started with ZKyc.
			</p>
			{error && <p className='text-red-400 text-sm mb-4'>Error: {error}</p>}
			<button
				onClick={connectWallet}
				disabled={isConnecting}
				className='btn-primary disabled:opacity-50 disabled:cursor-not-allowed'>
				{isConnecting ? "Connecting..." : "Connect MetaMask"}
			</button>
		</div>
	);
};

export default ConnectWallet;
