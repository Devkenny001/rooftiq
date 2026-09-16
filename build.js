// Rebuilds the self-contained index.html from the editable files in src/.
// Usage:  node build.js
const fs = require('fs');
const path = require('path');
const src = p => fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
// The callback form of .replace matters here: with a plain string, "$$" and
// "$&" inside the CSS or JS would be read as replacement patterns and rewritten.
const LINK = '<link rel="stylesheet" href="css/style.css">';
const SCRIPT = '<script src="js/main.js"></script>';
let html = src('index.html');
html = html.replace(LINK, () => '<style>\n' + src('css/style.css') + '\n</style>');
html = html.replace(SCRIPT, () => '<script>\n' + src('js/main.js') + '\n</script>');
// Check for the tags themselves, not the paths: prose and comments in the page
// legitimately mention js/main.js.
if (html.includes(LINK) || html.includes(SCRIPT)) throw new Error('Could not inline assets. Check the link/script tags in src/index.html.');
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('Built index.html (' + Math.round(html.length / 1024) + ' KB)');
