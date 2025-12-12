import { useAuth } from '@/context/auth-context';
import { ROLE_PERMISSIONS, Permission, Role } from '@/config/permissions';

export const usePermission = () => {
  const { profile } = useAuth();
  
  // Default to 'athlete' (lowest privilege) if no profile or role found
  const role = (profile?.role as Role) || 'athlete';

  const can = (permission: Permission): boolean => {
    // Admin has all permissions implicitly (failsafe)
    if (role === 'admin') return true;
    
    const allowedPermissions = ROLE_PERMISSIONS[role] || [];
    return allowedPermissions.includes(permission);
  };

  /**
   * Checks if user has specific role
   */
  const is = (targetRole: Role): boolean => {
    return role === targetRole;
  };

  return { can, is, role };
};