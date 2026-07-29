const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'high-resolution-color-logo.png');
const dest = path.join(__dirname, '..', 'client', 'public', 'high-resolution-color-logo.png');

fs.copyFileSync(src, dest);
console.log('✅ Logo copied to client/public/high-resolution-color-logo.png');
