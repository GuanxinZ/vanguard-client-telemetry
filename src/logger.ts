import { EventLog } from './types.js';
import { createWriteStream, WriteStream } from 'fs';

export class SessionLogger {
  private stream: WriteStream | null = null;
  private sessionId: string;

  constructor(sessionId: string, outputFile?: string) {
    this.sessionId = sessionId;
    if (outputFile) {
      this.stream = createWriteStream(outputFile, { flags: 'a' });
    }
  }

  log(event: Omit<EventLog, 'ts' | 'session_id'>): void {
    const logEntry: EventLog = {
      ts: new Date().toISOString(),
      session_id: this.sessionId,
      ...event
    };

    const line = JSON.stringify(logEntry) + '\n';
    
    if (this.stream) {
      this.stream.write(line);
    } else {
      console.log(line.trim());
    }
  }

  close(): void {
    if (this.stream) {
      this.stream.end();
    }
  }
}

