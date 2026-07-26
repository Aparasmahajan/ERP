import { z } from 'zod';

// User validation
export const CreateUserSchema = z.object({
  code: z.string().min(2).max(50),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  displayName: z.string().max(100).optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  dob: z.string().datetime().optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial();

// Role validation
export const CreateRoleSchema = z.object({
  key: z.string().min(2).max(50),
  title: z.string().min(1).max(100),
  rank: z.number().min(0).max(9),
  kind: z.enum(['LINE', 'STAFF', 'EXTERNAL']),
  mayHoldReports: z.boolean().default(false),
  maxDelegableRank: z.number().min(0).max(9),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const UpdateRoleSchema = CreateRoleSchema.partial().omit({ key: true });

// Position validation
export const CreatePositionSchema = z.object({
  userId: z.string().uuid(),
  reportsToUserId: z.string().uuid().optional(),
  orgUnitId: z.string().uuid(),
  titleOverride: z.string().max(100).optional(),
  spanHint: z.number().min(1).optional(),
  sessionId: z.string().uuid(),
});

export const UpdatePositionSchema = CreatePositionSchema.partial();

// Org Unit validation
export const CreateOrgUnitSchema = z.object({
  parentId: z.string().uuid().optional(),
  kind: z.enum(['FACULTY', 'DEPARTMENT', 'PROGRAMME', 'DIVISION', 'TEAM', 'BRANCH', 'CUSTOM']),
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
});

export const UpdateOrgUnitSchema = CreateOrgUnitSchema.partial();

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type CreatePositionInput = z.infer<typeof CreatePositionSchema>;
export type UpdatePositionInput = z.infer<typeof UpdatePositionSchema>;
export type CreateOrgUnitInput = z.infer<typeof CreateOrgUnitSchema>;
export type UpdateOrgUnitInput = z.infer<typeof UpdateOrgUnitSchema>;
