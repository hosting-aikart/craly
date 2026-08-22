'use client';

import { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { getMyProfile, type StaffProfile } from '@/lib/api/profile';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LoadingState from '@/components/ui/LoadingState';
import '../field-staff.css';

const ROLE_LABEL: Record<string, string> = {
  field_staff: 'Field Intelligence Staff',
  ops_head: 'Operations Head',
};

/**
 * Profile page (spec §1). Field Staff / Ops Head have no editable company
 * profile in Phase 1 — this is a read-only account summary. Editing is
 * intentionally not offered (see profileController.updateMyProfile, which
 * 400s for these roles) rather than building a form for fields the product
 * doesn't have yet.
 */
export default function FieldStaffProfilePage() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProfile()
      .then(({ data }) => setProfile(data as StaffProfile))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <WorkspacePageHeader title={t.fieldStaff.profile.title} />

      {loading ? (
        <LoadingState label="Loading profile…" />
      ) : profile ? (
        <div className="fs-section">
          <div className="fs-info-row">
            <span>Email</span>
            <span>{profile.email}</span>
          </div>
          <div className="fs-info-row">
            <span>{t.fieldStaff.profile.roleLabel}</span>
            <span>{ROLE_LABEL[profile.role] ?? profile.role}</span>
          </div>
          <div className="fs-info-row">
            <span>{t.fieldStaff.profile.memberSince}</span>
            <span>{new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
