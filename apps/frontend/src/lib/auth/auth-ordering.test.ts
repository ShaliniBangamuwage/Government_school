import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth-context';

type MockFirebaseUser = {
  uid: string;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
};

const mockUserCallback = (callback: (user: MockFirebaseUser | null) => void, value: MockFirebaseUser | null) => {
  callback(value);
  return () => {};
};

const {
  mockFetchWithAuth,
  mockCreateUserWithEmailAndPassword,
  mockSendEmailVerification,
  mockUpdateProfile,
  mockOnAuthStateChanged,
  mockSignOut,
  mockAuthState,
} = vi.hoisted(() => {
  const mockFetchWithAuth = vi.fn();
  const mockCreateUserWithEmailAndPassword = vi.fn();
  const mockSendEmailVerification = vi.fn();
  const mockUpdateProfile = vi.fn();
  const mockOnAuthStateChanged = vi.fn();
  const mockSignOut = vi.fn();
  const mockAuthState: { currentUser: MockFirebaseUser | null } = {
    currentUser: null,
  };

  return {
    mockFetchWithAuth,
    mockCreateUserWithEmailAndPassword,
    mockSendEmailVerification,
    mockUpdateProfile,
    mockOnAuthStateChanged,
    mockSignOut,
    mockAuthState,
  };
});

vi.mock('../api/client', () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}));

vi.mock('../firebase/config', () => ({
  auth: {
    get currentUser() {
      return mockAuthState.currentUser;
    },
    set currentUser(value: MockFirebaseUser | null) {
      mockAuthState.currentUser = value;
    },
    onAuthStateChanged: mockOnAuthStateChanged,
  },
}));

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  sendEmailVerification: (...args: unknown[]) => mockSendEmailVerification(...args),
  signInWithEmailAndPassword: vi.fn(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

describe('auth profile load behavior', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset();
    mockCreateUserWithEmailAndPassword.mockReset();
    mockSendEmailVerification.mockReset();
    mockUpdateProfile.mockReset();
    mockOnAuthStateChanged.mockReset();
    mockSignOut.mockReset();
    mockAuthState.currentUser = null;
    mockOnAuthStateChanged.mockImplementation((callback: (user: MockFirebaseUser | null) => void) => {
      callback(null);
      return () => {};
    });
  });

  it('does not request the profile when signed out', async () => {
    mockOnAuthStateChanged.mockImplementation((callback: (user: MockFirebaseUser | null) => void) => {
      callback(null);
      return () => {};
    });

    const wrapper = ({ children }: { children: ReactNode }) => createElement(AuthProvider, null, children);
    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(mockFetchWithAuth).not.toHaveBeenCalled();
    });
  });

  it('uses the current Firebase user token on /api/auth/me', async () => {
    const user = {
      uid: 'uid-1',
      getIdToken: vi.fn().mockResolvedValue('fresh-token'),
    };

    mockAuthState.currentUser = user;
    mockOnAuthStateChanged.mockImplementation((callback: (user: MockFirebaseUser | null) => void) => {
      callback(user);
      return () => {};
    });
    mockFetchWithAuth.mockResolvedValue({ id: 'uid-1', role: 'student' });

    const wrapper = ({ children }: { children: ReactNode }) => createElement(AuthProvider, null, children);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.profile?.id).toBe('uid-1');
    });

    expect(user.getIdToken).toHaveBeenCalledWith(false);
    expect(mockFetchWithAuth).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
        }),
      }),
    );
  });

  it('retries once with a forced refresh after an initial 401', async () => {
    const user = {
      uid: 'uid-1',
      getIdToken: vi.fn().mockResolvedValueOnce('expired-token').mockResolvedValueOnce('refreshed-token'),
    };

    mockAuthState.currentUser = user;
    mockOnAuthStateChanged.mockImplementation((callback: (user: MockFirebaseUser | null) => void) => {
      callback(user);
      return () => {};
    });
    mockFetchWithAuth
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockResolvedValueOnce({ id: 'uid-1', role: 'student' });

    const wrapper = ({ children }: { children: ReactNode }) => createElement(AuthProvider, null, children);
    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledTimes(2);
    });

    expect(user.getIdToken).toHaveBeenNthCalledWith(1, false);
    expect(user.getIdToken).toHaveBeenNthCalledWith(2, true);
    expect(mockFetchWithAuth.mock.calls[1][1]).toMatchObject({
      method: 'GET',
      headers: { Authorization: 'Bearer refreshed-token' },
    });
  });

  it('signs the user out when the retry still returns 401', async () => {
    const user = {
      uid: 'uid-1',
      getIdToken: vi.fn().mockResolvedValue('token'),
    };

    mockAuthState.currentUser = user;
    mockOnAuthStateChanged.mockImplementation((callback: (user: MockFirebaseUser | null) => void) => {
      callback(user);
      return () => {};
    });
    mockFetchWithAuth
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockRejectedValueOnce(new Error('Unauthorized'));
    mockSignOut.mockResolvedValue(undefined);

    const wrapper = ({ children }: { children: ReactNode }) => createElement(AuthProvider, null, children);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    expect(result.current.error).toBe('Your session expired. Please log in again.');
  });

  it('deduplicates simultaneous auth events into one profile request', async () => {
    const user = {
      uid: 'uid-1',
      getIdToken: vi.fn().mockResolvedValue('token'),
    };

    mockAuthState.currentUser = user;
    mockOnAuthStateChanged.mockImplementation((callback: (user: MockFirebaseUser | null) => void) => {
      callback(user);
      callback(user);
      return () => {};
    });
    mockFetchWithAuth.mockResolvedValue({ id: 'uid-1', role: 'student' });

    const wrapper = ({ children }: { children: ReactNode }) => createElement(AuthProvider, null, children);
    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledTimes(1);
    });
  });

  it('does not loop forever on repeated 401 responses', async () => {
    const user = {
      uid: 'uid-1',
      getIdToken: vi.fn().mockResolvedValue('token'),
    };

    mockAuthState.currentUser = user;
    mockOnAuthStateChanged.mockImplementation((callback: (user: MockFirebaseUser | null) => void) => {
      callback(user);
      return () => {};
    });
    mockFetchWithAuth
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockRejectedValueOnce(new Error('Unauthorized'));
    mockSignOut.mockResolvedValue(undefined);

    const wrapper = ({ children }: { children: ReactNode }) => createElement(AuthProvider, null, children);
    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledTimes(2);
    });

    expect(mockFetchWithAuth).toHaveBeenCalledTimes(2);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('fetches profile only after register-profile resolves', async () => {
    const order: string[] = [];

    const user = {
      uid: 'uid-1',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    };

    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user,
    });
    mockUpdateProfile.mockResolvedValue(undefined);
    mockSendEmailVerification.mockResolvedValue(undefined);
    mockFetchWithAuth.mockImplementation(async (url: string) => {
      order.push(url);

      if (url === '/api/auth/register-profile') {
        return { id: 'uid-1', role: 'student', profile: { id: 'uid-1', role: 'student' } };
      }

      if (url === '/api/auth/me') {
        return { id: 'uid-1', role: 'student' };
      }

      return {};
    });

    const wrapper = ({ children }: { children: ReactNode }) => createElement(AuthProvider, null, children);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await result.current.register({
      fullName: 'Test Student',
      email: 'test@example.com',
      password: 'Password123!',
      grade: 10,
      medium: 'English',
      termsAccepted: true,
    });

    await waitFor(() => {
      expect(order).toEqual(['/api/auth/register-profile', '/api/auth/me']);
    });
  });
});
