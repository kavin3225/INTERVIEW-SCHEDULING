export function getDefaultRouteForRole(role) {
  switch (role) {
    case 'admin':
      return '/users';
    case 'candidate':
      return '/slots';
    case 'recruiter':
      return '/bookings';
    default:
      return '/login';
  }
}
