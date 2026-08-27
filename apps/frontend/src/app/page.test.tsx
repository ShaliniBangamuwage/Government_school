import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './(public)/page';

describe('HomePage', () => {
  it('renders the EduNexa heading', () => {
    render(<HomePage />);
    expect(screen.getByText('EduNexa')).toBeInTheDocument();
  });
});
