import type { Category } from '@/lib/api/profile';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './FilterPanel.css';

interface FilterPanelProps {
  city: string;
  onCityChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  categories: Category[];
  minExperience: string;
  onMinExperienceChange: (v: string) => void;
  minWorkforce: string;
  onMinWorkforceChange: (v: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

/** Directory filter row — location, contractor type, experience, workforce size. */
export default function FilterPanel({
  city,
  onCityChange,
  category,
  onCategoryChange,
  categories,
  minExperience,
  onMinExperienceChange,
  minWorkforce,
  onMinWorkforceChange,
  onClear,
  hasActiveFilters,
}: FilterPanelProps) {
  const { t } = useLanguage();

  const experienceOptions = [
    { value: '', label: t.contractors.anyExperience },
    { value: '1', label: '1+ years' },
    { value: '3', label: '3+ years' },
    { value: '5', label: '5+ years' },
    { value: '10', label: '10+ years' },
  ];

  const workforceOptions = [
    { value: '', label: t.contractors.anyWorkforce },
    { value: '10', label: '10+ workers' },
    { value: '50', label: '50+ workers' },
    { value: '100', label: '100+ workers' },
    { value: '250', label: '250+ workers' },
  ];

  return (
    <div className="filter-panel">
      <input
        type="text"
        className="filter-panel__field"
        placeholder={t.contractors.filterState}
        value={city}
        onChange={(e) => onCityChange(e.target.value)}
      />

      <select
        className="filter-panel__field"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
      >
        <option value="">{t.contractors.filterCategory}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>{c.name}</option>
        ))}
      </select>

      <select
        className="filter-panel__field"
        value={minExperience}
        onChange={(e) => onMinExperienceChange(e.target.value)}
      >
        {experienceOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        className="filter-panel__field"
        value={minWorkforce}
        onChange={(e) => onMinWorkforceChange(e.target.value)}
      >
        {workforceOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {hasActiveFilters && (
        <button type="button" className="filter-panel__clear" onClick={onClear}>
          {t.contractors.clearFilters}
        </button>
      )}
    </div>
  );
}
