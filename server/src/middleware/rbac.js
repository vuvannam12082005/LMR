import { ForbiddenError } from '../utils/errors.js';

const ROLE_LEVELS = {
  'Member': 1,
  'Librarian': 2,
  'Administrator': 3
};

function getRoleLevel(role) {
  return ROLE_LEVELS[role] || 0;
}

export function requireRole(allowedRoles, options = {}) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const userRoleLevel = getRoleLevel(req.user.role);
      const requiredLevel = Math.min(...allowedRoles.map(getRoleLevel));

      // Check role hierarchy
      if (userRoleLevel < requiredLevel) {
        throw new ForbiddenError('Insufficient permissions');
      }

      // Check ownership if required
      if (options.requireOwnership && req.params.id) {
        // For /api/members/:id/* endpoints
        const requestedId = req.params.id.toString();
        const userId = req.user.userId.toString();
        
        if (requestedId !== userId && userRoleLevel < getRoleLevel('Librarian')) {
          throw new ForbiddenError('Cannot access other member data');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
