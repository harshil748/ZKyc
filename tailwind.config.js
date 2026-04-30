module.exports = {
	content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			colors: {
				primary: "#ff6b35",
				secondary: "#7c3aed",
				accent: "#e9d5ff",
				dark: "#0f0f0f",
			},
			animation: {
				"pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
			},
		},
	},
	plugins: [],
};
