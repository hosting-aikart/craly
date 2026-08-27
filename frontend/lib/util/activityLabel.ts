// Turns raw audit_logs action strings (e.g. "onboarding_request:CONTACTED",
// "contractor:updated", "availability:AVAILABLE") into a short, readable
// label for the Dashboard's recent-activity list and My Activity — shared
// so the two pages don't format the same data two different ways.
const ACTION_LABELS: Record<string, string> = {
  'onboarding_request:NEW': 'New request received',
  'onboarding_request:CONTACTED': 'Marked request contacted',
  'onboarding_request:PROFILE_IN_PROGRESS': 'Started profile',
  'onboarding_request:start_profile': 'Started profile',
  'onboarding_request:submitted_for_review': 'Submitted request for review',
  'onboarding_request:SUBMITTED_FOR_REVIEW': 'Submitted request for review',
  'onboarding_request:APPROVED': 'Request approved',
  'onboarding_request:REJECTED': 'Request rejected',
  'onboarding_request:CLOSED': 'Closed request',
  'contractor:created': 'Created contractor',
  'contractor:updated': 'Edited contractor',
  'profile:submitted_for_review': 'Submitted profile for review',
  'availability:AVAILABLE': 'Set availability: Available',
  'availability:CURRENTLY_AT_CAPACITY': 'Set availability: At Capacity',
  'availability:NOT_AVAILABLE': 'Set availability: Not Available',
  'availability:PAUSED': 'Set availability: Paused',
  'availability:SUSPENDED': 'Suspended contractor',
};

export function activityLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith('verification_status:')) return `Verification: ${action.split(':')[1]}`;
  // Fallback: turn "some_thing:VALUE" into "Some thing: value"
  const [prefix, rest] = action.split(':');
  const words = prefix.replace(/_/g, ' ');
  const label = words.charAt(0).toUpperCase() + words.slice(1);
  return rest ? `${label}: ${rest.toLowerCase().replace(/_/g, ' ')}` : label;
}
