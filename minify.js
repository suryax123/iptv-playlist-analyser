// Simple CSS & JS Minifier for Performance
const fs = require('fs');
const path = require('path');

// Minify CSS
function minifyCSS(css) {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove spaces around special characters
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    // Remove trailing semicolons
    .replace(/;}/g, '}')
    // Trim
    .trim();
}

// Minify JS (basic)
function minifyJS(js) {
  return js
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Trim
    .trim();
}

// Read and minify CSS
const cssPath = path.join(__dirname, 'public', 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');
const minifiedCSS = minifyCSS(css);
fs.writeFileSync(path.join(__dirname, 'public', 'style.min.css'), minifiedCSS);

// Read and minify JS
const jsPath = path.join(__dirname, 'public', 'app.js');
const js = fs.readFileSync(jsPath, 'utf8');
const minifiedJS = minifyJS(js);
fs.writeFileSync(path.join(__dirname, 'public', 'app.min.js'), minifiedJS);

// Stats
const cssOriginal = fs.statSync(cssPath).size;
const cssMinified = fs.statSync(path.join(__dirname, 'public', 'style.min.css')).size;
const jsOriginal = fs.statSync(jsPath).size;
const jsMinified = fs.statSync(path.join(__dirname, 'public', 'app.min.js')).size;

console.log('✅ Minification Complete!');
console.log(`\nCSS: ${cssOriginal} bytes → ${cssMinified} bytes (${Math.round((1 - cssMinified/cssOriginal) * 100)}% reduction)`);
console.log(`JS:  ${jsOriginal} bytes → ${jsMinified} bytes (${Math.round((1 - jsMinified/jsOriginal) * 100)}% reduction)`);
console.log('\n📝 Update HTML files to use:');
console.log('  <link rel="stylesheet" href="style.min.css?v=5">');
console.log('  <script src="app.min.js?v=5"></script>');
