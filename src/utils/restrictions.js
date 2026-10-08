import { describeError } from "./errors";

export const RESTRICTION_INFO = {
  frozen: {
    title: 'Account Frozen',
    description: 'Your account is not allowed to send or receive funds and payment links',
    longDescription: 'Your account has been frozen and is unable to perform any financial activity. This includes but is not limited to: sending or receiving funds, creating or claiming payment links, and any other transaction-based actions.',
  },
  eightysixed: {
    title: 'Banned from Investment Opportunities™',
    description: 'You are not allowed to enter the Investment Opportunities™',
    longDescription: 'Your account has been barred from accessing the Investment Opportunities™. This is most likely because you have been caught attempting to cheat or exploit the Investment Opportunities™. You can still access MyPayIndia, but you will not be able to participate in any Investment Opportunities™.',
  },
  profile_banned: {
    title: 'Profile Locked',
    description: 'Your profile has been locked',
    longDescription: 'Your profile has been locked by an administrator. You cannot edit your profile or your shop. Your profile also cannot be read by other users.'
  }
};

export function getRestrictionInfo(key) {
  return RESTRICTION_INFO[key] || {
    title: key,
    description: 'Your account has a restriction',
    longDescription: 'Please contact MyPayIndia support for more information.',
  };
}
