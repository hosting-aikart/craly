/**
 * Centralized role-based dashboard router.
 * Prevents circular redirect loops between role workspaces.
 */
export function getRoleDefaultDashboard(role?: string | null): string {
  if (!role) return '/login';

  switch (role) {
    case 'staff':
    case 'ops_head':
    case 'field_staff':
      return '/staff/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'business':
      return '/business/dashboard';
    case 'contractor':
      return '/contractor-portal/dashboard';
    default:
      return '/login';
  }
}
