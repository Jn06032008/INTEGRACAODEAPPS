export type RoleKey = 'member' | 'sector_lead' | 'studio_lead' | 'senior_lead' | 'sysadmin';

export interface Profile {
  id: string;
  auth_user_id: string | null;
  username: string;
  full_name: string;
  email: string | null;
  account_status: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  level: number;
}

export interface Sector {
  id: string;
  name: string;
  description: string | null;
}

export interface UserSector {
  id: string;
  user_id: string;
  sector_id: string;
  sector?: Sector;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  role?: Role;
}

export interface ChurchEvent {
  id: string;
  name: string;
  event_type: string;
  start_at: string;
  end_at: string | null;
  status: string;
  observations: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ChecklistTemplateItem {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  sector: string | null;
  sort_order: number;
}

export interface ChecklistRun {
  id: string;
  event_id: string;
  template_id: string;
  created_by: string | null;
  created_at: string;
  event?: ChurchEvent;
  template?: ChecklistTemplate;
}

export interface ChecklistTask {
  id: string;
  run_id: string;
  name: string;
  description: string | null;
  sector: string | null;
  sort_order: number;
  status: string;
  assigned_to: string | null;
  completed_by: string | null;
  completed_at: string | null;
  block_reason: string | null;
  notes: string | null;
}

export interface ChecklistTaskHistory {
  id: string;
  task_id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  performed_by: string | null;
  performed_at: string;
  notes: string | null;
}

export interface Report {
  id: string;
  event_id: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  event?: ChurchEvent;
}

export interface ReportSection {
  id: string;
  report_id: string;
  section_key: string;
  content: string | null;
  not_applicable: boolean;
  authored_by: string | null;
  updated_at: string;
}

export interface OperationalError {
  id: string;
  title: string;
  description: string | null;
  event_id: string | null;
  occurred_at: string | null;
  sector: string | null;
  category: string;
  impact: string | null;
  severity: string;
  immediate_action: string | null;
  followup_responsible: string | null;
  report_id: string | null;
  problem_id: string | null;
  analysis_stage: string;
  status: string;
  created_by: string | null;
  created_at: string;
  event?: ChurchEvent;
}

export interface Problem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  identified_at: string;
  identified_by: string | null;
  sector: string | null;
  event_id: string | null;
  category: string | null;
  impact: string;
  urgency: string;
  priority: string;
  status: string;
  followup_responsible: string | null;
  confirmed_cause: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  proposed_solution: string | null;
  solution_deadline: string | null;
  final_result: string | null;
  created_at: string;
  updated_at: string;
  event?: ChurchEvent;
}

export interface ProblemUpdate {
  id: string;
  problem_id: string;
  author: string | null;
  previous_status: string | null;
  new_status: string | null;
  comment: string | null;
  created_at: string;
}

export interface Solution {
  id: string;
  problem_id: string;
  description: string;
  rationale: string | null;
  resources_needed: string | null;
  risks: string | null;
  effects: string | null;
  executors: string | null;
  test_method: string | null;
  success_criteria: string | null;
  revert_plan: string | null;
  needs_authorization: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  problem_id: string;
  solution_id: string | null;
  requested_by: string | null;
  scope: string | null;
  authorized_users: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
}

export interface ApprovalDecision {
  id: string;
  approval_request_id: string;
  decision: string;
  decided_by: string | null;
  justification: string | null;
  decided_at: string;
}

export interface ScheduleAssignment {
  id: string;
  event_id: string;
  sector: string;
  role_name: string;
  assigned_to: string | null;
  instructions: string | null;
  presentation_time: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  event?: ChurchEvent;
  readiness?: ReadinessConfirmation | null;
}

export interface ReadinessConfirmation {
  id: string;
  assignment_id: string;
  user_id: string;
  state: string;
  observation: string | null;
  confirmed_at: string;
}

export interface ScheduleChangeLog {
  id: string;
  assignment_id: string;
  changed_by: string | null;
  previous_assignment: string | null;
  new_assignment: string | null;
  reason: string | null;
  changed_at: string;
}

export interface MediaAsset {
  id: string;
  event_id: string | null;
  cult_date: string;
  cult_time: string | null;
  preacher: string | null;
  event_name: string | null;
  record_type: string;
  status: string;
  editor_id: string | null;
  publication_responsible_id: string | null;
  status_reported_by: string | null;
  publication_platform: string | null;
  publication_url: string | null;
  observations: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaHistory {
  id: string;
  media_id: string;
  author: string | null;
  previous_status: string | null;
  new_status: string | null;
  comment: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  justification: string | null;
  created_at: string;
}

export interface EventPreset {
  id: string;
  name: string;
  event_type: string;
  weekday: number;
  start_time: string;
  end_time: string | null;
  observations: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Occurrence {
  id: string;
  person_name: string;
  occurrence_type: string;
  description: string | null;
  event_id: string | null;
  action_taken: string | null;
  penalty: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  event?: ChurchEvent;
}

export interface PresetOption {
  id: string;
  category: string;
  value: string;
  is_active: boolean;
  created_at: string;
}

export interface AppUser {
  id: string; // auth uid
  email: string | null;
  profile: Profile;
  roles: Role[];
  sectors: Sector[];
  isSysadmin: boolean;
  isStudioLead: boolean;
  isSectorLead: boolean;
  isSeniorLead: boolean;
  isMember: boolean;
  maxLevel: number;
}
