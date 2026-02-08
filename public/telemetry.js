/**
 * Vanguard Client Telemetry (Phase 1)
 * Captures behavioral, system, and sentiment-adjacent events per SDD requirements.
 */
const Telemetry = {
  pageRoute: null,
  baseContext: {},
  _behavioralAttached: false,
  _formInteracted: false,
  _formSubmitted: false,
  _pageStartTime: null,

  /**
   * Initialize telemetry for a page.
   * @param {string} pageName - Route identifier (e.g., 'trade', 'login')
   * @param {object} options - Additional context to attach to all events
   */
  init(pageName, options = {}) {
    this.pageRoute = pageName;
    this.baseContext = options;
    this._pageStartTime = performance.now();

    if (!localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', `S${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    }
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', 'U-guest');
    }

    this.attachBehavioralCapture();
    this.emit('page_view');
  },

  _buildEvent(eventType, metadata = {}) {
    const { id, ...restMetadata } = metadata;
    return {
      sessionId: localStorage.getItem('sessionId'),
      userId: localStorage.getItem('userId') || 'U-guest',
      pageRoute: this.pageRoute,
      eventType,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...(id && { elementId: id }),
      ...this.baseContext,
      metadata: restMetadata,
    };
  },

  /**
   * Emit a telemetry event.
   * @param {string} eventType - Event name
   * @param {object} metadata - Event-specific data
   */
  emit(eventType, metadata = {}) {
    const evt = this._buildEvent(eventType, metadata);
    console.log('📊 Telemetry:', eventType, metadata);

    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evt),
    }).catch(() => {});
  },

  sendBeacon(eventType, metadata = {}) {
    const evt = this._buildEvent(eventType, metadata);
    const blob = new Blob([JSON.stringify(evt)], { type: 'application/json' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/telemetry', blob);
    } else {
      this.emit(eventType, metadata);
    }
  },

  emitTimeout(operation, metadata = {}) {
    this.emit('timeout', { operation, ...metadata });
  },

  emitRetry(action, attemptNumber, metadata = {}) {
    this.emit('retry_attempt', { action, attemptNumber, ...metadata });
  },

  /**
   * Attach global behavioral capture for SDD-required metrics.
   * Captures: rage clicks, scroll depth, idle time, refocus, errors, form abandonment.
   */
  attachBehavioralCapture() {
    if (this._behavioralAttached) return;
    this._behavioralAttached = true;

    const clickHistory = new Map();
    const RAGE_CLICK_THRESHOLD = 3;
    const RAGE_CLICK_WINDOW_MS = 800;

    document.addEventListener(
      'click',
      (e) => {
        const target = e.target;
        const elementKey = this._getElementKey(target);
        const now = performance.now();

        if (!clickHistory.has(elementKey)) {
          clickHistory.set(elementKey, []);
        }
        const timestamps = clickHistory.get(elementKey);
        const recentClicks = timestamps.filter(t => now - t < RAGE_CLICK_WINDOW_MS);
        recentClicks.push(now);
        clickHistory.set(elementKey, recentClicks);

        if (recentClicks.length >= RAGE_CLICK_THRESHOLD) {
          this.emit('rage_click', {
            element: elementKey,
            clickCount: recentClicks.length,
            tag: target.tagName?.toLowerCase(),
            id: target.id || undefined,
            text: (target.textContent || '').trim().slice(0, 50),
          });
          clickHistory.set(elementKey, []);
        }

        this.emit('click', {
          tag: target.tagName?.toLowerCase(),
          id: target.id || target.name || undefined,
          role: target.getAttribute?.('role') || undefined,
          textLen: (target.textContent || '').trim().slice(0, 50).length,
        });
      },
      true
    );

    window.addEventListener('error', (event) => {
      this.emit('system_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        errorType: 'js_error',
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.emit('system_error', {
        message: event.reason?.message || String(event.reason),
        errorType: 'unhandled_promise_rejection',
      });
    });

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
          this.emit('scroll_depth', { pct: m, scrollY: Math.round(scrollTop) });
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

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
          this.emit('refocus', { field: id, msSinceBlur: Math.round(now - lastBlurTs) });
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

    window.addEventListener('popstate', () => {
      this.emit('nav_backtrack', { direction: 'back' });
    });

    document.addEventListener('focusin', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        this._formInteracted = true;
      }
    }, true);

    document.addEventListener('submit', () => {
      this._formSubmitted = true;
    }, true);

    window.addEventListener('beforeunload', () => {
      const dwellMs = Math.round(performance.now() - this._pageStartTime);
      
      this.sendBeacon('page_view_end', { dwellMs });

      if (this._formInteracted && !this._formSubmitted) {
        this.sendBeacon('form_abandonment', {
          pageRoute: this.pageRoute,
          dwellMs,
        });
      }
    });
  },

  _getElementKey(element) {
    if (element.id) return `#${element.id}`;
    if (element.name) return `[name="${element.name}"]`;
    const tag = element.tagName?.toLowerCase() || 'unknown';
    const classList = Array.from(element.classList || []).slice(0, 2).join('.');
    return classList ? `${tag}.${classList}` : tag;
  },
};
