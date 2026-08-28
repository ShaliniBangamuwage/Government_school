'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import type { AppUser, UserRole } from '@edunexa/shared-types';
import { auth } from '../firebase/config';
import { ApiError, fetchWithAuth } from '../api/client';

interface StudentRegistrationData {
  fullName: string;
  email: string;
  password: string;
  grade: number;
  medium: 'Sinhala' | 'Tamil' | 'English';
  termsAccepted: boolean;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: AppUser | null;
  role: UserRole | null;
  grade: number | undefined;
  medium: 'Sinhala' | 'Tamil' | 'English' | undefined;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AppUser | null>;
  register: (studentRegistrationData: StudentRegistrationData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<AppUser | null>;
  updateCurrentProfile: (updates: Partial<AppUser> & { fullName?: string; email?: string; grade?: number; medium?: 'Sinhala' | 'Tamil' | 'English'; onboardingCompleted?: boolean }) => Promise<AppUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getFriendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (message.includes('invalid-credential') || message.includes('wrong-password') || message.includes('user-not-found')) {
    return 'Invalid email or password. Please try again.';
  }

  if (message.includes('too-many-requests')) {
    return 'Too many attempts were made. Please wait a moment and try again.';
  }

  if (message.includes('user-disabled')) {
    return 'This account has been disabled. Please contact support.';
  }

  if (message.includes('email-already-in-use')) {
    return 'This email is already in use.';
  }

  if (message.includes('weak-password')) {
    return 'Please choose a stronger password.';
  }

  if (message.includes('network')) {
    return 'A network error occurred. Please check your connection and try again.';
  }

  if (message.includes('profile could not be found')) {
    return 'Your account profile could not be found. Please contact support.';
  }

  if (error instanceof ApiError && error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

function parseProfile(response: unknown): AppUser | null {
  const profile =
    typeof response === 'object' && response && 'profile' in response && response.profile
      ? response.profile
      : typeof response === 'object' && response && 'user' in response && response.user
        ? response.user
        : response;

  if (!profile || typeof profile !== 'object' || !('id' in profile)) {
    return null;
  }

  return profile as AppUser;
}

async function loadProfileFromBackend(
  firebaseUser: User | null = auth.currentUser,
  forceRefresh = false,
): Promise<AppUser | null> {
  if (!firebaseUser) {
    return null;
  }

  const token = await firebaseUser.getIdToken(forceRefresh);
  const response = await fetchWithAuth<{ profile?: AppUser; user?: AppUser; id?: string; role?: UserRole } | AppUser>(
    '/api/auth/me',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return parseProfile(response);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [grade, setGrade] = useState<number | undefined>(undefined);
  const [medium, setMedium] = useState<'Sinhala' | 'Tamil' | 'English' | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const registrationInProgressRef = useRef(false);
  const profileRequestRef = useRef<Promise<AppUser | null> | null>(null);

  const finalizeProfileState = (currentProfile: AppUser | null) => {
    if (!currentProfile) {
      setProfile(null);
      setRole(null);
      setGrade(undefined);
      setMedium(undefined);
      return;
    }

    const nextGrade = Number.isFinite(currentProfile.grade) ? Number(currentProfile.grade) : undefined;
    const nextMedium = currentProfile.medium && ['Sinhala', 'Tamil', 'English'].includes(currentProfile.medium)
      ? currentProfile.medium
      : undefined;

    setProfile(currentProfile);
    setRole(currentProfile.role);
    setGrade(nextGrade);
    setMedium(nextMedium);
  };

  const refreshProfile = async (): Promise<AppUser | null> => {
    const user = auth.currentUser;

    if (!user) {
      setProfile(null);
      setRole(null);
      setLoading(false);
      return null;
    }

    if (profileRequestRef.current) {
      return profileRequestRef.current;
    }

    const request = (async () => {
      try {
        setLoading(true);
        setError(null);

        let currentProfile: AppUser | null = null;
        let didRetry = false;

        while (true) {
          try {
            currentProfile = await loadProfileFromBackend(auth.currentUser ?? user, didRetry);
            break;
          } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : String(caughtError ?? '');
            const status = caughtError instanceof ApiError
              ? caughtError.status
              : Number((caughtError as { status?: number } | null)?.status ?? 0) || (/(401|Unauthorized)/i.test(message) ? 401 : undefined);

            if (status === 401 && !didRetry) {
              didRetry = true;
              const refreshedUser = auth.currentUser ?? user;
              if (!refreshedUser) {
                throw caughtError;
              }
              continue;
            }

            if (status === 401) {
              setProfile(null);
              setRole(null);
              setGrade(undefined);
              setMedium(undefined);
              setError('Your session expired. Please log in again.');
              await signOut(auth);
              setFirebaseUser(null);
              return null;
            }

            throw caughtError;
          }
        }

        if (!currentProfile) {
          setProfile(null);
          setRole(null);
          setGrade(undefined);
          setMedium(undefined);
          setError('Your account profile could not be found. Please contact support.');
          return null;
        }

        finalizeProfileState(currentProfile);
        return currentProfile;
      } catch (caughtError) {
        const friendly = getFriendlyAuthError(caughtError);
        setError(friendly);
        setProfile(null);
        setRole(null);
        return null;
      } finally {
        setLoading(false);
        profileRequestRef.current = null;
      }
    })();

    profileRequestRef.current = request;
    return request;
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (nextUser) => {
      if (registrationInProgressRef.current) {
        return;
      }

      setFirebaseUser(nextUser);
      setError(null);

      if (!nextUser) {
        setProfile(null);
        setRole(null);
        setGrade(undefined);
        setMedium(undefined);
        setLoading(false);
        profileRequestRef.current = null;
        return;
      }

      if (profileRequestRef.current) {
        return;
      }

      await refreshProfile();
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<AppUser | null> => {
    setError(null);
    const credentials = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    setFirebaseUser(credentials.user);
    return refreshProfile();
  };

  const register = async (studentRegistrationData: StudentRegistrationData) => {
    setError(null);
    registrationInProgressRef.current = true;

    try {
      const credentials = await createUserWithEmailAndPassword(
        auth,
        studentRegistrationData.email.trim().toLowerCase(),
        studentRegistrationData.password,
      );

      await updateProfile(credentials.user, { displayName: studentRegistrationData.fullName.trim() });

      const freshToken = await credentials.user.getIdToken(true);

      const response = await fetchWithAuth<{ id?: string; role?: UserRole; profile?: AppUser; user?: AppUser }>(
        '/api/auth/register-profile',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${freshToken}`,
          },
          body: JSON.stringify({
            fullName: studentRegistrationData.fullName.trim(),
            email: studentRegistrationData.email.trim().toLowerCase(),
            grade: Number(studentRegistrationData.grade),
            medium: studentRegistrationData.medium,
          }),
        },
      );

      if (!response || typeof response !== 'object' || !('id' in response) && !('user' in response || 'profile' in response)) {
        throw new Error('Profile could not be created. Please try again.');
      }

      const currentProfile = await loadProfileFromBackend(credentials.user);

      if (!currentProfile) {
        throw new Error('Profile could not be found after registration.');
      }

      const nextGrade = Number.isFinite(currentProfile.grade) ? Number(currentProfile.grade) : undefined;
      const nextMedium = currentProfile.medium && ['Sinhala', 'Tamil', 'English'].includes(currentProfile.medium)
        ? currentProfile.medium
        : undefined;

      setProfile(currentProfile);
      setRole(currentProfile.role);
      setGrade(nextGrade);
      setMedium(nextMedium);
      setFirebaseUser(credentials.user);
    } finally {
      registrationInProgressRef.current = false;
    }
  };



  const logout = async () => {
    setError(null);
    profileRequestRef.current = null;
    await signOut(auth);
    setFirebaseUser(null);
    setProfile(null);
    setRole(null);
    setGrade(undefined);
    setMedium(undefined);
  };

  const updateCurrentProfile = async (
    updates: Partial<AppUser> & { fullName?: string; email?: string; grade?: number; medium?: 'Sinhala' | 'Tamil' | 'English'; onboardingCompleted?: boolean },
  ): Promise<AppUser | null> => {
    if (!auth.currentUser) {
      return null;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetchWithAuth<{ user?: AppUser; profile?: AppUser } | AppUser>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const nextProfile =
        typeof response === 'object' && response && 'user' in response && response.user
          ? response.user
          : typeof response === 'object' && response && 'profile' in response && response.profile
            ? response.profile
            : response;

      if (!nextProfile || typeof nextProfile !== 'object' || !('id' in nextProfile)) {
        throw new Error('Your profile could not be updated.');
      }

      setProfile(nextProfile as AppUser);
      setRole((nextProfile as AppUser).role);
      setGrade(Number.isFinite((nextProfile as AppUser).grade) ? Number((nextProfile as AppUser).grade) : undefined);
      setMedium((nextProfile as AppUser).medium && ['Sinhala', 'Tamil', 'English'].includes((nextProfile as AppUser).medium!)
        ? (nextProfile as AppUser).medium
        : undefined);
      return nextProfile as AppUser;
    } catch (caughtError) {
      const friendly = getFriendlyAuthError(caughtError);
      setError(friendly);
      throw new Error(friendly);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      role,
      grade,
      medium,
      loading,
      error,
      login,
      register,
      logout,
      refreshProfile,
      updateCurrentProfile,
    }),
    [firebaseUser, profile, role, grade, medium, loading, error, login, register, logout, refreshProfile, updateCurrentProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

export { getFriendlyAuthError, sendPasswordResetEmail as sendResetEmail };
