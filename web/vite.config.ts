import { defineConfig } from "vite-plus";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
  plugins: [tailwindcss()],
});
