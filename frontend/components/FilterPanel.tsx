import type { Category } from '@/lib/api/profile';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import IndianStateSelect from '@/components/ui/IndianStateSelect';
import CustomSelect from '@/components/ui/CustomSelect';
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

  const categoryOptions = [
    { value: '', label: t.contractors.filterCategory },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];

  return (
    <div className="filter-panel">
      <div className="filter-panel__state-wrapper">
        <IndianStateSelect
          label=""
          placeholder={t.contractors.filterState}
          value={city}
          onChange={onCityChange}
          clearable
        />
      </div>

      <div className="filter-panel__select-wrapper">
        <CustomSelect
          className="filter-panel__custom-select"
          options={categoryOptions}
          value={category}
          onChange={onCategoryChange}
          placeholder={t.contractors.filterCategory}
        />
      </div>

      <div className="filter-panel__select-wrapper">
        <CustomSelect
          className="filter-panel__custom-select"
          options={experienceOptions}
          value={minExperience}
          onChange={onMinExperienceChange}
          placeholder={t.contractors.anyExperience}
        />
      </div>

      <div className="filter-panel__select-wrapper">
        <CustomSelect
          className="filter-panel__custom-select"
          options={workforceOptions}
          value={minWorkforce}
          onChange={onMinWorkforceChange}
          placeholder={t.contractors.anyWorkforce}
        />
      </div>

      {hasActiveFilters && (
        <button type="button" className="filter-panel__clear" onClick={onClear}>
          {t.contractors.clearFilters}
        </button>
      )}
    </div>
  );
}
