/**
 * Replace all green hex colors with grayscale equivalents across all client/src files
 * Run: node scripts/replace-green.js
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'client', 'src');

// Color replacements: [green, grayscale]
const REPLACEMENTS = [
  // Main greens
  ['#16a34a', '#1a1a1a'],
  ['#15803d', '#333333'],
  ['#22c55e', '#555555'],
  ['#047857', '#444444'],
  ['#10b981', '#666666'],
  ['#059669', '#444444'],
  ['#0d9488', '#555555'],
  ['#166534', '#333333'],
  
  // Green-tinted backgrounds (must handle these carefully to avoid partial matches)
  ['#d1fae5', '#e8e8e8'],
  ['#bbf7d0', '#cccccc'],
  ['#dcfce7', '#e0e0e0'],
  ['#f0fdf4', '#e8e8e8'],
  
  // Green borders
  ['#86efac', '#b0b0b0'],
  
  // Green focus rings / shadows
  ['rgba(22,163,74,0.', 'rgba(0,0,0,0.'],
  ['rgba(15,120,55,0.', 'rgba(0,0,0,0.'],
  ['rgba(16,185,129,0.', 'rgba(0,0,0,0.'],
  
  // green emoji / text labels (NOT hex colors - just English words)
  // These need to be handled manually since they're different contexts
];

function walkDir(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // Exclude node_modules
      if (file !== 'node_modules') {
        results.push(...walkDir(fullPath));
      }
    } else if (/\.(jsx|js|css)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const [green, gray] of REPLACEMENTS) {
    if (content.includes(green)) {
      // Verify the old green still exists before replacing
      const newContent = content.split(green).join(gray);
      if (newContent !== content) {
        content = newContent;
        modified = true;
        const count = (content.match(new RegExp(gray.replace('#', '\\#').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        console.log(`  ${green} -> ${gray} in ${path.basename(filePath)}`);
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Walk all files
const files = walkDir(SRC_DIR);
console.log(`Found ${files.length} files in ${SRC_DIR}`);

let modifiedCount = 0;
for (const file of files) {
  const relativePath = path.relative(SRC_DIR, file);
  if (replaceInFile(file)) {
    modifiedCount++;
    console.log(`✓ ${relativePath}`);
  }
}

console.log(`\n✅ Done! ${modifiedCount} files modified.`);
