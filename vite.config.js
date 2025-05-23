import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/portfolio/",
  plugins: [react(), glsl()]
});
