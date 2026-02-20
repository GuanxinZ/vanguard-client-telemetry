export type ScenarioType = 'normal_user' | 'frustrated_user' | 'lost_user' | 'error_user';

export type EventType = 
  | 'page_navigation'
  | 'click'
  | 'dead_click'
  | 'rage_click'
  | 'scroll'
  | 'mouse_move'
  | 'console_error'
  | 'page_error'
  | 'network_error'
  | 'refocus'
  | 'u_turn'
  | 'idle'
  | 'session_start'
  | 'session_end';

export interface EventLog {
  ts: string;
  session_id: string;
  scenario: ScenarioType;
  event_type: EventType;
  url: string;
  selector?: string;
  metadata: Record<string, any>;
}

export interface ScenarioMix {
  normal: number;
  frustrated: number;
  lost: number;
  error: number;
}

export interface RunConfig {
  baseUrl: string;
  sessions: number;
  scenarioMix: ScenarioMix;
  outputFile?: string;
}

export interface ElementInfo {
  selector: string;
  tagName: string;
  text?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

