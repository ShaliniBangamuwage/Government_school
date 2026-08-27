'use client';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AdminSubjectsPage from './page';

const { fetchWithAuthMock } = vi.hoisted(() => ({
  fetchWithAuthMock: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  fetchWithAuth: fetchWithAuthMock,
}));

vi.mock('@/lib/auth/route-guard', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('AdminSubjectsPage', () => {
  beforeEach(() => {
    fetchWithAuthMock.mockReset();
    fetchWithAuthMock.mockImplementation(async (url: string) => {
      if (url === '/api/admin/curriculum-access') {
        return {
          items: [
            { id: 'science-g6-english-general', officialName: 'Science', subjectId: 'science', grade: 6, medium: 'English', stream: 'General', accessEnabled: true },
            { id: 'math-g6-english-general', officialName: 'Mathematics', subjectId: 'mathematics', grade: 6, medium: 'English', stream: 'General', accessEnabled: false },
          ],
        };
      }

      if (url === '/api/admin/curriculum-access/sync') {
        return { success: true };
      }

      if (url.startsWith('/api/admin/curriculum-access/')) {
        return { id: url.split('/').at(-1), success: true };
      }

      return { items: [] };
    });
  });

  it('loads curriculum offerings and allows the admin to toggle access', async () => {
    const user = userEvent.setup();
    render(<AdminSubjectsPage />);

    expect(await screen.findByText('Science')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /disable access/i }));

    expect(fetchWithAuthMock).toHaveBeenCalledWith(
      '/api/admin/curriculum-access/science-g6-english-general',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
