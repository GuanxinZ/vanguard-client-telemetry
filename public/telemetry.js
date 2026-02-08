/**
 * Shared telemetry for Vanguard Client Telemetry (Phase 1).
 * Sends events to the Node.js ingestion server via HTTP POST.
 */
const Telemetry = {
  page: null,
  baseContext: {},

  init(pageName, options = {}) {
    this.page = pageName;
    this.baseContext = options;

    if (!localStorage.getItem('session_id')) {
      localStorage.setItem('session_id', `S${Math.floor(Math.random() * 100000)}`);
    }
    if (!localStorage.getItem('user_id')) {
      localStorage.setItem('user_id', 'U-guest');
    }
  },

  _buildEvent(event_type, metadata = {}) {
    return {
      session_id: localStorage.getItem('session_id'),
      user_id: localStorage.getItem('user_id') || 'U-guest',
      page: this.page,
      event_type,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...this.baseContext,
      metadata,
    };
  },

  emit(event_type, metadata = {}) {
    const evt = this._buildEvent(event_type, metadata);
    console.log('Telemetry:', evt);

    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evt),
    }).catch(() => {});
  },

  /** Use for beforeunload; fetch may be cancelled on page unload. */
  sendBeacon(event_type, metadata = {}) {
    const evt = this._buildEvent(event_type, metadata);
    console.log('Telemetry:', evt);

    const blob = new Blob([JSON.stringify(evt)], { type: 'application/json' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/telemetry', blob);
    } else {
      this.emit(event_type, metadata);
    }
  },
};
