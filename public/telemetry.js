/**
 * Shared telemetry for Vanguard Client Telemetry (Phase 1).
 * Captures behavioral, system, and sentiment-adjacent events per SDD requirements.
 * Sends events to the Node.js ingestion server via HTTP POST.
 *
 * SDD Phase 1 Required Metrics (for Feature Extraction §6.1.1):
 * - Click counts and retry attempts
 * - Error and timeout occurrences
 * - Average dwell time and idle time
 * - Navigation backtracking and refocus behavior
 * - Form abandonment indicators
 */
const Telemetry = {
  page: null,
  baseContext: {},
  _behavioralAttached: false,

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

  /**
   * Emit timeout event (system-level signal for frustration scoring).
   * Call when an operation exceeds expected duration (e.g., mock API timeout).
   */
  emitTimeout(operation, metadata = {}) {
    this.emit('timeout', { operation, ...metadata });
  },

  /**
   * Track retry attempts. Call when user retries a failed action.
   * Increments retry count for session-level aggregation.
   */
  emitRetry(action, attemptNumber, metadata = {}) {
    this.emit('retry_attempt', { action, attempt_number: attemptNumber, ...metadata });
  },

  /**
   * Attach global behavioral capture for SDD-required metrics.
   * Call after Telemetry.init() on each page.
   * Captures: clicks, scroll depth, idle time, refocus behavior.
   */
  attachBehavioralCapture() {
    if (this._behavioralAttached) return;
    this._behavioralAttached = true;

    // --- Click counts (for feature extraction) ---
    let lastClickTs = 0;
    const CLICK_THROTTLE_MS = 300;
    document.addEventListener(
      'click',
      (e) => {
        if (performance.now() - lastClickTs < CLICK_THROTTLE_MS) return;
        lastClickTs = performance.now();
        const target = e.target;
        const tag = target.tagName?.toLowerCase();
        const id = target.id || target.name || '';
        const role = target.getAttribute?.('role') || '';
        this.emit('click', {
          tag,
          id: id || undefined,
          role: role || undefined,
          text_len: (target.textContent || '').trim().slice(0, 50).length,
        });
      },
      true
    );

    // --- Scroll depth (hesitation / engagement signal) ---
    const SCROLL_MILESTONES = [0.25, 0.5, 0.75, 1];
    const reachedMilestones = new Set();
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      if (scrollHeight <= 0) return;
      const pct = Math.min(1, scrollTop / scrollHeight);
      for (const m of SCROLL_MILESTONES) {
        if (pct >= m && !reachedMilestones.has(m)) {
          reachedMilestones.add(m);
          this.emit('scroll_depth', { pct: m, scroll_y: Math.round(scrollTop) });
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // --- Idle time (hesitation / confusion signal) ---
    const IDLE_THRESHOLD_MS = 30000;
    let idleTimer = null;
    let lastActivityTs = performance.now();

    const resetIdleTimer = () => {
      lastActivityTs = performance.now();
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        const idleMs = Math.round(performance.now() - lastActivityTs);
        this.emit('idle_time', { ms: idleMs });
      }, IDLE_THRESHOLD_MS);
    };

    ['click', 'keydown', 'mousemove'].forEach((ev) => {
      document.addEventListener(ev, resetIdleTimer, { passive: true });
    });
    window.addEventListener('scroll', resetIdleTimer, { passive: true });
    resetIdleTimer();

    // --- Refocus behavior (backtracking / confusion signal) ---
    let lastFocusedId = null;
    let lastBlurTs = 0;
    const REFOCUS_WINDOW_MS = 5000;

    document.addEventListener(
      'focusin',
      (e) => {
        const id = e.target.id || e.target.name || e.target.getAttribute?.('aria-label') || '';
        if (!id) return;
        const now = performance.now();
        if (lastFocusedId === id && now - lastBlurTs < REFOCUS_WINDOW_MS) {
          this.emit('refocus', { field: id, ms_since_blur: Math.round(now - lastBlurTs) });
        }
        lastFocusedId = id;
      },
      true
    );

    document.addEventListener(
      'focusout',
      (e) => {
        const id = e.target.id || e.target.name || e.target.getAttribute?.('aria-label') || '';
        if (id) {
          lastBlurTs = performance.now();
        }
      },
      true
    );

    // --- Navigation backtracking (browser back/forward) ---
    window.addEventListener('popstate', () => {
      this.emit('nav_backtrack', { direction: 'back' });
    });
  },
};
