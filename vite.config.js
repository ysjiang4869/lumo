import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import reactSvgPlugin from 'vite-plugin-react-svg';
import svgr from '@honkhonk/vite-plugin-svgr';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), svgr({ keepEmittedAssets: true })],
    // iOS/Android 的 Obsidian 跑在纯 WebView 里，没有 Node 的 `process` 全局。
    // React 及其依赖会直接读 `process.env.NODE_ENV`（无 typeof 保护），若不在构建期
    // 替换成字面量，产物里会保留裸 `process` 引用，导致移动端加载即报
    // `ReferenceError: Can't find variable: process`。桌面端有 Electron 的 process 全局所以不受影响。
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
    },
    build: {
      sourcemap: mode === 'development' ? 'inline' : false,
      minify: false,
      // Use Vite lib mode https://vitejs.dev/guide/build.html#library-mode
      lib: {
        entry: path.resolve(__dirname, './src/index.ts'),
        formats: ['cjs'],
      },
      rollupOptions: {
        output: {
          // Overwrite default Vite output fileName
          entryFileNames: 'main.js',
          assetFileNames: 'styles.css',
        },
        external: ['obsidian'],
      },
      // Use root as the output dir
      emptyOutDir: false,
      outDir: '.',
    },
  };
});
