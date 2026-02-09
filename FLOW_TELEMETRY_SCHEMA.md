# Universal Flow Telemetry Schema

This document defines the standardized flow/journey tracking schema used across all user flows in the Vanguard Client Telemetry system.

---

## Design Rationale

Instead of feature-specific event names (`trade_flow_start`, `login_flow_start`, etc.), we use **4 universal flow events** that work for any user journey. This approach:

✅ **Simplifies Phase 2 analysis** - Single query pattern for all flows  
✅ **Enables cross-flow comparison** - Unified metrics (completion rate, drop-off points)  
✅ **Reduces event proliferation** - 4 events vs. 4×N events (where N = number of flows)  
✅ **Improves maintainability** - One schema to document and validate

---

## Universal Flow Events

### 1. `flow_start`
**When:** User begins a process or journey.

**Metadata:**
```json
{
  "flowName": "string"
}
```

**Example:**
```json
{
  "eventType": "flow_start",
  "metadata": { "flowName": "trade" }
}
```

---

### 2. `flow_step`
**When:** User views or progresses to a step within the flow.

**Metadata:**
```json
{
  "flowName": "string",
  "stepName": "string",
  "stepIndex": number,
  "totalSteps": number
}
```

**Example:**
```json
{
  "eventType": "flow_step",
  "metadata": {
    "flowName": "trade",
    "stepName": "review",
    "stepIndex": 3,
    "totalSteps": 3
  }
}
```

---

### 3. `flow_complete`
**When:** User successfully completes the flow goal.

**Metadata:**
```json
{
  "flowName": "string"
}
```

**Example:**
```json
{
  "eventType": "flow_complete",
  "metadata": { "flowName": "onboarding" }
}
```

---

### 4. `flow_abandon`
**When:** User exits the flow without completing it.

**Metadata:**
```json
{
  "flowName": "string",
  "reason": "string",
  "lastStep": number
}
```

**Abandonment Reasons:**
- `user_cancel` - Explicit cancel action
- `page_unload` - Browser navigation away
- `timeout` - Inactivity timeout
- `forgot_password` - Clicked forgot password link
- `error` - Technical error preventing progress

**Example:**
```json
{
  "eventType": "flow_abandon",
  "metadata": {
    "flowName": "login",
    "reason": "page_unload",
    "lastStep": 1
  }
}
```

---

## Implemented Flows

### Flow: `trade`
**Steps:** 3  
**Journey:** Place a stock/fund trade order

| stepIndex | stepName | Description |
|-----------|----------|-------------|
| 1 | `select_asset` | Enter symbol or fund name |
| 2 | `trade_details` | Configure action, quantity, price type |
| 3 | `review` | Review and confirm order |

**Completion:** Order submitted successfully  
**Abandonment triggers:** Cancel button, validation failures (with retry tracking)

---

### Flow: `login`
**Steps:** 2  
**Journey:** Sign in to account

| stepIndex | stepName | Description |
|-----------|----------|-------------|
| 1 | `enter_username` | Focus on username field |
| 2 | `enter_password` | Focus on password field |

**Completion:** Successful authentication  
**Abandonment triggers:** Page unload, forgot password link

---

### Flow: `onboarding`
**Steps:** 4  
**Journey:** Create new account

| stepIndex | stepName | Description |
|-----------|----------|-------------|
| 1 | `enter_name` | Focus on fullname field |
| 2 | `enter_email` | Focus on email field |
| 3 | `create_password` | Focus on password field |
| 4 | `confirm_password` | Focus on confirm password field |

**Completion:** Account created successfully  
**Abandonment triggers:** Page unload before submission

---

## Phase 2 Analysis Queries

### Completion Rate by Flow
```sql
SELECT 
  metadata->>'flowName' as flow,
  COUNT(DISTINCT sessionId) FILTER (WHERE eventType = 'flow_start') as started,
  COUNT(DISTINCT sessionId) FILTER (WHERE eventType = 'flow_complete') as completed,
  ROUND(100.0 * COUNT(DISTINCT sessionId) FILTER (WHERE eventType = 'flow_complete') / 
    NULLIF(COUNT(DISTINCT sessionId) FILTER (WHERE eventType = 'flow_start'), 0), 2) as completion_rate
FROM telemetry_events
GROUP BY flow;
```

### Drop-off Analysis by Step
```sql
SELECT 
  metadata->>'flowName' as flow,
  metadata->>'stepName' as step,
  (metadata->>'stepIndex')::int as step_index,
  COUNT(*) as views
FROM telemetry_events
WHERE eventType = 'flow_step'
GROUP BY flow, step, step_index
ORDER BY flow, step_index;
```

### Abandonment Reasons
```sql
SELECT 
  metadata->>'flowName' as flow,
  metadata->>'reason' as reason,
  COUNT(*) as count
FROM telemetry_events
WHERE eventType = 'flow_abandon'
GROUP BY flow, reason
ORDER BY flow, count DESC;
```

---

## Migration Notes

### Old → New Mappings

| Old Event | New Event | Notes |
|-----------|-----------|-------|
| `trade_flow_start` | `flow_start` | Add `flowName: 'trade'` |
| `trade_step_view` | `flow_step` | Add step details |
| `trade_flow_complete` | `flow_complete` | Simplified |
| `trade_flow_cancel` | `flow_abandon` | Add `reason` + `lastStep` |
| `login_success` | `login_success` + `flow_complete` | Dual emit |
| `create_submit_success` | `create_submit_success` + `flow_complete` | Dual emit |

### Detail Events Preserved

These events provide granular insights and are **not** replaced by flow events:
- `trade_step_dwell` - Time spent per step
- `trade_step_next` / `trade_step_back` - Navigation actions
- `trade_step_error` - Validation errors
- `trade_submit_error` - Submission failures
- `login_error` - Authentication errors
- `create_submit_error` - Registration errors

---

## Best Practices

1. **Always emit `flow_start` before `flow_step`**
2. **Update `currentStep` tracking** for accurate abandonment reporting
3. **Set completion flag** before redirect to prevent false abandonments
4. **Use descriptive `stepName`** values (e.g., `enter_password` not `step2`)
5. **Include context in `reason`** for abandonment (e.g., `forgot_password` not just `cancel`)
