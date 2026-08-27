'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createContractorRequest } from '@/lib/api/contractorRequests';
import Button from '@/components/ui/Button';
import PhoneInput from '@/components/ui/PhoneInput';
import '@/components/AuthForm.css';
import './list-your-company.css';

/**
 * Public contractor onboarding entry point — the ONLY one in Phase 1.
 * Deliberately does not touch auth: no signup, no password, no users row,
 * no dashboard redirect. This just files a lead for Field Staff to act on
 * (see /contractor/requests).
 */
export default function ListYourCompanyPage() {
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [industry, setIndustry] = useState('');
  const [workforceCount, setWorkforceCount] = useState('');
  const [skills, setSkills] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await createContractorRequest({
        companyName,
        contactPerson,
        phone,
        email: email || undefined,
        city,
        industry,
        workforceCount: workforceCount ? Number(workforceCount) : undefined,
        skills: skills || undefined,
        yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
        message: message || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="list-company-page">
        <div className="list-company-success">
          <div className="list-company-success__icon">✓</div>
          <h1>Request submitted successfully</h1>
          <p>Our team will contact you for verification and onboarding.</p>
          <Button href="/" variant="secondary">Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="list-company-page">
      <div className="list-company-page__inner">
        <p className="list-company-page__eyebrow">FOR CONTRACTORS</p>
        <h1 className="list-company-page__heading">List Your Company</h1>
        <p className="list-company-page__subtext">
          Get discovered by manufacturers looking for verified workforce partners. Submit your
          details below — there&apos;s no account or password to create. Our team will contact you
          directly for verification and onboarding.
        </p>

        <form className="auth-form list-company-form" onSubmit={handleSubmit}>
          <div className="auth-row">
            <label className="auth-field">
              <span>Company / Contractor Name *</span>
              <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Sharma Labour Contractors" />
            </label>
            <label className="auth-field">
              <span>Contact Person *</span>
              <input type="text" required value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="e.g. Rahul Sharma" />
            </label>
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <span>Phone Number *</span>
              <PhoneInput value={phone} onChange={setPhone} required />
            </div>
            <label className="auth-field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </label>
          </div>

          <div className="auth-row">
            <label className="auth-field">
              <span>City *</span>
              <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Nagpur" />
            </label>
            <label className="auth-field">
              <span>Industry *</span>
              <input type="text" required value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Industrial Labour" />
            </label>
          </div>

          <div className="auth-row">
            <label className="auth-field">
              <span>Number of Workers</span>
              <input type="number" min={0} value={workforceCount} onChange={(e) => setWorkforceCount(e.target.value)} placeholder="e.g. 50" />
            </label>
            <label className="auth-field">
              <span>Years of Experience</span>
              <input type="number" min={0} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="e.g. 8" />
            </label>
          </div>

          <label className="auth-field">
            <span>Skills / Services</span>
            <input type="text" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Welding, electrical, general labour" />
          </label>

          <label className="auth-field">
            <span>Additional Message</span>
            <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Anything else we should know?" />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Request to Join Craly'}
          </button>
        </form>

        <p className="list-company-page__footer">
          Looking to hire contractors instead? <Link href="/signup">Sign up as a manufacturer</Link>.
        </p>
      </div>
    </div>
  );
}
