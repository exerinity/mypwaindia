// The official list of ways the platform can ruin your day.
// Add new restrictions here and they'll automatically render correctly
// wherever restrictions are displayed.

export const RESTRICTION_INFO = {
  frozen: {
    title: 'Account Frozen',
    description: 'Your account is not allowed to send or receive funds and payment links',
  },
  eightysixed: {
    title: 'Banned from Investment Opportunities™',
    description: 'You are not allowed to enter the Investment Opportunities™',
  },
};

// Fallback for any restriction the backend invents that we haven't catalogued yet.
export function getRestrictionInfo(key) {
  return RESTRICTION_INFO[key] || {
    title: key,
    description: 'Your account has a restriction',
  };
}