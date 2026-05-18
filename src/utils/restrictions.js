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

export function getRestrictionInfo(key) {
  return RESTRICTION_INFO[key] || {
    title: key,
    description: 'Your account has a restriction, please contact support for more information.',
  };
}