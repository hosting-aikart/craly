'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import {
  getInternalContractor,
  updateInternalContractor,
  updateInternalContractorAvailability,
  type InternalContractor,
  type ContractorAvailability,
  type UpsertInternalContractorInput,
} from '@/lib/api/internalContractors';
import { submitForReview } from '@/lib/api/contractorRequests';
import { listCategories } from '@/lib/api/contractors';
import type { Category } from '@/lib/api/profile';
import { useContractorDraftSync, readLocalDraft } from '@/lib/hooks/useContractorDraftSync';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import '../../field-staff.css';
import '../contractor-form.css';

interface FormState {
  companyName: string;
  phone: string;
  city: string;
  yearsInBusiness: string;
  workforceCount: string;
  serviceAreas: string[];
  overseasInterest: boolean;
  categoryIds: number[];
  availability: ContractorAvailability;
  notes: string;
  description: string;
}

type RequiredKey = 'phone' | 'city' | 'yearsInBusiness' | 'workforceCount' | 'serviceAreas' | 'categories';
const REQUIRED_KEYS: RequiredKey[] = ['phone', 'city', 'yearsInBusiness', 'workforceCount', 'serviceAreas', 'categories'];

function toFormState(c: InternalContractor): FormState {
  return {
    companyName: c.company_name,
    phone: c.phone ?? '',
    city: c.city ?? '',
    yearsInBusiness: c.years_experience != null ? String(c.years_experience) : '',
    workforceCount: c.workforce_size != null ? String(c.workforce_size) : '',
    serviceAreas: c.service_areas ?? [],
    overseasInterest: c.overseas_interest,
    categoryIds: c.categories.map((cat) => cat.id),
    availability: c.availability,
    notes: c.notes ?? '',
    description: c.description ?? '',
  };
}

// Mirrors the server-side check in contractorRequestController's
// findMissingProfileFields — same required set, so the UI never shows
// "complete" for something the submit endpoint would reject.
function missingFields(form: FormState): RequiredKey[] {
  const missing: RequiredKey[] = [];
  if (!form.phone.trim()) missing.push('phone');
  if (!form.city.trim()) missing.push('city');
  if (!form.yearsInBusiness) missing.push('yearsInBusiness');
  if (!form.workforceCount) missing.push('workforceCount');
  if (form.serviceAreas.length === 0) missing.push('serviceAreas');
  if (form.categoryIds.length === 0) missing.push('categories');
  return missing;
}

const STEPS = 4;

/**
 * Mobile-first contractor data-collection form (spec §5/§6). Step-grouped,
 * sticky bottom actions, live completion %, and offline-aware autosave via
 * useContractorDraftSync. "Submit for Operations Review" only appears when
 * this contractor originated from an onboarding request (request_id) —
 * that's what the submit endpoint operates on.
 */
export default function ContractorFormPage() {
  const { t } = useLanguage();
  const ft = t.fieldStaff.profileForm;
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [contractor, setContractor] = useState<InternalContractor | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [step, setStep] = useState(0);
  const [resumedDraft, setResumedDraft] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const lastAvailabilityRef = useRef<ContractorAvailability | null>(null);

  const save = async (data: FormState) => {
    const input: UpsertInternalContractorInput = {
      companyName: data.companyName,
      phone: data.phone || undefined,
      city: data.city || undefined,
      yearsInBusiness: data.yearsInBusiness ? Number(data.yearsInBusiness) : undefined,
      workforceCount: data.workforceCount ? Number(data.workforceCount) : undefined,
      serviceAreas: data.serviceAreas,
      overseasInterest: data.overseasInterest,
      categoryIds: data.categoryIds,
      notes: data.notes || undefined,
      description: data.description || undefined,
    };
    await updateInternalContractor(id, input);
    // Tracked against the last value WE synced, not the original page-load
    // snapshot — otherwise every subsequent autosave would re-fire the
    // availability endpoint (and re-log an audit entry) even when the
    // field staff only changed an unrelated field.
    if (data.availability !== lastAvailabilityRef.current) {
      await updateInternalContractorAvailability(id, data.availability);
      lastAvailabilityRef.current = data.availability;
    }
  };

  const { status, scheduleSave, saveNow, retry } = useContractorDraftSync<FormState>(id, save);

  useEffect(() => {
    if (!id) return;
    Promise.all([getInternalContractor(id), listCategories()])
      .then(([{ data: c }, { data: cats }]) => {
        setContractor(c);
        setCategories(cats);
        lastAvailabilityRef.current = c.availability;
        const draft = readLocalDraft<FormState>(id);
        if (draft) {
          setForm(draft);
          setResumedDraft(true);
        } else {
          setForm(toFormState(c));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  };

  const addServiceArea = () => {
    const v = tagInput.trim();
    if (!v || !form || form.serviceAreas.includes(v)) { setTagInput(''); return; }
    update('serviceAreas', [...form.serviceAreas, v]);
    setTagInput('');
  };

  const removeServiceArea = (area: string) => {
    if (!form) return;
    update('serviceAreas', form.serviceAreas.filter((a) => a !== area));
  };

  const toggleCategory = (catId: number) => {
    if (!form) return;
    update('categoryIds', form.categoryIds.includes(catId) ? form.categoryIds.filter((c) => c !== catId) : [...form.categoryIds, catId]);
  };

  const missing = form ? missingFields(form) : REQUIRED_KEYS;
  const completionPct = Math.round(((REQUIRED_KEYS.length - missing.length) / REQUIRED_KEYS.length) * 100);
  const missingLabel: Record<RequiredKey, string> = {
    phone: ft.phone,
    city: ft.city,
    yearsInBusiness: ft.yearsInBusiness,
    workforceCount: ft.workforceCount,
    serviceAreas: ft.serviceAreas,
    categories: ft.categories,
  };
  const stepLabels = [ft.sectionBasic, ft.sectionBusiness, ft.sectionCategories, ft.sectionAvailability];

  const handleSubmitForReview = async () => {
    if (!contractor?.request_id || !form) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await saveNow(form);
      await submitForReview(contractor.request_id);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit for review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !form || !contractor) {
    return (
      <>
        <WorkspacePageHeader title={t.fieldStaff.nav.contractors} />
        <LoadingState label="Loading profile…" />
      </>
    );
  }

  const syncLabel: Record<string, string> = {
    saving: t.fieldStaff.sync.saving,
    saved: t.fieldStaff.sync.saved,
    saved_offline: t.fieldStaff.sync.savedOffline,
    syncing: t.fieldStaff.sync.syncing,
    synced: t.fieldStaff.sync.synced,
    sync_failed: t.fieldStaff.sync.syncFailed,
  };
  const currentSyncLabel = syncLabel[status];

  return (
    <>
      <WorkspacePageHeader
        title={contractor.company_name}
        action={
          currentSyncLabel ? (
            <span className={`fs-sync fs-sync--${status}`}>
              {currentSyncLabel}
              {status === 'sync_failed' && (
                <button type="button" className="fs-sync__retry" onClick={retry}>{t.fieldStaff.sync.retry}</button>
              )}
            </span>
          ) : undefined
        }
      />

      {resumedDraft && <p className="pf-form-resumed">{ft.resumedDraft}</p>}

      <div className="fs-completion">
        <div className="fs-completion__top">
          <strong>{ft.completion}</strong>
          <span>{completionPct}%</span>
        </div>
        <div className="fs-completion__bar">
          <div className="fs-completion__fill" style={{ width: `${completionPct}%` }} />
        </div>
        {missing.length > 0 && (
          <div className="fs-completion__missing">
            <span style={{ background: 'none', border: 'none', padding: 0, color: 'var(--craly-text-faint)' }}>{ft.missingFields}:</span>
            {missing.map((m) => <span key={m}>{missingLabel[m]}</span>)}
          </div>
        )}
        <div className="fs-status-row">
          <span className={`fs-status-badge ${contractor.verification_status === 'verified' ? 'fs-status-badge--positive' : contractor.verification_status === 'pending' ? 'fs-status-badge--pending' : ''}`}>
            {ft.verificationStatus}: {contractor.verification_status}
          </span>
          <span className={`fs-status-badge ${contractor.onboarding_complete ? 'fs-status-badge--positive' : ''}`}>
            {ft.publicationStatus}: {contractor.onboarding_complete ? ft.published : ft.notPublished}
          </span>
        </div>
      </div>

      <div className="pf-steps">
        {Array.from({ length: STEPS }).map((_, i) => (
          <div key={i} className={`pf-step-dot ${i < step ? 'pf-step-dot--done' : i === step ? 'pf-step-dot--active' : ''}`} />
        ))}
      </div>
      <p className="pf-step-label">{stepLabels[step]}</p>

      {step === 0 && (
        <div className="pf-field-group">
          <div className="pf-field pf-field--full">
            <label htmlFor="companyName">{ft.companyName}</label>
            <input id="companyName" type="text" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
          </div>
          <div className="pf-field">
            <label htmlFor="phone">{ft.phone}</label>
            <input id="phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div className="pf-field">
            <label htmlFor="city">{ft.city}</label>
            <input id="city" type="text" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="pf-field-group">
          <div className="pf-field">
            <label htmlFor="years">{ft.yearsInBusiness}</label>
            <input id="years" type="number" inputMode="numeric" min={0} value={form.yearsInBusiness} onChange={(e) => update('yearsInBusiness', e.target.value)} />
          </div>
          <div className="pf-field">
            <label htmlFor="workforce">{ft.workforceCount}</label>
            <input id="workforce" type="number" inputMode="numeric" min={0} value={form.workforceCount} onChange={(e) => update('workforceCount', e.target.value)} />
          </div>
          <div className="pf-field pf-field--full">
            <label>{ft.serviceAreas}</label>
            <div className="pf-tag-input">
              {form.serviceAreas.map((area) => (
                <span className="pf-tag" key={area}>
                  {area}
                  <button type="button" onClick={() => removeServiceArea(area)} aria-label={`Remove ${area}`}>×</button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addServiceArea(); } }}
                onBlur={addServiceArea}
                placeholder={form.serviceAreas.length === 0 ? ft.serviceAreasHint : ''}
              />
            </div>
            <span className="pf-field__hint">{ft.serviceAreasHint}</span>
          </div>
          <div className="pf-field pf-field--full pf-checkbox-row">
            <input
              type="checkbox"
              id="overseasInterest"
              checked={form.overseasInterest}
              onChange={(e) => update('overseasInterest', e.target.checked)}
            />
            <label htmlFor="overseasInterest">{ft.overseasInterest}</label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="pf-field-group">
          <div className="pf-field pf-field--full">
            <label>{ft.categories}</label>
            <div className="pf-chip-grid">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`pf-chip ${form.categoryIds.includes(c.id) ? 'pf-chip--active' : ''}`}
                  onClick={() => toggleCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="pf-field-group">
          <div className="pf-field">
            <label htmlFor="availability">{ft.availability}</label>
            <select id="availability" value={form.availability} onChange={(e) => update('availability', e.target.value as ContractorAvailability)}>
              <option value="AVAILABLE">Available</option>
              <option value="CURRENTLY_AT_CAPACITY">At Capacity</option>
              <option value="NOT_AVAILABLE">Not Available</option>
              <option value="PAUSED">Paused</option>
            </select>
          </div>
          <div className="pf-field pf-field--full">
            <label htmlFor="notes">{ft.notes}</label>
            <textarea id="notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
            <span className="pf-field__hint">{ft.notesHint}</span>
          </div>
          <div className="pf-field pf-field--full">
            <label htmlFor="description">{ft.description}</label>
            <textarea id="description" value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>
        </div>
      )}

      {submitError && <p className="auth-error">{submitError}</p>}
      {submitted && (
        <p style={{ color: 'var(--craly-teal-dark)', fontWeight: 600, marginBottom: 16 }}>
          {t.fieldStaff.requestDetail.alreadySubmitted}
        </p>
      )}

      <div className="pf-sticky-footer">
        <div className="pf-sticky-footer__nav">
          {step > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>{ft.back}</Button>
          )}
          {step < STEPS - 1 ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep((s) => s + 1)}>{ft.next}</Button>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={() => saveNow(form)}>{ft.saveDraft}</Button>
          )}
        </div>
        {step === STEPS - 1 && contractor.request_id && !submitted && (
          <Button type="button" variant="primary" size="sm" onClick={handleSubmitForReview} disabled={submitting || missing.length > 0}>
            {submitting ? '…' : ft.submitForReview}
          </Button>
        )}
      </div>
    </>
  );
}
