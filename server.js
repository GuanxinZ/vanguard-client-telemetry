// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Ensure logs directory exists for NDJSON telemetry storage
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('Created logs directory.');
}

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// 3. Telemetry Ingestion Endpoint
app.post('/api/telemetry', (req, res) => {
    const eventData = req.body;
    
    // Add a server-side timestamp
    const logEntry = {
        server_received_at: new Date().toISOString(),
        ...eventData
    };
    
    // Convert the data to a single line of text (NDJSON format)
    const logString = JSON.stringify(logEntry) + '\n';
    
    // Construct the path to the 'logs' folder
    const logPath = path.join(__dirname, 'logs', 'telemetry_logs.ndjson');

    // Append the data to the file
    fs.appendFile(logPath, logString, (err) => {
        if (err) {
            console.error('Error writing to file:', err);
            if (err.code === 'ENOENT') {
                 console.error('Hint: Make sure the "logs" folder exists in your root directory.');
            }
            return res.status(500).json({ status: 'error' });
        }
        console.log(`[Data Received] Type: ${eventData.event_type}`);
        res.json({ status: 'success' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});