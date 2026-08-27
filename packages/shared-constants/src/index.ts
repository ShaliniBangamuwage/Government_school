export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  REVIEWER: 'reviewer',
  ADMIN: 'admin',
} as const;

export const APP_ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  studentDashboard: '/student/dashboard',
  teacherDashboard: '/teacher/dashboard',
  adminDashboard: '/admin/dashboard',
} as const;
