const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('Created logs directory.');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/telemetry', (req, res) => {
  const eventData = req.body;
  
  const logEntry = {
    serverReceivedAt: new Date().toISOString(),
    ...eventData
  };
  
  const logString = JSON.stringify(logEntry) + '\n';
  const logPath = path.join(__dirname, 'logs', 'telemetry_logs.ndjson');

  fs.appendFile(logPath, logString, (err) => {
    if (err) {
      console.error('Error writing to file:', err);
      return res.status(500).json({ status: 'error' });
    }
    console.log(`[Telemetry] ${eventData.eventType} | ${eventData.pageRoute}`);
    res.json({ status: 'success' });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
