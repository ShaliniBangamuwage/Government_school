import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import VerifyEmailPage from './page';

const mockPush = vi.fn();

const mockUseAuth = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      firebaseUser: null,
      role: null,
      loading: false,
    });
  });

  it('redirects unauthenticated users to /login', async () => {
    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('shows "Go to Login" link for unauthenticated users', () => {
    render(<VerifyEmailPage />);

    const loginLink = screen.getByRole('link', { name: /Go to Login/ });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('displays informational message about email verification not being required', () => {
    render(<VerifyEmailPage />);

    expect(screen.getByText(/Email verification is not required during the current development phase/)).toBeInTheDocument();
  });

  it('redirects admin users to /admin/dashboard', async () => {
    mockUseAuth.mockReturnValueOnce({
      firebaseUser: { uid: 'test-uid', email: 'admin@example.com' },
      role: 'admin',
      loading: false,
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('redirects teacher users to /teacher/dashboard', async () => {
    mockUseAuth.mockReturnValueOnce({
      firebaseUser: { uid: 'test-uid', email: 'teacher@example.com' },
      role: 'teacher',
      loading: false,
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/teacher/dashboard');
    });
  });

  it('redirects student users to /student/dashboard', async () => {
    mockUseAuth.mockReturnValueOnce({
      firebaseUser: { uid: 'test-uid', email: 'student@example.com' },
      role: 'student',
      loading: false,
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/student/dashboard');
    });
  });

  it('redirects reviewer users to /teacher/dashboard', async () => {
    mockUseAuth.mockReturnValueOnce({
      firebaseUser: { uid: 'test-uid', email: 'reviewer@example.com' },
      role: 'reviewer',
      loading: false,
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/teacher/dashboard');
    });
  });

  it('shows loading state while auth is loading', () => {
    mockUseAuth.mockReturnValueOnce({
      firebaseUser: null,
      role: null,
      loading: true,
    });

    render(<VerifyEmailPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
