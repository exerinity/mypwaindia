export const RESTRICTION_INFO = {
  frozen: {
    title: 'Account Frozen',
    description: 'Your account is not allowed to send or receive funds and payment links',
    longDescription: 'Your account has been frozen and is unable to perform any financial activity. This includes but is not limited to: sending or receiving funds, creating or claiming payment links, and any other transaction-based actions.',
  },
  eightysixed: {
    title: 'Banned from Investment Opportunities™',
    description: 'You are not allowed to enter the Investment Opportunities™',
    longDescription: 'Your account has been barred from accessing the Investment Opportunities™. This is most likely because you have been caught attempting to cheat or exploit the games. You can still access and use all other features of MyPayIndia, but you will not be able to participate in any Investment Opportunities™.',
  },
};

export function getRestrictionInfo(key) {
  return RESTRICTION_INFO[key] || {
    title: key,
    description: 'Your account has a restriction, please contact support for more information.',
    longDescription: 'An unrecognised restriction has been applied to your account. Full details are not available in this app - please contact MyPayIndia support.',
  };
}
