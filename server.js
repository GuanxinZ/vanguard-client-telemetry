/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TELEMETRY INGESTION SERVER (Phase 1 Backend)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Acts as the server-side "write-only" API for telemetry data.
 * 
 * Architecture:
 *   - Receives JSON payloads from the client-side SDK (telemetry.js)
 *   - Appends events as NDJSON (newline-delimited JSON) for efficient streaming
 *   - Persists to logs/telemetry_logs.ndjson for downstream ML/analytics pipelines
 * 
 * Design Rationale:
 *   - NDJSON format enables line-by-line parsing without loading entire file into memory
 *   - No database dependency simplifies deployment and reduces latency (<5ms per write)
 *   - Serverless-ready architecture (can be ported to Lambda/Cloud Functions)
 * 
 * Data Flow:
 *   Client Event → POST /api/telemetry → Append to NDJSON → 200 Response
 * 
 * File Structure:
 *   logs/telemetry_logs.ndjson - One JSON object per line, no commas or brackets
 *   Example:
 *     {"serverReceivedAt":"2026-02-08T20:00:00.123Z","eventType":"click",...}
 *     {"serverReceivedAt":"2026-02-08T20:00:01.456Z","eventType":"scroll_depth",...}
 * 
 * For new developers:
 *   1. Start server: node server.js
 *   2. Open http://localhost:3000 in browser
 *   3. Interact with pages → events auto-append to logs/telemetry_logs.ndjson
 *   4. Read logs: cat logs/telemetry_logs.ndjson | jq '.' (requires jq tool)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION: Ensure logs directory exists
// ─────────────────────────────────────────────────────────────────────────────
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✓ Created logs directory.');
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE STACK
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors());                              // Allow cross-origin requests (dev only)
app.use(express.json());                      // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public')));  // Serve HTML/CSS/JS files

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRY INGESTION ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/telemetry
// 
// Request Body Schema (enforced by telemetry.js):
//   {
//     sessionId: string,
//     userId: string,
//     pageRoute: string,
//     eventType: string,
//     timestamp: ISO 8601 string,
//     url: string,
//     elementId?: string,  // Optional, extracted from metadata.id
//     metadata: object     // Event-specific data
//   }
// 
// Response: { status: 'success' } or { status: 'error' }
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/telemetry', (req, res) => {
  const eventData = req.body;
  
  // Add server-side timestamp (for clock skew detection and latency analysis)
  const logEntry = {
    serverReceivedAt: new Date().toISOString(),
    ...eventData
  };
  
  // Convert to NDJSON format (single line with \n terminator)
  const logString = JSON.stringify(logEntry) + '\n';
  const logPath = path.join(__dirname, 'logs', 'telemetry_logs.ndjson');

  // Append to file (async, non-blocking)
  fs.appendFile(logPath, logString, (err) => {
    if (err) {
      console.error('❌ Error writing to file:', err);
      return res.status(500).json({ status: 'error' });
    }
    
    // Console log for real-time monitoring during development
    console.log(`[Telemetry] ${eventData.eventType} | ${eventData.pageRoute}`);
    res.json({ status: 'success' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Telemetry endpoint: POST http://localhost:${PORT}/api/telemetry`);
  console.log(`✓ Log file: ${path.join(__dirname, 'logs', 'telemetry_logs.ndjson')}`);
});
