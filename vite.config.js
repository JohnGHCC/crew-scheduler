import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: replace 'crew-scheduler' below with your actual GitHub repo name
// (only matters for GitHub Pages deployment - not needed for Vercel/Netlify)
export default defineConfig({
  base: "/crew-scheduler/",
  plugins: [react()],
});
