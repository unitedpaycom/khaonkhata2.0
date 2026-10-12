const fs = require('fs');
const esbuild = require('esbuild');

// Read files
let bundle = fs.readFileSync('assets/index-v2.js', 'utf8');
let src = fs.readFileSync('src/components/EmbossedAuth.jsx', 'utf8');

// 1. Transform EmbossedAuth component
let transformed = esbuild.transformSync(src, {
  loader: 'jsx',
  jsx: 'automatic'
}).code;

transformed = transformed.replace(/import\s*\{[^}]*\}\s*from\s*["']react\/jsx-runtime["'];?/g, '');
transformed = transformed.replace(/import\s*React,\s*\{[^}]*\}\s*from\s*["']react["'];?/g, '');
transformed = transformed.replace(/export\s+default\s+function\s+EmbossedAuth/, 'var EmbossedAuth = function');
transformed = transformed.replace(/\bjsx\(/g, '(0,$.jsx)(');
transformed = transformed.replace(/\bjsxs\(/g, '(0,$.jsxs)(');
transformed = transformed.replace(/\bFragment\b/g, '$.Fragment');
transformed = transformed.replace(/\buseState\b/g, '_.useState');
transformed = transformed.replace(/\buseEffect\b/g, '_.useEffect');

// 2. Replace old phone number throughout bundle
bundle = bundle.split('+8809696917004').join('+8801965097004');
bundle = bundle.split('8809696917004').join('8801965097004');

// 3. In TC, add Contact: +8801965097004 button next to email
const emailTarget = 'title:`Email: redueanahamedrahat@gmail.com`,"aria-label":`Email`,children:[(0,$.jsx)(`span`,{className:`w-5 h-5 rounded-md bg-[var(--line)] text-[var(--fg)] flex items-center justify-center shrink-0 shadow-xs border border-[var(--line)]`,children:(0,$.jsx)(JS,{name:`mail`,size:13})}),(0,$.jsx)(`span`,{children:`Email`})]})]';
const phoneButton = ',(0,$.jsxs)(`a`,{href:`tel:+8801965097004`,className:`px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-2 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer group`,title:`Contact: +8801965097004`,"aria-label":`Contact Phone`,children:[(0,$.jsx)(`span`,{className:`w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs`,children:(0,$.jsx)(JS,{name:`phone`,size:13})}),(0,$.jsx)(`span`,{children:`Contact: +8801965097004`})]})]';

if (bundle.includes(emailTarget)) {
  bundle = bundle.replace(emailTarget, emailTarget.slice(0, -1) + phoneButton);
  console.log('Added Contact button to TC!');
} else {
  console.log('emailTarget not found, checking alternatives...');
}

// 4. In TC useEffect schema, add telephone
const schemaTarget = 'worksFor:{"@type":`Organization`,name:`KhaonKhata`}';
const schemaReplacement = 'worksFor:{"@type":`Organization`,name:`KhaonKhata`},telephone:`+8801965097004`';
if (bundle.includes(schemaTarget)) {
  bundle = bundle.replace(schemaTarget, schemaReplacement);
  console.log('Added telephone to TC Schema!');
}

// 5. Replace auth render in mI
const mIStart = bundle.indexOf('mI=({onBackToHome:');
const oldAuthRenderStart = bundle.indexOf(',(0,$.jsxs)(`div`,{className:`auth-page selection:bg-emerald-500 selection:text-white`', mIStart);
const hIStart = bundle.indexOf(',hI=({onBack:e,onNavigate:t})=>', oldAuthRenderStart);

if (mIStart === -1 || oldAuthRenderStart === -1 || hIStart === -1) {
  throw new Error(`Target strings missing: mIStart=${mIStart}, oldAuthRenderStart=${oldAuthRenderStart}, hIStart=${hIStart}`);
}

const newRender = ',(0,$.jsx)(EmbossedAuth,{onGoogleSignIn:me,onBackToHome:e,showToast:r,onNavigate:i,onUserAuthenticated:a})}';

let newBundle = bundle.substring(0, mIStart) + transformed + '\n' + bundle.substring(mIStart, oldAuthRenderStart) + newRender + bundle.substring(hIStart);

// Write to all bundle locations
const filesToUpdate = [
  'assets/index-v2.js',
  'assets/index-DLwRlnGx.js',
  'public/assets/index-v2.js',
  'public/assets/index-DLwRlnGx.js',
  'dist/assets/index-v2.js',
  'dist/assets/index-DLwRlnGx.js'
];

for (const f of filesToUpdate) {
  if (fs.existsSync(f)) {
    fs.writeFileSync(f, newBundle);
    console.log(`Updated ${f} (${newBundle.length} bytes)`);
  }
}
