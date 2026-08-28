import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth/auth-context';
import { LocaleProvider } from '../lib/i18n/locale';
import { ThemeProvider } from '../components/theme/theme-provider';
import { ThemeToggle } from '../components/theme/theme-toggle';

export const metadata: Metadata = {
  title: 'Maths ලංකා',
  description: 'Education platform foundation',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider><LocaleProvider><AuthProvider>{children}</AuthProvider></LocaleProvider><ThemeToggle /></ThemeProvider>
      </body>
    </html>
  );
}
