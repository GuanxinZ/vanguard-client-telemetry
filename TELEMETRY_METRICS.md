# Telemetry Metrics Collected (SDD-Based Design)

This document catalogs all metrics collected in Phase 1 of the Vanguard Client Telemetry AI System, aligned with the Software Design Document (SDD).

---

## SDD Reference (§6.1.1 Feature Extraction Inputs)

The following inputs are required for frustration scoring:

| SDD Input | Event(s) Collected | Aggregation |
|-----------|-------------------|-------------|
| Click counts and retry attempts | `click`, `retry_attempt` | Count per session |
| Error and timeout occurrences | `*_error`, `timeout` | Count per session |
| Average dwell time and idle time | `dwell_time`, `idle_time` | Mean per session |
| Navigation backtracking and refocus behavior | `trade_step_back`, `nav_backtrack`, `refocus` | Count per session |
| Form abandonment indicators | `abandon_*`, `*_form_abandon` | Boolean/count per session |

---

## Event Schema (All Events)

Every event includes:

| Field | Type | Description |
|-------|------|--------------|
| `session_id` | string | Unique session identifier |
| `user_id` | string | User identifier (U-guest or U{n}) |
| `page` | string | Page context (home, login, trade, etc.) |
| `event_type` | string | Event name (see below) |
| `timestamp` | ISO 8601 | Client timestamp |
| `url` | string | Full page URL |
| `metadata` | object | Event-specific data |
| `server_received_at` | ISO 8601 | Server timestamp (added on ingest) |

---

## Complete Event Catalog

### Global Behavioral (attachBehavioralCapture)

| event_type | metadata | SDD § | Pages |
|------------|----------|-------|-------|
| `click` | `tag`, `id`, `role`, `text_len` | 6.1.1 (click counts) | All |
| `scroll_depth` | `pct` (0.25, 0.5, 0.75, 1), `scroll_y` | 5.2 (behavioral) | All |
| `idle_time` | `ms` | 6.1.1 (idle time) | All |
| `refocus` | `field`, `ms_since_blur` | 6.1.1 (refocus behavior) | All |
| `nav_backtrack` | `direction` | 6.1.1 (backtracking) | All |

### Page-Level & Dwell

| event_type | metadata | SDD § | Pages |
|------------|----------|-------|-------|
| `page_view` | `source`, `from_page` (when applicable) | 5.2 | All |
| `dwell_time` | `ms` | 6.1.1 (dwell time) | All |

### Home (index.html)

| event_type | metadata | SDD § |
|------------|----------|-------|
| `cta_click` | `target` (login_header, login_main, create_header, create_main) | 5.2 |

### Login (login.html)

| event_type | metadata | SDD § |
|------------|----------|-------|
| `field_focus` | `field` (username, password) | 5.2 |
| `remember_toggle` | `value` | 5.2 |
| `forgot_password_click` | — | 5.2 (hesitancy/support) |
| `login_error` | `reason` (system_failure, invalid_credentials) | 6.1.1 (errors) |
| `login_success` | `username` | 5.2 |
| `retry_attempt` | `action`, `attempt_number`, `reason` | 6.1.1 (retries) |

### Create Account (create-account.html)

| event_type | metadata | SDD § |
|------------|----------|-------|
| `create_form_open` | — | 5.2 |
| `field_focus` | `field` | 5.2 |
| `abandon_create_form` | `after_s` | 6.1.1 (abandonment) |
| `create_submit_error` | `reason` (missing_fields, password_mismatch, mock_backend_failure) | 6.1.1 (errors) |
| `create_submit_success` | `has_fullname`, `email_len` | 5.2 |
| `retry_attempt` | `action`, `attempt_number`, `reason` | 6.1.1 (retries) |

### Account Home (account-home-page.html)

| event_type | metadata | SDD § |
|------------|----------|-------|
| `nav_click` | `target` (holdings, trade, help) | 5.2 |

### Trade (trade.html)

| event_type | metadata | SDD § |
|------------|----------|-------|
| `trade_flow_start` | — | 5.2 |
| `trade_form_open` | — | 5.2 |
| `trade_form_abandon` | `after_s` | 6.1.1 (abandonment) |
| `trade_step_view` | `step` (1, 2, 3) | 5.2 |
| `trade_step_dwell` | `step`, `ms` | 6.1.1 (dwell time) |
| `trade_step_next` | `from`, `to` | 5.2 |
| `trade_step_back` | `from`, `to` | 6.1.1 (backtracking) |
| `trade_step_error` | `step`, `reason`, `missing_fields` | 6.1.1 (errors) |
| `price_type_change` | `price_type` | 5.2 |
| `field_change` | `field`, `length`/`value` | 5.2 |
| `trade_flow_cancel` | `step` | 5.2 |
| `trade_submit_error` | `reason`, `action`, `quantity`, etc. | 6.1.1 (errors) |
| `trade_submit_success` | `action`, `price_type`, `quantity`, `limit_price` | 5.2 |
| `trade_flow_complete` | `success` | 5.2 |
| `retry_attempt` | `action`, `attempt_number`, `reason` | 6.1.1 (retries) |

### Holdings (holdings.html)

| event_type | metadata | SDD § |
|------------|----------|-------|
| `holding_row_click` | `symbol` | 5.2 |
| `statements_click` | — | 5.2 |
| `statements_error` | `reason` (timeout, mock_unavailable) | 6.1.1 (errors) |
| `statements_success` | — | 5.2 |
| `timeout` | `operation`, `attempt` | 6.1.1 (timeouts) |
| `retry_attempt` | `action`, `attempt_number`, `reason` | 6.1.1 (retries) |

### Help (help.html) — Sentiment-Adjacent

| event_type | metadata | SDD § |
|------------|----------|-------|
| `page_view` | `source`, `from_page` | 5.2 (help visits) |
| `help_search` | `q_len`, `has_terms` | 5.2 (hesitancy) |
| `faq_open` | `source`, `faq_id` | 5.2 |
| `faq_close` | `source`, `faq_id` | 5.2 |
| `faq_solved` | `source`, `faq_id` | 5.2 |
| `contact_open` | `source` | 5.2 |
| `abandon_contact_form` | `source`, `after_s`, `frustration_signal` | 6.1.1 (abandonment) |
| `contact_submit_error` | `source`, `category`, `frustration_signal` | 6.1.1 (errors) |
| `contact_submit_success` | `source`, `category` | 5.2 |
| `escalation_click` | `source`, `channel`, `escalation_type`, `frustration_signal` | 5.2 (support) |
| `retry_attempt` | `action`, `attempt_number`, `source`, `category` | 6.1.1 (retries) |

---

## Storage

- **Endpoint:** `POST /api/telemetry`
- **Format:** NDJSON (one JSON object per line)
- **Path:** `logs/telemetry_logs.ndjson`
- **SDD reference:** §5.2 Data Ingestion Design

---

## Page Context Values

| `page` value | File |
|--------------|------|
| `home` | index.html |
| `login` | login.html |
| `create_account` | create-account.html |
| `account_home` | account-home-page.html |
| `trade` | trade.html |
| `holdings` | holdings.html |
| `help` | help.html |
