const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public');
const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

const headerMatch = indexHtml.match(/<header.*?<\/header>/s);
const footerHtml = `    <!-- Footer -->
    <footer class="mt-20 pt-8 border-t border-slate-700/50 text-center text-gray-400">
      <p class="mb-2">© 2025 Stream Ninja. Free forever. No data stored.</p>
      <div class="footer-links">
        <span>Made with ❤️ for the IPTV community</span>
      </div>
    </footer>

    <!-- Footer Disclaimer -->
    <footer class="mt-6 text-center text-sm text-gray-500">
        <p class="max-w-3xl mx-auto">StreamNinja is a technical analysis tool for testing stream connectivity and M3U syntax. We do not host, provide, or sell any media content. We do not condone piracy. This tool is strictly for educational and diagnostic purposes.</p>
    </footer>

    <!-- Footer Navigation -->
    <footer class="mt-6 pb-8">
        <nav>
            <ul class="flex flex-wrap justify-center gap-4 text-sm">
                <li><a href="blog.html" class="text-gray-400 hover:text-primary transition-colors">Tech Blog</a></li>
                <li><a href="privacy-policy.html" class="text-gray-400 hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="terms-of-service.html" class="text-gray-400 hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="contact-us.html" class="text-gray-400 hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="about-us.html" class="text-gray-400 hover:text-primary transition-colors">About Us</a></li>
            </ul>
        </nav>
    </footer>`;

function wrapContent(title, description, innerHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - Free IPTV Analyzer | StreamNinja</title>
  <meta name="description" content="${description}">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="manifest" href="/manifest.json">
  
  <!-- Add Tailwind -->
  <link rel="stylesheet" href="tailwind-built.css?v=1">
  <link rel="stylesheet" href="tailwind-custom.css?v=10">
</head>
<body class="bg-gradient-to-br from-darker via-dark to-navy min-h-screen text-gray-100 relative overflow-x-hidden">
  <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    ${headerMatch[0]}
    
    <nav aria-label="Breadcrumb" class="mb-6">
      <ol class="flex items-center gap-2 text-sm text-gray-400">
        <li><a href="/" class="hover:text-primary transition-colors">Home</a></li>
        <li class="text-gray-600">/</li>
        <li class="text-white">${title}</li>
      </ol>
    </nav>
    
    <main class="max-w-4xl mx-auto space-y-6 sm:space-y-8 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-10 mb-12">
        <h1 class="text-3xl sm:text-4xl font-bold text-white mb-6">${title}</h1>
        <div class="prose prose-invert max-w-none text-gray-300">
            ${innerHtml}
        </div>
    </main>

${footerHtml}
  </div>

  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  </script>
</body>
</html>`;
}

// 1. About Us
const aboutUsHtml = `
    <p class="mb-4">StreamNinja is dedicated to building tools for network diagnostics and stream analysis. We believe in providing reliable and efficient solutions for testing stream connectivity and M3U syntax validation.</p>
    <p class="mb-8">Our platform is completely free, secure, and respects your privacy. We don't store any of your data or playlists. Everything is processed securely and temporarily.</p>
    
    <h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">What We Offer</h2>
    <div class="grid md:grid-cols-3 gap-6 mb-12">
        <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
            <h3 class="text-lg font-bold text-primary mb-2">🔍 Deep Analysis</h3>
            <p class="text-sm">Check channel status, parse metadata, extract categories, and get detailed insights.</p>
        </div>
        <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
            <h3 class="text-lg font-bold text-emerald-400 mb-2">⚡ Lightning Fast</h3>
            <p class="text-sm">Parallel channel checking with optimized batch processing ensures quick results.</p>
        </div>
        <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
            <h3 class="text-lg font-bold text-purple-400 mb-2">📄 PDF Reports</h3>
            <p class="text-sm">Export detailed analysis reports or raw playlists as formatted PDF documents.</p>
        </div>
    </div>
    
    <h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">Our Values</h2>
    <ul class="list-disc pl-6 space-y-2 mb-8">
        <li><strong class="text-white">Privacy First:</strong> No data stored.</li>
        <li><strong class="text-white">100% Free:</strong> Forever free.</li>
        <li><strong class="text-white">Ethical Use:</strong> Diagnostic only.</li>
    </ul>
`;
fs.writeFileSync(path.join(publicDir, 'about-us.html'), wrapContent('About Us', 'Learn more about the StreamNinja team and our mission.', aboutUsHtml));

// 2. Privacy Policy
const privacyHtml = `
    <p class="mb-4">At StreamNinja, we prioritize your privacy. This policy explains what information we collect, how we use it, and how we protect it.</p>
    
    <h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">1. Data Storage & Collection</h2>
    <p class="mb-4"><strong>We do not store your IPTV playlists, stream links, or passwords.</strong> Every analysis process is temporary and happens either directly in your device's browser or temporarily on our server for network-level validation. The data is destroyed immediately after your session ends.</p>

    <h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">2. Analytics</h2>
    <p class="mb-4">We use anonymous analytics to understand how our website is used. This does not track personally identifiable information or the URLs you test.</p>
    
    <h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">3. Cookies</h2>
    <p class="mb-4">We do not use tracking cookies. The only information potentially saved to your browser cache relates to the structure of the application itself to make it run faster (via Service Workers).</p>

    <h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">Contact</h2>
    <p class="mb-4">If you have any questions about this privacy statement, please contact us.</p>
`;
fs.writeFileSync(path.join(publicDir, 'privacy-policy.html'), wrapContent('Privacy Policy', 'StreamNinja Privacy Policy', privacyHtml));

// 3. Terms of Service
const termsHtml = `
    <p class="mb-4">Welcome to StreamNinja. By using our website, you agree to the following terms.</p>
    
    <h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">1. Valid usage</h2>
    <p class="mb-4">StreamNinja is a diagnostic tool meant for technical analysis. We do not provide, host, or link to any copyrighted media. Our tool is strictly for educational purposes and troubleshooting your personally owned M3U streaming files.</p>
    
    <h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">2. Limitation of Liability</h2>
    <p class="mb-4">We aim to provide accurate network analysis, but we provide no guarantees that the software will be error-free or that streams marked as "Live" will continuously stay live.</p>

    <h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">3. Acceptable Use</h2>
    <p class="mb-4">You agree not to use our tool to engage in DDoS attacks, automated scraping in a massive scale that would damage our servers, or to break DRM/copyright verification natively on external servers.</p>
`;
fs.writeFileSync(path.join(publicDir, 'terms-of-service.html'), wrapContent('Terms of Service', 'StreamNinja Terms of Service', termsHtml));

// 4. Contact Us
const contactHtml = `
    <p class="mb-6">Have questions, feedback, or a feature request? Let us know!</p>
    
    <div class="bg-slate-900/50 p-8 rounded-xl border border-slate-700 max-w-2xl mx-auto mt-4">
        <form class="space-y-6">
            <div>
                <label for="name" class="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input type="text" id="name" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Your Name">
            </div>
            <div>
                <label for="email" class="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <input type="email" id="email" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary" placeholder="you@example.com">
            </div>
            <div>
                <label for="message" class="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea id="message" rows="5" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary" placeholder="How can we help?"></textarea>
            </div>
            <button type="button" class="w-full bg-gradient-to-r from-primary to-secondary text-black font-bold flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                Send Message
            </button>
        </form>
    </div>
`;
fs.writeFileSync(path.join(publicDir, 'contact-us.html'), wrapContent('Contact Us', 'Contact the StreamNinja team.', contactHtml));

// 5. Blog
const blogHtml = `
    <p class="mb-8 text-xl text-gray-400">Discover articles and guides on how to test, maintain, and optimize your IPTV setups.</p>
    
    <div class="grid md:grid-cols-2 gap-8 mt-8">
        <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-700 hover:border-primary/50 transition-colors">
            <span class="text-xs text-primary font-bold tracking-wider uppercase">Guide</span>
            <h3 class="text-xl font-bold text-white mt-2 mb-3">How to Analyze an M3U Playlist</h3>
            <p class="text-sm text-gray-400 mb-4">Learn step-by-step how to check dead links in your custom M3U configuration and keep your channel list clean.</p>
            <a href="#" class="text-primary hover:text-white transition-colors text-sm font-semibold">Read more &rarr;</a>
        </div>
        
        <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-700 hover:border-primary/50 transition-colors">
            <span class="text-xs text-primary font-bold tracking-wider uppercase">Troubleshooting</span>
            <h3 class="text-xl font-bold text-white mt-2 mb-3">Understanding HTTP Codes in IPTV</h3>
            <p class="text-sm text-gray-400 mb-4">If you keep seeing 403 Forbidden or 503 errors while testing, read this deep dive into API restrictions and tokens.</p>
            <a href="#" class="text-primary hover:text-white transition-colors text-sm font-semibold">Read more &rarr;</a>
        </div>
        
        <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-700 hover:border-primary/50 transition-colors">
            <span class="text-xs text-primary font-bold tracking-wider uppercase">Tutorial</span>
            <h3 class="text-xl font-bold text-white mt-2 mb-3">Extracting Stream Links from M3U8</h3>
            <p class="text-sm text-gray-400 mb-4">How adaptive bitrate (HLS) streaming works and how to isolate the best video quality links from a master M3U8.</p>
            <a href="#" class="text-primary hover:text-white transition-colors text-sm font-semibold">Read more &rarr;</a>
        </div>
        
         <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-700 hover:border-primary/50 transition-colors">
            <span class="text-xs text-primary font-bold tracking-wider uppercase">Security</span>
            <h3 class="text-xl font-bold text-white mt-2 mb-3">Why You Should Hide Your IPTV Passwords</h3>
            <p class="text-sm text-gray-400 mb-4">We explain XTREAM codes, player APIs, and how you can prevent your subscription data from leaking online.</p>
            <a href="#" class="text-primary hover:text-white transition-colors text-sm font-semibold">Read more &rarr;</a>
        </div>
    </div>
`;
fs.writeFileSync(path.join(publicDir, 'blog.html'), wrapContent('Tech Blog', 'StreamNinja articles and guides.', blogHtml));

console.log("Successfully aligned UI for all sub-pages!");
