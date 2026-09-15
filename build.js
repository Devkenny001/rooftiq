// Rebuilds the self-contained index.html from the editable files in src/.
// Usage:  node build.js
const fs = require('fs');
const path = require('path');
const src = p => fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
let html = src('index.html');
html = html.replace('<link rel="stylesheet" href="css/style.css">', () => '<style>\n' + src('css/style.css') + '\n</style>');
html = html.replace('<script src="js/main.js"></script>', () => '<script>\n' + src('js/main.js') + '\n</script>');
if (html.includes('css/style.css') || html.includes('js/main.js')) throw new Error('Could not inline assets. Check the link/script tags in src/index.html.');
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('Built index.html (' + Math.round(html.length / 1024) + ' KB)');
