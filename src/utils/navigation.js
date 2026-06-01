export const routeForRole = (role) => {
  if (role === 'admin') return 'admin';
  if (role === 'doctor') return 'doctor_dashboard';
  return 'home';
};
