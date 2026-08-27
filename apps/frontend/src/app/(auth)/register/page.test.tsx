import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RegisterPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    register: vi.fn(),
    error: null,
  }),
}));

describe('RegisterPage', () => {
  it('renders the create account button in its initial idle state', () => {
    render(<RegisterPage />);

    const button = screen.getByRole('button', { name: /create account/i });
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent('Create account');
  });
});
