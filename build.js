#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const isWatch = args.includes('--watch');

console.log('🔨 Building dotLOG extension...');

try {
  // Clean previous build
  if (fs.existsSync('out/extension.js')) {
    fs.unlinkSync('out/extension.js');
  }
  if (fs.existsSync('out/extension.js.map')) {
    fs.unlinkSync('out/extension.js.map');
  }

  // Build command
  let buildCmd = 'esbuild ./src/extension.ts --bundle --outfile=out/extension.js --external:vscode --format=cjs --platform=node';

  if (isDev) {
    buildCmd += ' --sourcemap';
    console.log('📝 Building in development mode with source maps...');
  } else {
    buildCmd += ' --minify';
    console.log('🚀 Building in production mode with minification...');
  }

  if (isWatch) {
    buildCmd += ' --watch';
    console.log('👀 Watching for changes...');
  }

  execSync(buildCmd, { stdio: 'inherit' });

  if (!isWatch) {
    const stats = fs.statSync('out/extension.js');
    console.log(`✅ Build complete! Extension size: ${(stats.size / 1024).toFixed(2)}KB`);
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}