// Core domain types from poc.md

export type Pack = 'INSTITUTION' | 'ORGANISATION' | 'HYBRID' | 'CUSTOM';
export type TenantStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'READ_ONLY' | 'ARCHIVED';
export type UserStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type RoleKind = 'LINE' | 'STAFF' | 'EXTERNAL';

// Capabilities (132 total, grouped by 21 modules)
export enum Capability {
  // Platform
  'platform.tenant.provision' = 'platform.tenant.provision',
  'platform.tenant.read' = 'platform.tenant.read',

  // Identity & Provisioning
  'people.user.create' = 'people.user.create',
  'people.user.read' = 'people.user.read',
  'people.user.write' = 'people.user.write',
  'people.user.archive' = 'people.user.archive',
  'people.role.assign' = 'people.role.assign',
  'people.grant.assign' = 'people.grant.assign',
  'people.grant.revoke' = 'people.grant.revoke',

  // Attendance
  'attendance.self.mark' = 'attendance.self.mark',
  'attendance.other.mark' = 'attendance.other.mark',
  'attendance.other.amend' = 'attendance.other.amend',
  'attendance.policy.manage' = 'attendance.policy.manage',

  // Leave
  'leave.request.submit' = 'leave.request.submit',
  'leave.request.approve' = 'leave.request.approve',
  'leave.type.manage' = 'leave.type.manage',
  'leave.balance.view' = 'leave.balance.view',

  // Marks & Gradebook
  'marks.entry.write' = 'marks.entry.write',
  'marks.entry.read' = 'marks.entry.read',
  'marks.report.read' = 'marks.report.read',
  'marks.publish' = 'marks.publish',

  // Payroll (dangerous)
  'payroll.salary.read' = 'payroll.salary.read',
  'payroll.run.execute' = 'payroll.run.execute',

  // IAM Admin
  'iam.grant.assign_peer' = 'iam.grant.assign_peer',
  'iam.grant.override_minrank' = 'iam.grant.override_minrank',
  'iam.policy_override' = 'iam.policy_override',
}

export enum Scope {
  SELF = 'SELF',
  DIRECT_REPORTS = 'DIRECT_REPORTS',
  DOWNLINE = 'DOWNLINE',
  DOWNLINE_LIMITED = 'DOWNLINE_LIMITED',
  TEAM = 'TEAM',
  ORG_UNIT = 'ORG_UNIT',
  ORG_UNIT_SUBTREE = 'ORG_UNIT_SUBTREE',
  COHORT = 'COHORT',
  CUSTOM_SET = 'CUSTOM_SET',
  TENANT = 'TENANT',
}

export enum Module {
  PLATFORM = 'platform',
  IDENTITY = 'identity',
  ATTENDANCE = 'attendance',
  LEAVE = 'leave',
  ASSIGNMENTS = 'assignments',
  MARKS = 'marks',
  TIMETABLE = 'timetable',
  FEES = 'fees',
  EXAMS = 'exams',
  GUARDIAN = 'guardian',
  LIBRARY = 'library',
  NOTICES = 'notices',
  HOSTEL = 'hostel',
  TRANSPORT = 'transport',
  PAYROLL = 'payroll',
  PROJECTS = 'projects',
  TIMESHEETS = 'timesheets',
  PERFORMANCE = 'performance',
  HIRING = 'hiring',
  EXPENSES = 'expenses',
  DOCUMENTS = 'documents',
}

// ============ TENANT ============
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  legalName: string;
  pack: Pack;
  status: TenantStatus;
  timezone: string;
  locale: string;
  currency: string;
  weekStart: number;
  createdAt: string;
  grantVersion: number;
}

// ============ USER ============
export interface User {
  id: string;
  tenantId: string;
  code: string; // roll/employee number
  email?: string;
  phone?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  gender?: 'M' | 'F' | 'O';
  dob?: string;
  photoKey?: string;
  status: UserStatus;
  joinedOn: string;
  leftOn?: string;
  lastLoginAt?: string;
  customFields?: Record<string, any>;
}

// ============ ROLE ============
export interface Role {
  id: string;
  tenantId: string;
  key: string; // stable machine key
  title: string; // editable per tenant
  pack: Pack;
  rank: number; // 0..9
  kind: RoleKind;
  system: boolean; // catalogue roles
  mayHoldReports: boolean;
  maxDelegableRank: number;
  powerPresetId?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
}

export interface RoleGrant {
  id: string;
  roleId: string;
  capability: Capability;
  scope: Scope;
  scopeDepth?: number; // for DOWNLINE_LIMITED
  canDelegate: boolean;
  delegableScopeMax: Scope;
}

// ============ USER GRANTS ============
export type GrantMode = 'GRANT' | 'REVOKE' | 'INHERITED_REVOKED';

export interface UserGrant {
  id: string;
  userId: string;
  capability: Capability;
  mode: GrantMode;
  scope: Scope;
  scopeDepth?: number;
  canDelegate: boolean;
  grantedBy: string;
  reason?: string;
  expiresAt?: string;
  source: 'MANUAL' | 'IMPORT' | 'PRESET' | 'SYSTEM';
}

// ============ POSITION & HIERARCHY ============
export interface Position {
  id: string;
  userId: string;
  tenantId: string;
  reportsToUserId?: string; // null for root
  orgUnitId: string;
  titleOverride?: string;
  spanHint?: number;
  sessionId: string;
  validFrom: string;
  validTo?: string;
}

export interface PositionLink {
  id: string;
  userId: string;
  linkedToUserId: string;
  kind: 'PROJECT_MANAGER' | 'FUNCTIONAL_LEAD' | 'MENTOR' | 'DEPUTY_FOR' | 'ACADEMIC_ADVISOR' | 'GUARDIAN_OF';
  weight: number; // 0..1
  validFrom: string;
  validTo?: string;
}

export interface PositionClosure {
  ancestorId: string;
  descendantId: string;
  depth: number;
  sessionId: string;
}

// ============ ORG STRUCTURE ============
export interface OrgUnit {
  id: string;
  tenantId: string;
  parentId?: string;
  kind: 'FACULTY' | 'DEPARTMENT' | 'PROGRAMME' | 'DIVISION' | 'TEAM' | 'BRANCH' | 'CUSTOM';
  name: string;
  code: string;
  headUserId?: string;
  path: string; // ltree
  sortOrder: number;
}

export interface Cohort {
  id: string;
  tenantId: string;
  orgUnitId: string;
  sessionId: string;
  kind: 'CLASS' | 'SECTION' | 'BATCH' | 'SQUAD';
  name: string;
  year?: number;
  semester?: number;
  capacity?: number;
  primaryLeaderUserId?: string;
}

export interface Session {
  id: string;
  tenantId: string;
  name: string; // "2026-27"
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
}

// ============ AUDIT ============
export interface AuditEvent {
  id: string;
  tenantId: string;
  actorId: string;
  onBehalfOf?: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ip: string;
  ua: string;
  requestId: string;
  createdAt: string;
}

// ============ USER ROLE ASSIGNMENT ============
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  validFrom: string;
  validTo?: string;
  isActing: boolean;
  assignedBy: string;
}

// ============ BRANDING CONFIG (Week 1) ============
export interface BrandingConfig {
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  domain?: string;
  [key: string]: any;
}

// ============ MODULE FEATURES (Week 1) ============
export interface ModuleFeature {
  feature_id: string;
  name: string;
  category: string;
  enabled: boolean;
  description: string;
  phase: number;
}

// ============ EXCEL CAPABILITY (Week 1) ============
export interface ExcelCapability {
  user_id: string;
  capability: string;
  scope: 'SELF' | 'DIRECT_REPORTS' | 'DOWNLINE' | 'TENANT' | 'ORG_UNIT';
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  delegable: boolean;
}
