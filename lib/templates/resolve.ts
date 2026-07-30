/**
 * Maps the template id a visitor picks to the seed data used to provision their tenant.
 *
 * Two different id spaces exist and it is easy to conflate them:
 *   - catalogue ids ('institution', 'retail', 'taxi') — what the landing and templates
 *     pages use for their cards
 *   - demo/seed keys ('student-info-system', 'retail-operations-hub') — what
 *     lib/seeds/templateDemos.ts is keyed by
 *
 * Enquiry forms submit whichever id their card carries, and the server resolves it here, so
 * the client never has to know about seed keys.
 *
 * Three catalogue entries have no seed of their own and fall back to the closest fit —
 * without this, accepting those enquiries would throw "Unknown template" at provisioning
 * time, long after the enquirer was told their request went through.
 */

import { TEMPLATE_DEMOS } from '@/lib/seeds/templateDemos';

const CATALOGUE_TO_SEED: Record<string, string> = {
  // direct matches
  institution: 'student-info-system',
  organization: 'employee-management-suite',
  hospital: 'patient-management-system',
  ngo: 'volunteer-management-portal',
  'online-academy': 'course-management-platform',
  startup: 'project-management-suite',
  fitness: 'fitness-center-management',
  retail: 'retail-operations-hub',
  logistics: 'logistics-fleet-management',

  // no seed of their own — nearest equivalent
  community: 'volunteer-management-portal',
  ecommerce: 'retail-operations-hub',
  taxi: 'logistics-fleet-management',
};

/** The seed key for a template id, or null if we cannot place it. */
export function resolveSeedKey(templateId: string): string | null {
  if (!templateId) return null;
  // Already a seed key.
  if ((TEMPLATE_DEMOS as Record<string, unknown>)[templateId]) return templateId;

  const mapped = CATALOGUE_TO_SEED[templateId];
  if (mapped && (TEMPLATE_DEMOS as Record<string, unknown>)[mapped]) return mapped;

  return null;
}

export function isKnownTemplate(templateId: string): boolean {
  return resolveSeedKey(templateId) !== null;
}

/** Every id that may be submitted — both spaces. Useful for validation and tests. */
export function acceptedTemplateIds(): string[] {
  return [...new Set([...Object.keys(TEMPLATE_DEMOS), ...Object.keys(CATALOGUE_TO_SEED)])];
}

export { CATALOGUE_TO_SEED };
