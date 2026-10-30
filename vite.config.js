export default {
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: { input: { main: 'index.html', olcum: 'olcum.html' }, output: { manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined) } },
  },
};
