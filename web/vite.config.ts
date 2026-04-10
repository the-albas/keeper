import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
	fmt: {
		options: {
			ignorePath: ".oxfmtignore",
		},
	},
	lint: { options: { typeAware: true, typeCheck: true } },
	plugins: [
		tailwindcss(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
	],
	resolve: {
		tsconfigPaths: true,
		alias: {
			"@": "/src",
		},
	},
	server: {
		host: "0.0.0.0",
		allowedHosts: ["localhost", "127.0.0.1", ".test"],
		proxy: {
			"/api": {
				target: "http://localhost:5216",
				changeOrigin: true,
			},
		},
	},
});
