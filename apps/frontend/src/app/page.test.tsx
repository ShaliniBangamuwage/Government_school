import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './(public)/page';
import { LocaleProvider } from '@/lib/i18n/locale';

describe('HomePage', () => {
  it('renders the Maths ලංකා heading', () => {
    render(<LocaleProvider><HomePage /></LocaleProvider>);
    expect(screen.getByText('Maths ලංකා')).toBeInTheDocument();
  });
});
