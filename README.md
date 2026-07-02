# 🥷 StreamNinja - IPTV Playlist Analyzer & Stream Tester

> The ultimate free, open-source M3U/M3U8 playlist analyzer. No signup, no data storage, no BS—just pure, blazing-fast stream validation.

🌐 **Live Site:** [streamninja.app](https://streamninja.app)




## ⚡ Features

### 🎯 Core Analysis
- **Real-time SSE Progress:** Watch channels check live in your browser with ETA timers—no more staring at a frozen loading bar.
- **Smart Health Checks:** We don't just ping URLs. We spoof VLC media players and check HTTP statuses to differentiate between **Live**, **Dead**, **Geo-Restricted**, and **Timeout** streams.
- **Rolling Window Concurrency:** Dynamically scales concurrency based on playlist size. Prevents server crashes while maximizing speed.
- **Auto-Limiting:** Large playlists (40,000+ channels) are automatically throttled to prevent browser/server timeouts.

### 📊 Results & Export
- **Dynamic Filtering:** Filter by Live, Dead, Restricted, or Unchecked channels.
- **Instant Search:** Find specific channels (e.g., "ESPN") instantly in massive playlists.
- **Export Live M3U:** Download a clean `.m3u` file containing only the working streams—ready for VLC.
- **Export Dead M3U:** Download a list of broken links for easy cleanup.
- **Export CSV:** Full data export for spreadsheet analysis.
- **PDF Reports:** Generate beautiful, client-side PDF analysis reports without stressing the server.

### 🛡️ Security & Performance
- **Zero Data Storage:** We process your playlist and immediately discard it. Your links are never saved or hijacked.
- **SSRF Protection:** Blocks internal/private IPs (127.0.0.1, AWS/Azure metadata endpoints) to prevent server-side request forgery.
- **Memory Guardian:** Strict memory limits (optimized for 1GB VMs). Rejects new requests if RAM is critically low.
- **NGINX Optimized:** Custom SSE proxy configuration ensures real-time data flow without buffering or 504 timeouts.
- **Rate Limiting:** API abuse prevention built-in.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, Axios
- **Frontend:** Vanilla JavaScript, Tailwind CSS, jsPDF
- **Process Manager:** PM2
- **Reverse Proxy:** NGINX (with SSE support)
- **Infrastructure:** Azure VM (1GB RAM / 2 vCPU)

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js >= 18.0.0
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/suryax123/iptv-playlist-analyser.git
cd iptv-playlist-analyser

# Install dependencies
npm install

# Start the server
node server.js

The app will be running at http://localhost:3000.

--------------------------------------------------------------

🏗️ Production Deployment
StreamNinja is optimized to run efficiently on low-cost VMs (like Azure B2ats v2 with 1GB RAM).

1. PM2 Setup (Process Manager)
Install PM2 globally:

Bash

npm install -g pm2
Start the application:

Bash

pm2 start server.js --name streamninja --max-memory-restart 400M
pm2 save
pm2 startup
2. NGINX Configuration (CRITICAL FOR SSE)
Standard NGINX configs will kill SSE streams after 60-300 seconds and buffer the progress bar. You must configure the /api/analyze-stream endpoint specifically:

nginx

# SSE Stream Endpoint - CRITICAL SETTINGS
location /api/analyze-stream {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    
    # Prevents NGINX from buffering SSE events
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    
    # Allow long analysis times (up to 1 hour)
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    chunked_transfer_encoding on;
}

# Connection limit to prevent DDoS (add to http block)
limit_conn_zone $binary_remote_addr zone=addr:10m;

# Add to server block
limit_conn addr 20; # Max 20 simultaneous connections per IP
3. Environment Variables
Create a .env file in the root directory:

env

NODE_ENV=production
PORT=3000
ALLOWED_ORIGIN=https://yourdomain.com


🧠 How It Works: The Architecture
Why not just use Promise.all?
Standard M3U checkers use Promise.all, which tries to check hundreds of channels simultaneously. This causes:

Local RAM Crashes: Node.js runs out of memory handling hundreds of simultaneous socket connections.
IP Bans: IPTV servers see a sudden burst of 500 requests and block your server's IP.
The Rolling Window Approach
StreamNinja uses a rolling window (via batchCheckChannels). We maintain a constant queue of ~10-15 active requests. As soon as one channel check finishes, we immediately start the next one. This keeps memory usage low, avoids IP bans, and provides smooth, continuous progress updates.

VLC Spoofing
Many IPTV servers reject standard HTTP HEAD requests or requests with standard browser User-Agents. StreamNinja spoofs the VLC/3.0.18 User-Agent and uses a 1-byte GET request. This tricks servers into responding as if we were a legitimate media player, resulting in significantly higher accuracy (80%+ live detection vs 4% with standard methods).

📡 API Documentation

Analyze Playlist (SSE Stream)
The primary analysis endpoint. Returns real-time progress events.
GET /api/analyze-stream?url=<M3U_URL>&maxChannelsToCheck=<LIMIT>
Events Emitted: status, progress, complete, error

Check Single Channel
Tests a single stream URL and returns its health status.
POST /api/check-channel
Body: { "url": "https://example.com/stream.m3u8" }

Fetch Raw Playlist
Fetches the M3U file content (used for PDF conversion).
POST /api/fetch-playlist
Body: { "url": "https://example.com/playlist.m3u" }

Health Check
Returns server status and memory usage.
GET /api/health

|----------------------------------------------------------|
🤝 Contributing
Contributions, issues, and feature requests are welcome!

Fork the Project
Create your Feature Branch (git checkout -b feature/AmazingFeature)
Commit your Changes (git commit -m 'Add some AmazingFeature')
Push to the Branch (git push origin feature/AmazingFeature)
Open a Pull Request


⚠️ Disclaimer
StreamNinja is a technical analysis tool for testing stream connectivity and M3U syntax. We do not host, provide, or sell any media content. We do not condone piracy. This tool is strictly for educational and diagnostic purposes.