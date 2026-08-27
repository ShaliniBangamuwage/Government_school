'use client';

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import StudentMathematicsTextbooksPage from './page';

const { mockedFetchWithAuth } = vi.hoisted(() => ({
  mockedFetchWithAuth: vi.fn(async () => ({
    items: [
      {
        id: 'math-g8-sinhala',
        grade: 8,
        medium: 'Sinhala',
        title: 'Grade 8 Mathematics',
        verificationStatus: 'verified',
        accessEnabled: true,
        sourceUrl: 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=342',
        officialCourseUrl: 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=999',
      },
    ],
  })),
}));

vi.mock('@/lib/api/client', () => ({
  fetchWithAuth: mockedFetchWithAuth,
}));

vi.mock('@/lib/auth/route-guard', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ profile: { role: 'student', grade: 8, medium: 'Sinhala' } }),
}));

describe('StudentMathematicsTextbooksPage', () => {
  it('renders the exact official course URL for the open collection button', async () => {
    render(<StudentMathematicsTextbooksPage />);

    const collectionLink = await screen.findByRole('link', { name: 'Open collection' });
    const expectedUrl = 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=342';

    expect(collectionLink).toHaveAttribute('href', expectedUrl);
    expect(collectionLink).toHaveAttribute('target', '_blank');
    expect(collectionLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
