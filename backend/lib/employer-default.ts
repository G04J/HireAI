/**
 * Re-export barrel — keeps existing import paths working.
 * Prefer importing directly from @/server/employer.
 */
export {
  getEmployerIdForRequest,
  getDefaultEmployerId,
  requireEmployerId,
} from '@/server/employer';
