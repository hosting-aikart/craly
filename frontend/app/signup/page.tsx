'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signup } from '@/lib/api/auth';

const helmetLogo = '/assets/helmet.png';

const fieldClass =
  'flex items-center gap-2.5 rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 transition focus-within:border-[#0f766e] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(15,118,110,0.12)]';

const inputClass =
  'w-full border-none bg-transparent font-body text-[15px] text-slate-900 outline-none placeholder:text-slate-400';

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<'contractor' | 'business'>('contractor');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await signup({ email, password, role, companyName });
      // Fresh accounts always need onboarding — no need to check the profile.
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-68px)] items-center justify-center bg-gradient-to-b from-white to-slate-50 px-6 py-14">
      <div className="flex w-full max-w-[980px] overflow-hidden rounded-3xl shadow-[0_30px_80px_rgba(15,23,42,0.14)] max-md:flex-col max-md:rounded-2xl">

        {/* ── Left: dark brand panel (same language as /login) ─────── */}
        <div className="flex flex-1 basis-[380px] flex-col justify-between bg-[linear-gradient(160deg,#0f766e_0%,#0b3b38_55%,#0f172a_100%)] p-12 text-white max-md:basis-auto max-sm:p-7">
          <div>
            <div className="mb-12 flex items-center gap-2.5">
              <img src={helmetLogo} alt="" className="h-auto w-[26px]" />
              <span className="font-display text-lg font-bold">Craly</span>
            </div>

            <p className="mb-4 font-body text-[13px] font-semibold uppercase tracking-[2px] text-[#5eead4]">
              JOIN CRALY
            </p>
            <h2 className="mb-10 font-display text-[32px] font-semibold leading-[1.25]">
              Get discovered — or find who you need.
            </h2>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-[18px]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mb-2.5">
                  <path d="M5 18a7 7 0 0 1 14 0" />
                  <path d="M9 18v-2" />
                  <path d="M12 6v2" />
                  <rect x="2" y="17" width="20" height="3" rx="1" />
                </svg>
                <h4 className="mb-1 font-display text-[14.5px] font-semibold">Contractor</h4>
                <p className="text-[12.5px] leading-snug text-white/65">Build a verified profile</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-[18px]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mb-2.5">
                  <rect x="4" y="3" width="16" height="18" rx="1" />
                  <path d="M9 8h1M14 8h1M9 12h1M14 12h1" />
                  <path d="M10 21v-4h4v4" />
                </svg>
                <h4 className="mb-1 font-display text-[14.5px] font-semibold">Business</h4>
                <p className="text-[12.5px] leading-snug text-white/65">Hire with confidence</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 font-body text-[13px] text-white/65">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Your account and business details stay protected.
          </div>
        </div>

        {/* ── Right: white form panel ────────────────────────────────── */}
        <div className="flex-1 basis-[420px] bg-white p-12 max-sm:p-7">
          <p className="mb-2.5 font-body text-[13px] font-semibold uppercase tracking-[1.5px] text-[#0f766e]">
            CREATE ACCOUNT
          </p>
          <h1 className="mb-7 font-display text-[28px] font-bold text-slate-900">
            Join Craly
          </h1>

          <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
            <div className="flex gap-3 max-sm:flex-col">
              <button
                type="button"
                onClick={() => setRole('contractor')}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-4 py-4 font-body transition ${
                  role === 'contractor'
                    ? 'border-[#0f766e] bg-[#ccfbf1] text-[#0b5c56]'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#99f6e4]'
                }`}
              >
                <span className="text-[22px]">🦺</span>
                <span className="text-[13px] font-semibold">I&apos;m a Contractor</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('business')}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-4 py-4 font-body transition ${
                  role === 'business'
                    ? 'border-[#0f766e] bg-[#ccfbf1] text-[#0b5c56]'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#99f6e4]'
                }`}
              >
                <span className="text-[22px]">🏢</span>
                <span className="text-[13px] font-semibold">I&apos;m a Business</span>
              </button>
            </div>

            <label className="flex flex-col gap-2">
              <span className="font-body text-[13px] font-medium text-slate-700">Company Name</span>
              <div className={fieldClass}>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                  className={inputClass}
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-body text-[13px] font-medium text-slate-700">Email</span>
              <div className={fieldClass}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-body text-[13px] font-medium text-slate-700">Password</span>
              <div className={fieldClass}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
              </div>
            </label>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 font-body text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 rounded-[10px] bg-[linear-gradient(135deg,#0f766e_0%,#0b5c56_100%)] py-[15px] text-center font-button text-[15px] font-semibold text-white shadow-[0_14px_28px_rgba(15,118,110,0.28)] transition hover:bg-[linear-gradient(135deg,#0b5c56_0%,#0b3b38_100%)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center font-body text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#0f766e] hover:underline">
              Log in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
