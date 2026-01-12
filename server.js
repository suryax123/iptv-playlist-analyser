/**
 * PlaylistPDF Server - Optimized & Secure
 * 
 * Features:
 * - Lightweight: No PDF generation (done client-side)
 * - Secure: OWASP best practices, rate limiting, input validation
 * - Fast: Gzip compression, optimized payloads
 * 
 * Security:
 * - IP-based rate limiting with 429 responses
 * - Schema-based input validation
 * - Strict URL sanitization
 * - No sensitive data exposure
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const axios = require('axios');
const validator = require('validator');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Security Configuration
// ============================================

// Input validation constants
const MAX_URL_LENGTH = 2048;
const MAX_CHANNELS_TO_CHECK = 100;
const MAX_PLAYLIST_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// ============================================
// Middleware: Security Headers (Helmet)
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ============================================
// Middleware: CORS (Restrictive)
// ============================================
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Accept'],
  maxAge: 86400
}));

// ============================================
// Middleware: Compression (Performance)
// ============================================
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// ============================================
// Middleware: Body Parsing with Limits
// ============================================
app.use(express.json({ 
  limit: '1mb',
  strict: true
}));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '1mb' 
}));

// ============================================
// Static Files with Caching for Performance
// ============================================
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Cache static assets aggressively
    if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Cache images
    if (filePath.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
    // Don't cache HTML
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// ============================================
// Middleware: Rate Limiting (OWASP)
// ============================================

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'Too many requests. Please try again later.',
    retryAfter: 60
  },
  statusCode: 429,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: 60
    });
  }
});

// Stricter limit for analysis (resource intensive)
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 analysis requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'Analysis rate limit exceeded. Please wait before trying again.',
    retryAfter: 60
  },
  statusCode: 429
});

app.use('/api', apiLimiter);

// ============================================
// Middleware: Request Logging (Development)
// ============================================
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// Input Validation Functions (Security)
// ============================================

/**
 * Validate and sanitize URL input
 * @param {string} url - URL to validate
 * @returns {object} - { valid: boolean, url: string, error: string }
 */
function validateUrl(url) {
  // Type check
  if (!url || typeof url !== 'string') {
    return { valid: false, url: null, error: 'URL is required' };
  }
  
  // Length check
  const trimmedUrl = url.trim();
  if (trimmedUrl.length === 0) {
    return { valid: false, url: null, error: 'URL is required' };
  }
  if (trimmedUrl.length > MAX_URL_LENGTH) {
    return { valid: false, url: null, error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters` };
  }
  
  // Format validation
  if (!validator.isURL(trimmedUrl, { 
    protocols: ['http', 'https'], 
    require_protocol: true,
    require_valid_protocol: true
  })) {
    return { valid: false, url: null, error: 'Invalid URL format. Must start with http:// or https://' };
  }
  
  // Protocol check
  try {
    const parsed = new URL(trimmedUrl);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return { valid: false, url: null, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    // Sanitize - remove any dangerous characters
    const sanitized = trimmedUrl.replace(/[<>"'`]/g, '');
    return { valid: true, url: sanitized, error: null };
  } catch {
    return { valid: false, url: null, error: 'Invalid URL' };
  }
}

/**
 * Validate analysis request body
 */
function validateAnalyzeRequest(body) {
  const errors = [];
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Invalid request body'] };
  }
  
  // URL validation
  const urlValidation = validateUrl(body.url);
  if (!urlValidation.valid) {
    errors.push(urlValidation.error);
  }
  
  // checkChannels validation
  if (body.checkChannels !== undefined && typeof body.checkChannels !== 'boolean') {
    errors.push('checkChannels must be a boolean');
  }
  
  // maxChannelsToCheck validation
  if (body.maxChannelsToCheck !== undefined) {
    const max = parseInt(body.maxChannelsToCheck, 10);
    if (isNaN(max) || max < 1 || max > MAX_CHANNELS_TO_CHECK) {
      errors.push(`maxChannelsToCheck must be between 1 and ${MAX_CHANNELS_TO_CHECK}`);
    }
  }
  
  // Reject unexpected fields (security)
  const allowedFields = ['url', 'checkChannels', 'maxChannelsToCheck'];
  const unexpectedFields = Object.keys(body).filter(k => !allowedFields.includes(k));
  if (unexpectedFields.length > 0) {
    errors.push(`Unexpected fields: ${unexpectedFields.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized: urlValidation.valid ? {
      url: urlValidation.url,
      checkChannels: body.checkChannels !== false,
      maxChannelsToCheck: Math.min(
        parseInt(body.maxChannelsToCheck, 10) || 50,
        MAX_CHANNELS_TO_CHECK
      )
    } : null
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if URL is HTTP (not HTTPS)
 */
function isHttpUrl(url) {
  try {
    return new URL(url).protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Try to upgrade HTTP to HTTPS
 */
async function tryHttpsUpgrade(url) {
  if (!isHttpUrl(url)) return { url, upgraded: false };
  
  const httpsUrl = url.replace('http://', 'https://');
  try {
    await axios.head(httpsUrl, { timeout: 3000, maxRedirects: 2 });
    return { url: httpsUrl, upgraded: true };
  } catch {
    return { url, upgraded: false };
  }
}

/**
 * Fetch playlist with security measures
 */
async function secureFetch(url, options = {}) {
  const config = {
    timeout: options.timeout || 30000,
    maxRedirects: 5,
    maxContentLength: MAX_PLAYLIST_SIZE,
    responseType: 'text',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'identity'
    },
    validateStatus: (status) => status >= 200 && status < 400
  };
  return axios.get(url, config);
}

/**
 * Parse M3U/M3U8 playlist content
 */
function parsePlaylist(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const channels = [];
  let currentChannel = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('#EXTINF:')) {
      const extinf = line.substring(8);
      const commaIndex = extinf.lastIndexOf(',');
      const name = commaIndex > -1 ? extinf.substring(commaIndex + 1).trim() : 'Unknown';
      
      const attrs = {};
      const attrRegex = /(\w+[-\w]*)="([^"]*)"/g;
      let match;
      while ((match = attrRegex.exec(extinf)) !== null) {
        attrs[match[1].toLowerCase()] = match[2];
      }
      
      currentChannel = {
        name: name.substring(0, 200), // Limit name length
        group: (attrs['group-title'] || 'Uncategorized').substring(0, 100),
        url: null,
        status: 'unknown',
        responseTime: null
      };
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      if (currentChannel) {
        currentChannel.url = line.substring(0, MAX_URL_LENGTH);
        channels.push(currentChannel);
        currentChannel = null;
      } else {
        channels.push({
          name: `Channel ${channels.length + 1}`,
          group: 'Uncategorized',
          url: line.substring(0, MAX_URL_LENGTH),
          status: 'unknown',
          responseTime: null
        });
      }
    }
  }
  
  return channels;
}

/**
 * Check single channel health
 */
async function checkChannelHealth(url, timeout = 8000) {
  const startTime = Date.now();
  try {
    const response = await axios.head(url, {
      timeout: timeout,
      maxRedirects: 3,
      validateStatus: () => true,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const responseTime = Date.now() - startTime;
    return {
      status: response.status >= 200 && response.status < 400 ? 'live' : 'dead',
      httpStatus: response.status,
      responseTime: responseTime,
      contentType: response.headers['content-type'] || null
    };
  } catch (error) {
    return {
      status: 'dead',
      httpStatus: error.response?.status || 0,
      responseTime: Date.now() - startTime,
      contentType: null,
      error: error.code || error.message
    };
  }
}

/**
 * Batch check channels
 */
async function batchCheckChannels(channels, maxConcurrent = 5, timeout = 8000) {
  const results = [];
  
  for (let i = 0; i < channels.length; i += maxConcurrent) {
    const batch = channels.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (channel) => {
        if (!channel.url) return { ...channel, status: 'invalid' };
        const health = await checkChannelHealth(channel.url, timeout);
        return { ...channel, ...health };
      })
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Validate playlist content
 */
function isValidPlaylistContent(content) {
  if (!content || typeof content !== 'string') return false;
  const contentLower = content.toLowerCase().trim();
  if (contentLower.startsWith('#extm3u')) return true;
  if (contentLower.includes('#extinf:')) return true;
  const lines = content.split('\n');
  return lines.some(line => /^https?:\/\//i.test(line.trim()));
}

// ============================================
// API Routes
// ============================================

/**
 * Health Check Endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

/**
 * Validate Playlist URL
 */
app.post('/api/validate', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const urlValidation = validateUrl(req.body?.url);
    if (!urlValidation.valid) {
      return res.status(400).json({ valid: false, error: urlValidation.error });
    }
    
    let url = urlValidation.url;
    let upgraded = false;
    
    if (isHttpUrl(url)) {
      const result = await tryHttpsUpgrade(url);
      url = result.url;
      upgraded = result.upgraded;
    }
    
    const response = await secureFetch(url, { timeout: 10000 });
    
    if (!isValidPlaylistContent(response.data)) {
      return res.status(400).json({ valid: false, error: 'URL does not contain valid playlist content' });
    }
    
    res.json({ 
      valid: true, 
      upgraded,
      isHttp: isHttpUrl(url)
    });
    
  } catch (error) {
    res.status(400).json({ valid: false, error: 'URL is not accessible' });
  }
});

/**
 * Fetch Raw Playlist Content (for client-side PDF)
 */
app.post('/api/fetch-playlist', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const urlValidation = validateUrl(req.body?.url);
    if (!urlValidation.valid) {
      return res.status(400).json({ error: urlValidation.error });
    }
    
    let url = urlValidation.url;
    
    if (isHttpUrl(url)) {
      const result = await tryHttpsUpgrade(url);
      url = result.url;
    }
    
    const response = await secureFetch(url);
    
    if (!isValidPlaylistContent(response.data)) {
      return res.status(400).json({ error: 'Invalid playlist content' });
    }
    
    res.json({ 
      content: response.data,
      size: response.data.length,
      url: url
    });
    
  } catch (error) {
    res.status(400).json({ error: 'Could not fetch playlist: ' + error.message });
  }
});

/**
 * Analyze Playlist (with stricter rate limit)
 */
app.post('/api/analyze', analysisLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // Validate request
    const validation = validateAnalyzeRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join('. ') });
    }
    
    let { url, checkChannels, maxChannelsToCheck } = validation.sanitized;
    
    // Try HTTPS upgrade
    if (isHttpUrl(url)) {
      const result = await tryHttpsUpgrade(url);
      url = result.url;
    }
    
    // Fetch playlist
    let response;
    try {
      response = await secureFetch(url);
    } catch (fetchErr) {
      return res.status(400).json({ error: 'Could not fetch playlist: ' + fetchErr.message });
    }
    
    const content = response.data;
    
    if (!isValidPlaylistContent(content)) {
      return res.status(400).json({ error: 'Invalid playlist content' });
    }
    
    // Parse playlist
    const channels = parsePlaylist(content);
    
    if (channels.length === 0) {
      return res.status(400).json({ error: 'No channels found in playlist' });
    }
    
    // Group statistics
    const groups = {};
    channels.forEach(ch => {
      const group = ch.group || 'Uncategorized';
      groups[group] = (groups[group] || 0) + 1;
    });
    
    // Check channel health
    let checkedChannels = channels;
    let liveCount = 0;
    let deadCount = 0;
    
    if (checkChannels && channels.length > 0) {
      const toCheck = channels.slice(0, maxChannelsToCheck);
      checkedChannels = await batchCheckChannels(toCheck, 5, 8000);
      
      if (channels.length > maxChannelsToCheck) {
        checkedChannels = [
          ...checkedChannels,
          ...channels.slice(maxChannelsToCheck).map(ch => ({ ...ch, status: 'unchecked' }))
        ];
      }
      
      liveCount = checkedChannels.filter(c => c.status === 'live').length;
      deadCount = checkedChannels.filter(c => c.status === 'dead').length;
    }
    
    // Calculate average response time
    const liveWithResponse = checkedChannels.filter(c => c.status === 'live' && c.responseTime);
    const avgResponseTime = liveWithResponse.length > 0 
      ? Math.round(liveWithResponse.reduce((sum, c) => sum + c.responseTime, 0) / liveWithResponse.length)
      : 0;
    
    // Build response (optimized payload)
    const analysis = {
      url,
      isHttp: isHttpUrl(url),
      timestamp: new Date().toISOString(),
      summary: {
        totalChannels: channels.length,
        checkedChannels: Math.min(maxChannelsToCheck, channels.length),
        liveChannels: liveCount,
        deadChannels: deadCount,
        uncheckedChannels: Math.max(0, channels.length - maxChannelsToCheck),
        livePercentage: channels.length > 0 
          ? Math.round((liveCount / Math.min(maxChannelsToCheck, channels.length)) * 100) 
          : 0,
        avgResponseTime,
        groupCount: Object.keys(groups).length
      },
      groups: Object.entries(groups)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50), // Limit groups in response
      channels: checkedChannels.slice(0, 200) // Limit channels in response
    };
    
    res.json(analysis);
    
  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

/**
 * Detect stream type from URL and content type
 */
function detectStreamType(url, contentType) {
  const urlLower = (url || '').toLowerCase();
  const ctLower = (contentType || '').toLowerCase();
  
  if (urlLower.includes('.m3u8') || ctLower.includes('mpegurl') || ctLower.includes('x-mpegurl')) {
    return 'HLS (m3u8)';
  }
  if (urlLower.includes('.mpd') || ctLower.includes('dash')) {
    return 'DASH';
  }
  if (urlLower.includes('.ts') || ctLower.includes('mp2t')) {
    return 'MPEG-TS';
  }
  if (urlLower.includes('.mp4') || ctLower.includes('mp4')) {
    return 'MP4';
  }
  if (urlLower.includes('.flv') || ctLower.includes('flv')) {
    return 'FLV';
  }
  if (urlLower.includes('.mkv') || ctLower.includes('matroska')) {
    return 'MKV';
  }
  if (ctLower.includes('video/')) {
    return 'Video Stream';
  }
  if (ctLower.includes('audio/')) {
    return 'Audio Stream';
  }
  return 'Unknown';
}

/**
 * Check Single Channel (for channel mode)
 */
app.post('/api/check-channel', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const urlValidation = validateUrl(req.body?.url);
    if (!urlValidation.valid) {
      return res.status(400).json({ error: urlValidation.error });
    }
    
    const url = urlValidation.url;
    
    // Parse URL for extra info
    let parsedUrl;
    let protocol = 'Unknown';
    let host = 'Unknown';
    try {
      parsedUrl = new URL(url);
      protocol = parsedUrl.protocol.replace(':', '').toUpperCase();
      host = parsedUrl.hostname;
    } catch {}
    
    const result = await checkChannelHealth(url, 15000);
    
    // Detect stream type
    const streamType = detectStreamType(url, result.contentType);
    
    res.json({
      url: url,
      status: result.status,
      httpStatus: result.httpStatus,
      responseTime: result.responseTime,
      contentType: result.contentType,
      urlValid: true,
      protocol: protocol,
      streamType: streamType,
      server: host,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Channel check error:', error.message);
    res.status(500).json({ error: 'Channel check failed' });
  }
});

// ============================================
// Error Handling
// ============================================

// API 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (req.path.startsWith('/api')) {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).send('Internal server error');
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// Server Startup
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
