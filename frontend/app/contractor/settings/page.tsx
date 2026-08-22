'use client';

import { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { useAuth } from '@/lib/auth/useAuth';
import { getMyProfile, type StaffProfile } from '@/lib/api/profile';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/language/LanguageSelector';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import '../field-staff.css';

/**
 * Settings (spec §1). Kept intentionally minimal — language preference
 * (via the existing LanguageContext/i18n architecture, spec §16) plus
 * account/logout. No invented settings the product doesn't have yet.
 */
export default function FieldStaffSettingsPage() {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<StaffProfile | null>(null);

  useEffect(() => {
    getMyProfile()
      .then(({ data }) => setProfile(data as StaffProfile))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      <WorkspacePageHeader title={t.fieldStaff.settings.title} />

      <div className="fs-section">
        <h2>{t.fieldStaff.settings.languageSection}</h2>
        <LanguageSelector variant="header" />
      </div>

      <div className="fs-section">
        <h2>{t.fieldStaff.settings.accountSection}</h2>
        {profile && (
          <div className="fs-info-row">
            <span>Email</span>
            <span>{profile.email}</span>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            {t.nav.logout}
          </Button>
        </div>
      </div>
    </>
  );
}
