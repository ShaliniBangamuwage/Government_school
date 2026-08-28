'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { publicRegistrationRequestSchema } from '@edunexa/shared-validation';

const initialValues = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  grade: '',
  medium: 'English',
  termsAccepted: false,
};

export default function RegisterPage() {
  const router = useRouter();
  const { register: createAccount, error: authError } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof typeof initialValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
    setSubmitError(null);
  };

  const validateForm = () => {
    const payload = {
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
      grade: values.grade === '' ? undefined : Number(values.grade),
      medium: values.medium,
      termsAccepted: values.termsAccepted,
    };

    const parsed = publicRegistrationRequestSchema.safeParse(payload);

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        nextErrors[issue.path[0] as string] = issue.message;
      });
      setFieldErrors(nextErrors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createAccount({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        grade: Number(values.grade),
        medium: values.medium as 'Sinhala' | 'Tamil' | 'English',
        termsAccepted: values.termsAccepted,
      });
      router.push('/student/dashboard');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Account creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showError = submitError || authError;

  return (
    <main className="maths-symbols relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-50">
      <div aria-hidden="true" className="pointer-events-none absolute left-[7%] top-16 hidden text-8xl font-black text-cyan-500/10 lg:block">∫</div>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-16 right-[7%] hidden text-8xl font-black text-violet-400/10 lg:block">π</div>
      <div className="relative w-full max-w-xl rounded-[2rem] border border-cyan-400/30 bg-slate-900/95 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur md:p-8">
        <div className="mb-7 flex items-center gap-3">
          <img src="/profile.jpg" alt="Maths ලංකා" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-cyan-400/40" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Maths ලංකා</p>
            <p className="mt-1 text-xs text-slate-400">Learn. Explore. Excel.</p>
          </div>
        </div>
        <div className="mb-6">
          <h1 className="mt-3 text-3xl font-bold text-white">Create your account</h1>
          <p className="mt-2 text-sm text-slate-300">Start learning with a student profile.</p>
        </div>

        {showError ? (
          <div role="alert" className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {showError}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-200">Full name</label>
            <input id="fullName" value={values.fullName} onChange={(event) => handleChange('fullName', event.target.value)} aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30" placeholder="Enter your full name" />
            {fieldErrors.fullName ? <p id="fullName-error" className="mt-1 text-sm text-red-300">{fieldErrors.fullName}</p> : null}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-200">Email address</label>
            <input id="email" type="email" value={values.email} onChange={(event) => handleChange('email', event.target.value)} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30" placeholder="you@example.com" />
            {fieldErrors.email ? <p id="email-error" className="mt-1 text-sm text-red-300">{fieldErrors.email}</p> : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-200">Password</label>
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/30">
                <input id="password" type={showPassword ? 'text' : 'password'} value={values.password} onChange={(event) => handleChange('password', event.target.value)} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'password-error' : undefined} className="w-full bg-transparent px-3 py-3 text-base text-white outline-none" placeholder="Create a password" />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="px-3 py-2 text-sm font-medium text-cyan-300 hover:text-cyan-200" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {fieldErrors.password ? <p id="password-error" className="mt-1 text-sm text-red-300">{fieldErrors.password}</p> : null}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-200">Confirm password</label>
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/30">
                <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={values.confirmPassword} onChange={(event) => handleChange('confirmPassword', event.target.value)} aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined} className="w-full bg-transparent px-3 py-3 text-base text-white outline-none" placeholder="Confirm password" />
                <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="px-3 py-2 text-sm font-medium text-cyan-300 hover:text-cyan-200" aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {fieldErrors.confirmPassword ? <p id="confirmPassword-error" className="mt-1 text-sm text-red-300">{fieldErrors.confirmPassword}</p> : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="grade" className="mb-1 block text-sm font-medium text-slate-200">Grade</label>
              <select id="grade" value={values.grade} onChange={(event) => handleChange('grade', event.target.value)} aria-invalid={Boolean(fieldErrors.grade)} aria-describedby={fieldErrors.grade ? 'grade-error' : undefined} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30">
                <option value="">Select grade</option>
                {Array.from({ length: 8 }, (_, index) => index + 6).map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
              {fieldErrors.grade ? <p id="grade-error" className="mt-1 text-sm text-red-300">{fieldErrors.grade}</p> : null}
            </div>

            <div>
              <label htmlFor="medium" className="mb-1 block text-sm font-medium text-slate-200">Preferred medium</label>
              <select id="medium" value={values.medium} onChange={(event) => handleChange('medium', event.target.value)} aria-invalid={Boolean(fieldErrors.medium)} aria-describedby={fieldErrors.medium ? 'medium-error' : undefined} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30">
                <option value="Sinhala">Sinhala</option>
                <option value="Tamil">Tamil</option>
                <option value="English">English</option>
              </select>
              {fieldErrors.medium ? <p id="medium-error" className="mt-1 text-sm text-red-300">{fieldErrors.medium}</p> : null}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-200">
            <input type="checkbox" checked={values.termsAccepted} onChange={(event) => handleChange('termsAccepted', event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500" />
            <span>
              I agree to the <Link href="/terms" className="text-cyan-300 underline decoration-cyan-400 underline-offset-2">terms</Link> and <Link href="/privacy" className="text-cyan-300 underline decoration-cyan-400 underline-offset-2">privacy policy</Link>.
            </span>
          </label>
          {fieldErrors.termsAccepted ? <p className="text-sm text-red-300">{fieldErrors.termsAccepted}</p> : null}

          <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/60">
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-center text-sm text-slate-300">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-cyan-300 underline decoration-cyan-400 underline-offset-2">Log in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
