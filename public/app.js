/**
 * StreamNinja - IPTV Playlist Analyzer & Stream Tester
 * Client-side JavaScript with PDF & M3U/CSV generation
 */

// ============================================
// DOM Elements
// ============================================
const urlInput = document.getElementById('playlistUrl');
const clearBtn = document.getElementById('clearBtn');
const actionBtn = document.getElementById('actionBtn');
const actionBtnText = document.getElementById('actionBtnText');
const loadingText = document.getElementById('loadingText');
const httpWarning = document.getElementById('httpWarning');
const statusContainer = document.getElementById('statusContainer');
const statusCard = document.getElementById('statusCard');
const analysisProgress = document.getElementById('analysisProgress');
const analysisProgressBar = document.getElementById('analysisProgressBar');
const progressCount = document.getElementById('progressCount');
const analysisResults = document.getElementById('analysisResults');
const convertResults = document.getElementById('convertResults');
const modeBtns = document.querySelectorAll('.mode-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const channelSearch = document.getElementById('channelSearch');

// ✅ NEW: Channel Limit Dropdown
const channelLimitSelect = document.getElementById('channelLimit');

// ============================================
// State Management
// ============================================
let currentMode = 'analyze';
let currentAnalysis = null;
let currentPlaylistContent = null;
let currentPlaylistUrl = null;
let displayedChannels = 20;
let jsPDFLoaded = false;

// ============================================
// Constants
// ============================================
const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// ============================================
// Initialize
// ============================================
function init() {
  setupEventListeners();
  switchMode('analyze');
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
  urlInput.addEventListener('input', debounce(handleInputChange, 150));
  urlInput.addEventListener('keypress', handleKeyPress);
  urlInput.addEventListener('paste', handlePaste);
  clearBtn.addEventListener('click', clearInput);
  actionBtn.addEventListener('click', handleAction);
  
  modeBtns.forEach(btn => btn.addEventListener('click', () => switchMode(btn.dataset.mode)));
  filterBtns.forEach(btn => btn.addEventListener('click', () => filterChannels(btn.dataset.filter)));
  
  document.getElementById('downloadReportBtn')?.addEventListener('click', downloadReport);
  document.getElementById('newAnalysisBtn')?.addEventListener('click', resetForNew);
  document.getElementById('downloadPdfBtn')?.addEventListener('click', downloadPdf);
  document.getElementById('convertAnotherBtn')?.addEventListener('click', resetForNew);
  document.getElementById('showMoreBtn')?.addEventListener('click', showMoreChannels);
  document.getElementById('checkAnotherBtn')?.addEventListener('click', resetForNew);
  
  // ✅ NEW: Export Buttons
  document.getElementById('exportLiveM3UBtn')?.addEventListener('click', () => exportM3U('live'));
  document.getElementById('exportDeadM3UBtn')?.addEventListener('click', () => exportM3U('dead'));
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportCSV);
    // ✅ NEW: Search bar listener
  channelSearch?.addEventListener('input', debounce(() => {
    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    if (currentAnalysis) renderChannels(currentAnalysis.channels, activeFilter);
  }, 200));
}

// ============================================
// Utilities
// ============================================
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.length > MAX_URL_LENGTH) return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch { return false; }
}

function sanitizeUrl(url) {
  return url ? String(url).trim().replace(/[\u0000-\u001f\u007f<>"']/g, '') : '';
}

function normalizeRequestUrl(url) {
  return url ? String(url).trim().replace(/[\u0000-\u001f\u007f]/g, '') : '';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text).substring(0, 1000);
  return div.innerHTML;
}

// ============================================
// jsPDF Lazy Loading
// ============================================
async function loadJsPDF() {
  if (jsPDFLoaded) return true;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => { jsPDFLoaded = true; resolve(true); };
    script.onerror = () => reject(new Error('Failed to load PDF library'));
    document.head.appendChild(script);
  });
}

// ============================================
// PDF Generation (Unchanged from your code)
// ============================================
async function generatePlaylistPDF(content, sourceUrl) {
  await loadJsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;
  
  doc.setFillColor(26, 26, 46); doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('IPTV Playlist', margin, 15);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(136, 136, 136);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 22);
  doc.text(`Source: ${sanitizeUrl(sourceUrl).substring(0, 60)}...`, margin, 26);
  y = 40;
  
  const lines = content.split('\n');
  doc.setFontSize(7);
  for (const line of lines) {
    if (y > pageHeight - margin) { doc.addPage(); y = margin; }
    const trimmedLine = line.replace(/\r/g, '').substring(0, 200);
    if (trimmedLine.startsWith('#EXTM3U') || trimmedLine.startsWith('#EXT')) doc.setTextColor(99, 102, 241);
    else if (trimmedLine.startsWith('http')) doc.setTextColor(16, 185, 129);
    else doc.setTextColor(51, 51, 51);
    if (trimmedLine.length > 0) { doc.setFont('courier', 'normal'); doc.text(trimmedLine, margin, y); y += 4; } else { y += 2; }
  }
  return doc;
}

async function generateAnalysisReportPDF(analysis) {
  await loadJsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;
  
  doc.setFillColor(26, 26, 46); doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('Playlist Analysis Report', margin, 15);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(167, 139, 250);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 24);
  doc.setTextColor(136, 136, 136);
  doc.text(`Source: ${sanitizeUrl(analysis.url || '').substring(0, 70)}`, margin, 30);
  y = 45;
  
  doc.setTextColor(139, 92, 246); doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('Summary', margin, y); y += 10;
  const summary = analysis.summary;
  const summaryItems = [
    ['Total Channels:', summary.totalChannels], ['Checked Channels:', summary.checkedChannels],
    ['Live Channels:', `${summary.liveChannels} (${summary.livePercentage}%)`],
    ['Dead Channels:', summary.deadChannels], ['Avg Response Time:', `${summary.avgResponseTime}ms`],
    ['Categories/Groups:', summary.groupCount]
  ];
  doc.setFontSize(10);
  summaryItems.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 51, 51); doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(102, 102, 102); doc.text(String(value), margin + 45, y); y += 6;
  });
  
  if (analysis.channels && analysis.channels.length > 0) {
    doc.addPage(); y = margin;
    doc.setTextColor(139, 92, 246); doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('Channel Details', margin, y); y += 10;
    doc.setFontSize(8);
    analysis.channels.slice(0, 100).forEach((channel, index) => {
      if (y > pageHeight - 25) { doc.addPage(); y = margin; }
      const statusColor = channel.status === 'live' ? [16, 185, 129] : channel.status === 'dead' ? [239, 68, 68] : [136, 136, 136];
      doc.setFillColor(...statusColor); doc.circle(margin + 2, y - 1, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 51, 51);
      doc.text(`${index + 1}. ${escapeHtml(channel.name || 'Unknown').substring(0, 50)}`, margin + 6, y); y += 4;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(102, 102, 102); doc.setFontSize(7);
      doc.text(`Group: ${escapeHtml(channel.group || 'N/A')} | Status: ${channel.status.toUpperCase()}`, margin + 6, y); y += 6; doc.setFontSize(8);
    });
  }
  return doc;
}

// ============================================
// Mode Switching
// ============================================
function switchMode(mode) {
  currentMode = mode;
  modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
  updateModeUI();
  resetState();
}

function updateModeUI() {
  const actionBtnIcon = document.getElementById('actionBtnIcon');
  if (currentMode === 'analyze') {
    actionBtnText.textContent = 'Analyze Playlist'; loadingText.textContent = 'Analyzing...';
    urlInput.placeholder = 'Paste your playlist URL here (HTTP or HTTPS)...';
    if (channelLimitSelect) channelLimitSelect.classList.remove('hidden'); // Show limit dropdown
  } else if (currentMode === 'channel') {
    actionBtnText.textContent = 'Check Channel'; loadingText.textContent = 'Checking...';
    urlInput.placeholder = 'Paste channel/stream URL (e.g., .m3u8, .ts)...';
    if (channelLimitSelect) channelLimitSelect.classList.add('hidden'); // Hide limit dropdown
  } else {
    actionBtnText.textContent = 'Convert to PDF'; loadingText.textContent = 'Converting...';
    urlInput.placeholder = 'Paste your playlist URL here (HTTP or HTTPS)...';
    if (channelLimitSelect) channelLimitSelect.classList.add('hidden');
  }
}

// ============================================
// Input Handling
// ============================================
function handleInputChange() {
  const value = urlInput.value.trim();
  clearBtn.classList.toggle('hidden', !value);
  if (value.toLowerCase().startsWith('http://')) httpWarning.classList.remove('hidden');
  else httpWarning.classList.add('hidden');
}

function handleKeyPress(e) { if (e.key === 'Enter' && !actionBtn.disabled) handleAction(); }
function handlePaste(e) { setTimeout(() => { if (urlInput.value.length > MAX_URL_LENGTH) urlInput.value = urlInput.value.substring(0, MAX_URL_LENGTH); }, 0); }
function clearInput() { urlInput.value = ''; clearBtn.classList.add('hidden'); httpWarning.classList.add('hidden'); hideStatus(); }

// ============================================
// Main Action Handler
// ============================================
async function handleAction() {
  const url = urlInput.value.trim();
  if (!url) { showStatus('Missing URL', 'Please enter a URL', 'error'); return; }
  if (!isValidUrl(url)) { showStatus('Invalid URL', 'Please enter a valid URL starting with http:// or https://', 'error'); return; }
  if (currentMode === 'analyze') await analyzePlaylist(url);
  else if (currentMode === 'channel') await checkChannel(url);
  else await convertPlaylist(url);
}

// ============================================
// Check Single Channel
// ============================================
async function checkChannel(url) {
  resetState(); setLoading(true);
  if (url.toLowerCase().startsWith('http://')) httpWarning.classList.remove('hidden');
  try {
    showStatus('Checking channel...', 'Testing stream accessibility', 'info');
    const response = await fetch('/api/check-channel', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ url: normalizeRequestUrl(url) })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Check failed');
    hideStatus(); displayChannelResults(data, url);
  } catch (error) { showStatus('Error', error.message || 'Channel check failed', 'error'); }
  finally { setLoading(false); }
}

function displayChannelResults(result, url) {
  const channelResults = document.getElementById('channelResults');
  const statusIcon = document.getElementById('channelStatusIcon');
  const statusText = document.getElementById('channelStatusText');
  const channelUrl = document.getElementById('channelUrl');
  const isLive = result.status === 'live';
  
  statusIcon.className = `channel-status-large ${isLive ? 'live' : 'dead'}`;
  statusIcon.innerHTML = isLive ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  statusText.textContent = isLive ? 'Stream is LIVE' : 'Stream is DEAD';
  statusText.className = isLive ? 'live' : 'dead';
  channelUrl.textContent = url.length > 80 ? url.substring(0, 80) + '...' : url;

  document.getElementById('detailStatus').textContent = result.status.toUpperCase();
  document.getElementById('detailStatus').className = `detail-value ${isLive ? 'live' : 'dead'}`;
  document.getElementById('detailHttpCode').textContent = result.httpStatus || '-';
  document.getElementById('detailResponseTime').textContent = `${result.responseTime}ms`;
  document.getElementById('detailResponseTime').className = `detail-value ${getResponseClass(result.responseTime)}`;
  document.getElementById('detailContentType').textContent = result.contentType ? result.contentType.split(';')[0] : '-';
  document.getElementById('detailUrlValid').textContent = result.urlValid ? '✓ Valid' : '✗ Invalid';
  document.getElementById('detailProtocol').textContent = result.protocol || '-';
  document.getElementById('detailStreamType').textContent = result.streamType || '-';
  document.getElementById('detailServer').textContent = result.server || '-';

  channelResults.classList.remove('hidden');
  channelResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// Analyze Playlist (SSE)
// ============================================
async function analyzePlaylist(url) {
  resetState(); setLoading(true);
    const analysisStartTime = Date.now(); // ✅ Track start time for ETA
  if (url.toLowerCase().startsWith('http://')) httpWarning.classList.remove('hidden');
  
  try {
    showStatus('Connecting...', 'Establishing live stream', 'info');
    analysisProgress.classList.remove('hidden');
    analysisProgressBar.style.width = '2%';
    progressCount.textContent = 'Connecting to server...';
    
    // ✅ CRITICAL FIX: Check DOM directly at click time so it NEVER misses the value
    const limitEl = document.getElementById('channelLimit');
    let limit = 1000;
    if (limitEl && limitEl.value) {
      limit = limitEl.value === 'all' ? 10000 : parseInt(limitEl.value, 10);
    }
    console.log("🎯 Requesting channel limit:", limit);
    
    const streamUrl = `/api/analyze-stream?url=${encodeURIComponent(normalizeRequestUrl(url))}&maxChannelsToCheck=${limit}`;
    const eventSource = new EventSource(streamUrl);
    
    eventSource.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      showStatus(data.message, data.detail, 'info');
      progressCount.textContent = data.detail || 'Preparing...'; // Instant feedback
    });

    eventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      if (data) {
        const percent = data.percentage || 0;
        analysisProgressBar.style.width = `${percent}%`;
        
        // ✅ NEW: Calculate ETA (time remaining)
        let etaText = '';
        if (percent > 2 && data.checked > 0) {
          const elapsedMs = Date.now() - analysisStartTime;
          const msPerChannel = elapsedMs / data.checked;
          const remainingMs = msPerChannel * (data.total - data.checked);
          
          if (remainingMs < 60000) {
            etaText = ` • ~${Math.round(remainingMs / 1000)}s left`;
          } else {
            etaText = ` • ~${Math.round(remainingMs / 60000)}m left`;
          }
        }
        
        progressCount.textContent = `${data.checked || 0} / ${data.total || 0} (${data.live || 0} Live, ${data.dead || 0} Dead)${etaText}`;
      }
    });

    eventSource.addEventListener('complete', (e) => {
      eventSource.close();
      const data = JSON.parse(e.data);
      analysisProgressBar.style.width = '100%';
      currentAnalysis = data; currentPlaylistUrl = url;
      analysisProgress.classList.add('hidden'); hideStatus();
      displayAnalysisResults(data); setLoading(false);
    });

    eventSource.addEventListener('error', (e) => {
      eventSource.close(); setLoading(false); analysisProgress.classList.add('hidden');
      if (e.data) {
        try { const errorData = JSON.parse(e.data); showStatus('Error', errorData.error || 'Server error', 'error'); }
        catch { showStatus('Error', 'Connection to server lost', 'error'); }
      } else {
        showStatus('Error', 'Stream disconnected. The playlist might be too large or the server timed out.', 'error');
      }
    });
  } catch (error) {
    showStatus('Error', error.message || 'Analysis setup failed', 'error');
    analysisProgress.classList.add('hidden'); setLoading(false);
  }
}

// ============================================
// Convert to PDF
// ============================================
async function convertPlaylist(url) {
  resetState(); setLoading(true);
  if (url.toLowerCase().startsWith('http://')) httpWarning.classList.remove('hidden');
  try {
    showStatus('Fetching playlist...', 'Downloading content', 'info');
    const response = await fetch('/api/fetch-playlist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalizeRequestUrl(url) })
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({ error: 'Fetch failed' })); throw new Error(errorData.error || 'Failed to fetch playlist'); }
    const data = await response.json();
    currentPlaylistContent = data.content; currentPlaylistUrl = url;
    showStatus('Generating PDF...', 'Creating document in your browser', 'info');
    const doc = await generatePlaylistPDF(data.content, url);
    hideStatus(); convertResults.classList.remove('hidden');
  } catch (error) { showStatus('Error', error.message || 'Conversion failed', 'error'); }
  finally { setLoading(false); }
}

// ============================================
// Display Analysis Results
// ============================================
function displayAnalysisResults(analysis) {
  analysisResults.classList.remove('hidden');
  const summary = analysis.summary;
  document.getElementById('totalChannels').textContent = summary.totalChannels;
    document.getElementById('checkedInfo').textContent = `${summary.checkedChannels} checked, ${summary.uncheckedChannels} unchecked`;
  document.getElementById('liveChannels').textContent = summary.liveChannels;
  document.getElementById('deadChannels').textContent = summary.deadChannels;
  document.getElementById('groupCount').textContent = summary.groupCount;
  document.getElementById('livePercentage').textContent = `${summary.livePercentage}%`;
  
  const livePercent = summary.checkedChannels > 0 ? (summary.liveChannels / summary.checkedChannels) * 100 : 0;
  const deadPercent = summary.checkedChannels > 0 ? (summary.deadChannels / summary.checkedChannels) * 100 : 0;
  document.getElementById('liveBar').style.width = `${livePercent}%`;
  document.getElementById('deadBar').style.width = `${deadPercent}%`;
  
  const categoriesGrid = document.getElementById('categoriesGrid');
  categoriesGrid.innerHTML = analysis.groups.slice(0, 12).map(group => `
    <span class="category-tag">${escapeHtml(group.name)} <span class="count">${group.count}</span></span>
  `).join('');
  if (analysis.groups.length > 12) categoriesGrid.innerHTML += `<span class="category-tag">+${analysis.groups.length - 12} more</span>`;
  
  displayedChannels = 20;
  renderChannels(analysis.channels, 'all');
  analysisResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// Channel List Rendering
// ============================================
function renderChannels(channels, filter) {
  const channelsList = document.getElementById('channelsList');
  const showMoreContainer = document.getElementById('showMoreContainer');
  let filtered = channels;
  if (filter === 'live') filtered = channels.filter(c => c.status === 'live');
  else if (filter === 'dead') filtered = channels.filter(c => c.status === 'dead' || c.status === 'timeout');
  else if (filter === 'unchecked') filtered = channels.filter(c => c.status === 'unchecked' || c.status === 'unknown');
    // ✅ NEW: Apply search filter on top of status filter
  const searchTerm = channelSearch ? channelSearch.value.toLowerCase().trim() : '';
  if (searchTerm) {
    filtered = filtered.filter(c => 
      (c.name && c.name.toLowerCase().includes(searchTerm)) || 
      (c.group && c.group.toLowerCase().includes(searchTerm))
    );
  }
  
  document.getElementById('channelListCount').textContent = `(${filtered.length})`;
  const toShow = filtered.slice(0, displayedChannels);
  
  channelsList.innerHTML = toShow.map((channel) => {
    const responseClass = getResponseClass(channel.responseTime);
    let statusClass = 'bg-gray-500'; // Unchecked/Unknown
let statusTitle = 'Unchecked';
if (channel.status === 'live') { statusClass = 'bg-emerald-400'; statusTitle = 'Live'; }
else if (channel.status === 'restricted') { statusClass = 'bg-yellow-500'; statusTitle = 'Restricted / Geo-Blocked'; }
else if (channel.status === 'timeout') { statusClass = 'bg-orange-500'; statusTitle = 'Timeout (Slow Server)'; }
else if (channel.status === 'dead') { statusClass = 'bg-red-500'; statusTitle = 'Dead / Offline'; }
    return `
      <div class="channel-item flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3 bg-slate-800/40 border border-slate-700/50 rounded-lg" data-status="${escapeHtml(channel.status)}">
        <div class="flex items-center gap-3 w-full flex-1 min-w-0">
          <div class="channel-status flex-shrink-0 w-3 h-3 rounded-full ${statusClass}" title="${statusTitle}"></div>
          <div class="channel-info flex-1 min-w-0 pr-2">
            <div class="channel-name font-bold text-white truncate" title="${escapeHtml(channel.name || 'Unknown')}">${escapeHtml(channel.name || 'Unknown')}</div>
            <div class="channel-meta text-xs text-gray-400 truncate mt-0.5">${escapeHtml(channel.group || 'Uncategorized')}</div>
          </div>
        </div>
        ${channel.responseTime ? `<div class="channel-response flex-shrink-0 text-sm font-medium px-2 py-1 rounded bg-slate-900/50 self-end sm:self-auto ${responseClass}">${channel.responseTime}ms</div>` : ''}
        <button onclick="copyUrl('${channel.url.replace(/'/g, "\\'")}')" title="Copy Stream URL" class="copy-btn flex-shrink-0 text-gray-500 hover:text-white transition-colors p-1">
  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
</button>
      </div>
    `;
  }).join('');
  
  if (filtered.length > displayedChannels) showMoreContainer.classList.remove('hidden');
  else showMoreContainer.classList.add('hidden');
}

function filterChannels(filter) {
  filterBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
  if (currentAnalysis) { displayedChannels = 20; renderChannels(currentAnalysis.channels, filter); }
}

function showMoreChannels() {
  displayedChannels += 20;
  const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  if (currentAnalysis) renderChannels(currentAnalysis.channels, activeFilter);
}

function getResponseClass(ms) {
  if (!ms) return ''; if (ms < 500) return 'fast'; if (ms < 2000) return 'medium'; return 'slow';
}

// ============================================
// ✅ NEW: Export M3U Functions
// ============================================
function exportM3U(type) {
  if (!currentAnalysis || !currentAnalysis.channels) return;
  let channels;
  if (type === 'live') channels = currentAnalysis.channels.filter(c => c.status === 'live');
  else if (type === 'dead') channels = currentAnalysis.channels.filter(c => c.status === 'dead' || c.status === 'timeout');
  else channels = currentAnalysis.channels;
  
  if (channels.length === 0) { showStatus('No Channels', `No ${type} channels to export`, 'error'); return; }
  
  let m3uContent = '#EXTM3U\n';
  channels.forEach(ch => {
    m3uContent += `#EXTINF:-1 tvg-id="${ch.tvgId || ''}" tvg-logo="${ch.tvgLogo || ''}" group-title="${ch.group || ''}",${ch.name}\n`;
    m3uContent += `${ch.url}\n`;
  });
  
  downloadFile(m3uContent, `streamninja_${type}_channels.m3u`, 'application/x-mpegURL');
  showStatus('Success', `Exported ${channels.length} ${type} channels!`, 'success');
  setTimeout(hideStatus, 3000);
}

// ============================================
// ✅ NEW: Export CSV Function
// ============================================
function exportCSV() {
  if (!currentAnalysis || !currentAnalysis.channels) return;
  const channels = currentAnalysis.channels;
  if (channels.length === 0) { showStatus('No Channels', 'No channels to export', 'error'); return; }
  
  let csvContent = 'Name,Group,URL,Status,Response Time (ms)\n';
  channels.forEach(ch => {
    const name = `"${(ch.name || '').replace(/"/g, '""')}"`;
    const group = `"${(ch.group || '').replace(/"/g, '""')}"`;
    const url = `"${ch.url || ''}"`;
    csvContent += `${name},${group},${url},${ch.status || 'unknown'},${ch.responseTime || ''}\n`;
  });
  
  downloadFile(csvContent, `streamninja_analysis.csv`, 'text/csv');
  showStatus('Success', `Exported ${channels.length} channels to CSV!`, 'success');
  setTimeout(hideStatus, 3000);
}

// ============================================
// ✅ NEW: Generic File Downloader
// ============================================
function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// ============================================
// Download PDFs
// ============================================
async function downloadReport() {
  if (!currentAnalysis) return;
  try {
    showStatus('Generating PDF...', 'Creating report in your browser', 'info');
    const doc = await generateAnalysisReportPDF(currentAnalysis);
    doc.save(`analysis_report_${Date.now()}.pdf`);
    hideStatus(); showStatus('Success', 'Report downloaded successfully', 'success'); setTimeout(hideStatus, 3000);
  } catch (error) { showStatus('Error', 'Failed to generate report: ' + error.message, 'error'); }
}

async function downloadPdf() {
  if (!currentPlaylistContent) return;
  try {
    showStatus('Generating PDF...', 'Creating document', 'info');
    const doc = await generatePlaylistPDF(currentPlaylistContent, currentPlaylistUrl);
    doc.save(`playlist_${Date.now()}.pdf`);
    hideStatus(); showStatus('Success', 'PDF downloaded successfully', 'success'); setTimeout(hideStatus, 3000);
  } catch (error) { showStatus('Error', 'Failed to generate PDF: ' + error.message, 'error'); }
}

// ============================================
// Status & Loading UI
// ============================================
function showStatus(title, message, type = 'info') {
  statusContainer.classList.remove('hidden');
  statusCard.className = 'status-card ' + type;
  const statusIcon = statusCard.querySelector('.status-icon');
  const statusTitle = statusCard.querySelector('.status-title');
  const statusMessage = statusCard.querySelector('.status-message');
  let iconSvg = '';
  if (type === 'error') iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  else if (type === 'success') iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  else iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  statusIcon.innerHTML = iconSvg;
  statusTitle.textContent = title;
  statusMessage.textContent = message;
}

function hideStatus() { statusContainer.classList.add('hidden'); }

function setLoading(loading) {
  if (loading) { actionBtn.classList.add('loading'); actionBtn.disabled = true; urlInput.disabled = true; }
  else { actionBtn.classList.remove('loading'); actionBtn.disabled = false; urlInput.disabled = false; }
}

function resetState() {
  hideStatus(); analysisProgress.classList.add('hidden'); analysisResults.classList.add('hidden');
  convertResults.classList.add('hidden'); document.getElementById('channelResults')?.classList.add('hidden');
  analysisProgressBar.style.width = '0%'; currentAnalysis = null; currentPlaylistContent = null; displayedChannels = 20;
}

function resetForNew() {
  urlInput.value = ''; clearBtn.classList.add('hidden'); httpWarning.classList.add('hidden');
  resetState(); urlInput.focus(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', init);
// ✅ NEW: Copy to Clipboard
function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    // Optional: Show a brief "Copied!" toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce';
    toast.textContent = 'URL Copied!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
  }).catch(err => console.error('Failed to copy:', err));
}