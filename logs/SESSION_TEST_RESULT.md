# Session Test Result: 10 Metrics Coverage

**Run 1:** 5 sessions (normal 0.4, frustrated 0.3, lost 0.2, error 0.1)  
**Run 2:** 10 sessions (normal 0.3, frustrated 0.3, lost 0.2, error 0.2)  
**Log file:** `telemetry_logs.ndjson` (events appended from both runs)

## Metric coverage (combined log)

| # | Metric | eventType | Covered | Count |
|---|--------|-----------|---------|-------|
| 1 | Rage Clicks | rage_click | Yes | 2 |
| 2 | Dead Click | dead_click | Yes | 7 |
| 3 | Mouse Shake | mouse_move (behavior: shake) | No | 0 |
| 4 | U-turn | u_turn | Yes | 13 |
| 5 | Erratic Scroll | scroll (behavior: erratic) | Yes | 4 |
| 6 | Scroll Depth | scroll_depth | Yes | 16 |
| 7 | Idle Time | idle_time | Yes | 5 |
| 8 | Refocus | refocus | No | 0 |
| 9 | Form Abandonment | form_abandonment | Yes | 5 |
| 10 | System Errors | system_error | Yes | 3 |

**Result:** 8/10 metrics present. Missing: Mouse Shake, Refocus.

## Scenario mix

- 5 sessions: normal_user x3, frustrated_user x2 (no lost/error).
- 10 sessions: frustrated x2, normal x2, error x3, lost x3.

idle_time, form_abandonment, and system_error came from the 10-session run (lost_user, error_user).

## Follow-up

To aim for full coverage, use a balanced mix and run:

```bash
node run.js --baseUrl http://localhost:3000 --sessions 8 --scenarioMix normal:0.25,frustrated:0.25,lost:0.25,error:0.25 --telemetry-js-only
```

Scenarios were updated: refocus uses Tab/Shift+Tab on login; mouse shake runs on help page in frustrated_user.
