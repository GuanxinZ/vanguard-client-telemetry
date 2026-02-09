# Vanguard Client Telemetry System - Phase 1

A proof-of-concept telemetry system that captures user behavior, system events, and sentiment-adjacent signals from a mock financial services website.

---

## 🎯 Project Overview

This system demonstrates how synthetic client telemetry can be analyzed to infer user frustration during digital interactions. It combines:

- **Behavioral signals**: Clicks, scrolls, rage clicks, idle time
- **System events**: JavaScript errors, timeouts, promise rejections  
- **Sentiment-adjacent cues**: Help page visits, form abandonment, escalation clicks
- **Journey tracking**: Multi-step flow completion and abandonment

**Important**: This is a **prototype using synthetic data only**. No real user data, PII, or production systems are involved.

---

## 📁 Project Structure

```
vanguard-client-telemetry-1/
├── server.js                      # Node.js ingestion server (Phase 1 backend)
├── public/
│   ├── telemetry.js              # ⭐ Core SDK - behavioral capture & event emission
│   ├── index.html                # Landing page (marketing/entry point)
│   ├── login.html                # 2-step authentication flow
│   ├── create-account.html       # 4-step onboarding flow
│   ├── trade.html                # 3-step trading workflow (high-value funnel)
│   ├── holdings.html             # Portfolio dashboard (retry/timeout demo)
│   ├── help.html                 # Self-service support (sentiment signals)
│   ├── account-home-page.html    # Post-login dashboard
│   └── style.css                 # Tailwind CSS styling
├── logs/
│   └── telemetry_logs.ndjson     # Event storage (newline-delimited JSON)
├── docs/
│   ├── TELEMETRY_METRICS.md      # Complete event catalog
│   ├── FLOW_TELEMETRY_SCHEMA.md  # Universal journey tracking schema
│   ├── NAMING_MIGRATION.md       # camelCase schema migration guide
│   └── VanguardClientTelemetry_CI492_SDD.pdf  # Software Design Document
└── package.json                   # Node.js dependencies
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v14+ (includes npm)
- **Git** (optional, for cloning)

### Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Start the server
node server.js

# 3. Open browser
# Navigate to: http://localhost:3000
```

The server will:
- ✅ Serve HTML pages from `public/`
- ✅ Accept telemetry events at `POST /api/telemetry`
- ✅ Append events to `logs/telemetry_logs.ndjson`

### View Telemetry Data

```bash
# View raw events (requires jq)
cat logs/telemetry_logs.ndjson | jq '.'

# Count events by type
cat logs/telemetry_logs.ndjson | jq -r '.eventType' | sort | uniq -c

# Filter by session
cat logs/telemetry_logs.ndjson | jq 'select(.sessionId == "S1234567890-5678")'
```

---

## 📊 How It Works

### 1. Telemetry SDK (`public/telemetry.js`)

The core library that runs on every page. Automatically captures:

| Metric | Detection Method | SDD Reference |
|--------|-----------------|---------------|
| **Rage Clicks** | 3+ clicks on same element within 800ms | §6.1.1 |
| **Scroll Depth** | Milestones at 25%, 50%, 75%, 100% | §5.2 |
| **Idle Time** | 30 seconds without activity | §6.1.1 |
| **Form Abandonment** | Field interaction + page exit without submit | §6.1.1 |
| **Refocus** | Same element focused again within 5s | §6.1.1 |
| **System Errors** | JavaScript errors & unhandled promise rejections | §6.1.1 |

**Usage in HTML**:
```html
<script src="telemetry.js"></script>
<script>
  Telemetry.init('page_name');
  // That's it! Global capture is automatic.
  
  // Emit custom events:
  Telemetry.emit('button_click', { button: 'save' });
</script>
```

### 2. Server (`server.js`)

Minimal Express.js server that:
- Accepts JSON events via `POST /api/telemetry`
- Adds `serverReceivedAt` timestamp
- Appends to NDJSON file (one JSON object per line)

**Why NDJSON?**
- ✅ Stream-friendly (process line-by-line, no need to load entire file)
- ✅ Append-only (no file locking issues)
- ✅ Parseable by standard tools (jq, pandas, Spark)

### 3. HTML Pages (Business Logic)

Each page demonstrates different telemetry patterns:

| Page | Telemetry Focus | Key Events |
|------|----------------|------------|
| **index.html** | CTA tracking | `cta_click` (conversion funnel) |
| **login.html** | 2-step auth flow | `flow_start`, `flow_step`, `flow_complete` |
| **trade.html** | 3-step form | Multi-step progression, abandonment |
| **create-account.html** | 4-step onboarding | Field-based step tracking |
| **holdings.html** | Error simulation | `timeout`, `retry_attempt` (SLA monitoring) |
| **help.html** | Support signals | `escalation_click`, `faq_solved` (sentiment) |

---

## 🔄 Universal Flow Schema

All journeys use the same 4 events (no feature-specific event names):

```javascript
// 1. Start a journey
Telemetry.emit('flow_start', { flowName: 'trade' });

// 2. Progress through steps
Telemetry.emit('flow_step', {
  flowName: 'trade',
  stepName: 'review',
  stepIndex: 3,
  totalSteps: 3
});

// 3. Complete successfully
Telemetry.emit('flow_complete', { flowName: 'trade' });

// 4. OR abandon
Telemetry.emit('flow_abandon', {
  flowName: 'trade',
  reason: 'user_cancel',
  lastStep: 2
});
```

**Benefits**:
- 📊 Single SQL query works for ALL flows
- 📈 Easy cross-flow comparison (completion rates, drop-off points)
- 🔧 Less code to maintain

See `FLOW_TELEMETRY_SCHEMA.md` for details.

---

## 📐 Event Schema

Every event follows this structure (enforced by `telemetry.js`):

```json
{
  "serverReceivedAt": "2026-02-08T20:00:00.123Z",
  "sessionId": "S1707423015123-4567",
  "userId": "U-guest",
  "pageRoute": "trade",
  "eventType": "rage_click",
  "timestamp": "2026-02-08T20:00:00.120Z",
  "url": "http://localhost:3000/trade.html",
  "elementId": "confirmBtn",
  "metadata": {
    "element": "#confirmBtn",
    "clickCount": 5,
    "tag": "button",
    "text": "Confirm Order"
  }
}
```

**Key Fields**:
- `sessionId`: Unique per browser session (survives page navigation)
- `userId`: User identifier (U-guest or U{n} after registration)
- `pageRoute`: Page context (`trade`, `login`, `holdings`, etc.)
- `eventType`: Event name (`click`, `flow_start`, `rage_click`, etc.)
- `elementId`: **Top-level field** extracted from `metadata.id` (for ML features)
- `metadata`: Event-specific data (flexible key-value pairs)

**Naming Convention**: All keys use **camelCase** (not snake_case). See `NAMING_MIGRATION.md`.

---

## 🧪 Testing Scenarios

### Simulate Frustration Patterns

1. **Rage Click Detection**
   - Go to any page
   - Click same button 3+ times rapidly
   - Check logs for `rage_click` event

2. **Form Abandonment**
   - Go to `create-account.html`
   - Fill in 1-2 fields
   - Close the browser tab
   - Check logs for `form_abandonment`

3. **Timeout & Retry**
   - Go to `holdings.html`
   - Click "Download Statements" button multiple times
   - Observe `timeout` and `retry_attempt` events (15% timeout rate)

4. **Multi-Step Flow**
   - Go to `trade.html`
   - Progress through steps 1 → 2 → 3
   - Click "Cancel" on step 2
   - Check for: `flow_start`, `flow_step` (x2), `flow_abandon`

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| `TELEMETRY_METRICS.md` | Complete catalog of all events with metadata schemas |
| `FLOW_TELEMETRY_SCHEMA.md` | Universal journey tracking pattern with SQL examples |
| `NAMING_MIGRATION.md` | snake_case → camelCase migration guide |
| `VanguardClientTelemetry_CI492_SDD.pdf` | Software Design Document (full spec) |

---

## 🔧 For New Developers

### Adding a New Event

```javascript
// In your HTML page:
document.getElementById('myButton').addEventListener('click', () => {
  Telemetry.emit('my_custom_event', {
    category: 'user_action',
    value: 123
  });
});
```

Events automatically append to `logs/telemetry_logs.ndjson`.

### Adding a New Page

1. Create `public/my-page.html`
2. Include telemetry:
   ```html
   <script src="telemetry.js"></script>
   <script>
     Telemetry.init('my_page');
     // Page-specific events here
   </script>
   ```
3. Restart server: `node server.js`
4. Navigate to `http://localhost:3000/my-page.html`

### Common Patterns

**Simple Click Tracking**:
```javascript
element.addEventListener('click', () => {
  Telemetry.emit('button_click', { button: 'submit' });
});
```

**Error Handling**:
```javascript
try {
  riskyOperation();
} catch (err) {
  Telemetry.emit('custom_error', { message: err.message });
}
```

**Journey Tracking**:
```javascript
// See trade.html or login.html for full examples
Telemetry.emit('flow_start', { flowName: 'checkout' });
Telemetry.emit('flow_step', { flowName: 'checkout', stepName: 'payment', stepIndex: 2, totalSteps: 3 });
```

---

## 🐛 Troubleshooting

### Events Not Appearing in Logs

1. **Check browser console** for JavaScript errors
2. **Verify server is running**: `curl http://localhost:3000/api/telemetry`
3. **Check logs directory exists**: `ls -la logs/`
4. **Inspect Network tab** in DevTools for failed POST requests

### High Event Volume

The telemetry SDK intentionally captures many events. To reduce:
- Increase `CLICK_THROTTLE_MS` in `telemetry.js` (currently 300ms)
- Disable scroll tracking by removing `onScroll` listener
- Filter events in Phase 2 analysis

### Session Not Persisting

Session IDs are stored in `localStorage`. Clearing browser data resets the session.

---

## 📝 Phase 2 Analysis (Future Work)

The NDJSON logs are designed for downstream ML pipelines:

**Feature Engineering** (Python/Pandas):
```python
import pandas as pd

# Read NDJSON
events = pd.read_json('logs/telemetry_logs.ndjson', lines=True)

# Aggregate per session
features = events.groupby('sessionId').agg({
    'eventType': 'count',  # Total event count
    'click': lambda x: (x == 'click').sum(),  # Click count
    'rage_click': lambda x: (x == 'rage_click').sum(),  # Rage clicks
    # ... more features
})
```

**Flow Analysis** (SQL):
```sql
SELECT 
  metadata->>'flowName' as flow,
  COUNT(*) FILTER (WHERE eventType = 'flow_start') as started,
  COUNT(*) FILTER (WHERE eventType = 'flow_complete') as completed,
  ROUND(100.0 * completed / started, 2) as completion_rate
FROM telemetry_events
GROUP BY flow;
```

---

## 🤝 Contributing

This is a **proof-of-concept project** for academic/demonstration purposes. Not accepting external contributions.

---

## 📄 License

For educational use only. Mock data and synthetic interactions. No real financial services provided.

---

## 📞 Contact

For questions about this codebase, refer to the inline comments in:
- `public/telemetry.js` (SDK internals)
- `server.js` (ingestion logic)
- Any HTML file (page-specific telemetry patterns)

Each file contains comprehensive documentation for new developers.
