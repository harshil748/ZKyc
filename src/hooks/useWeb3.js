import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";

export const useWeb3 = () => {
	const [account, setAccount] = useState(null);
	const [provider, setProvider] = useState(null);
	const [signer, setSigner] = useState(null);
	const [chainId, setChainId] = useState(null);
	const [isConnecting, setIsConnecting] = useState(false);
	const [error, setError] = useState(null);

	// Check if MetaMask is installed
	const isMetaMaskInstalled = useCallback(() => {
		return typeof window !== "undefined" && window.ethereum;
	}, []);

	// Connect wallet
	const connectWallet = useCallback(async () => {
		if (!isMetaMaskInstalled()) {
			setError("MetaMask is not installed");
			return;
		}

		setIsConnecting(true);
		setError(null);

		try {
			const accounts = await window.ethereum.request({
				method: "eth_requestAccounts",
			});

			const provider = new ethers.BrowserProvider(window.ethereum);
			const signer = await provider.getSigner();
			const network = await provider.getNetwork();

			setAccount(accounts[0]);
			setProvider(provider);
			setSigner(signer);
			setChainId(Number(network.chainId));
		} catch (err) {
			setError(err.message);
			console.error("Connection error:", err);
		} finally {
			setIsConnecting(false);
		}
	}, [isMetaMaskInstalled]);

	// Disconnect wallet
	const disconnectWallet = useCallback(() => {
		setAccount(null);
		setProvider(null);
		setSigner(null);
		setChainId(null);
	}, []);

	// Listen for account changes
	useEffect(() => {
		if (!isMetaMaskInstalled()) return;

		const handleAccountsChanged = (accounts) => {
			if (accounts.length === 0) {
				disconnectWallet();
			} else {
				setAccount(accounts[0]);
			}
		};

		const handleChainChanged = (chainIdHex) => {
			setChainId(Number(chainIdHex));
			// Reload page on chain change
			window.location.reload();
		};

		window.ethereum.on("accountsChanged", handleAccountsChanged);
		window.ethereum.on("chainChanged", handleChainChanged);

		return () => {
			window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
			window.ethereum.removeListener("chainChanged", handleChainChanged);
		};
	}, [isMetaMaskInstalled, disconnectWallet]);

	// Check initial connection
	useEffect(() => {
		const checkConnection = async () => {
			if (!isMetaMaskInstalled()) return;

			try {
				const accounts = await window.ethereum.request({
					method: "eth_accounts",
				});

				if (accounts.length > 0) {
					const provider = new ethers.BrowserProvider(window.ethereum);
					const signer = await provider.getSigner();
					const network = await provider.getNetwork();

					setAccount(accounts[0]);
					setProvider(provider);
					setSigner(signer);
					setChainId(Number(network.chainId));
				}
			} catch (err) {
				console.error("Initial connection check failed:", err);
			}
		};

		checkConnection();
	}, [isMetaMaskInstalled]);

	return {
		account,
		provider,
		signer,
		chainId,
		isConnecting,
		error,
		connectWallet,
		disconnectWallet,
		isMetaMaskInstalled: isMetaMaskInstalled(),
	};
};
