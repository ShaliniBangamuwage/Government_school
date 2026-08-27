'use client';

import { render, screen } from '@testing-library/react';
import StudentSubjectsPage from './page';
import { vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  fetchWithAuth: vi.fn(async () => ({
    items: [
      { id: 'math-g6-english', subjectId: 'mathematics', grade: 6, medium: 'English', studentAccessEnabled: true },
      { id: 'math-g7-sinhala', subjectId: 'mathematics', grade: 7, medium: 'Sinhala', studentAccessEnabled: true },
    ],
  })),
}));

vi.mock('@/lib/auth/route-guard', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('StudentSubjectsPage', () => {
  it('loads Mathematics access and links to the Mathematics textbook page', async () => {
    render(<StudentSubjectsPage />);

    expect(await screen.findByText('Mathematics')).toBeInTheDocument();
    const cardLink = screen.getAllByRole('link', { name: /view textbooks/i }).find((link) =>
      link.getAttribute('href') === '/student/mathematics/textbooks',
    );

    expect(cardLink).toBeTruthy();
    expect(cardLink).toHaveAttribute('href', '/student/mathematics/textbooks');
  });
});
