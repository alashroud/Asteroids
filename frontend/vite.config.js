import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Copy all files from public, including subdirectories
    copyPublicDir: true,
    rollupOptions: {
      output: {
        // Don't hash public assets (keep original names for GLTF)
        assetFileNames: (assetInfo) => {
          // Keep GLTF and related files with original structure
          if (assetInfo.name && (
            assetInfo.name.endsWith('.gltf') ||
            assetInfo.name.endsWith('.bin') ||
            assetInfo.name.endsWith('.jpg') ||
            assetInfo.name.endsWith('.jpeg') ||
            assetInfo.name.endsWith('.png')
          )) {
            return 'assets/[name][extname]';
          }
          // Hash other assets
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});