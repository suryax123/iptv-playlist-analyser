# IPTV Playlist to PDF Converter

A web application that converts M3U8/IPTV playlist links to downloadable PDF documents.

## Features

- ✅ Validate M3U8/IPTV playlist URLs
- ✅ Convert playlists to PDF with preserved formatting
- ✅ No login required
- ✅ Rate limiting for security
- ✅ Clean, modern UI

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Visit `http://localhost:3000` in your browser.

## Deployment on Render

1. Push this code to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Render will auto-detect settings from `render.yaml`
6. Click "Create Web Service"

## API Endpoints

### POST /api/validate
Validates a playlist URL.

**Request:**
```json
{ "url": "https://example.com/playlist.m3u8" }
```

**Response:**
```json
{ "valid": true, "message": "URL is valid and accessible" }
```

### POST /api/convert
Converts playlist to PDF and returns the file.

**Request:**
```json
{ "url": "https://example.com/playlist.m3u8" }
```

**Response:** PDF file download

## Tech Stack

- **Backend:** Node.js, Express
- **PDF Generation:** PDFKit
- **Security:** Helmet, express-rate-limit
- **Frontend:** Vanilla HTML/CSS/JS


