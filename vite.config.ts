import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// Static output keeps both practice modes compatible with GitHub Pages.
export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { include: ['@base-ui/react/button', '@base-ui/react/switch'] },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext(), sites()],
});
