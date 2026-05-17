export const ERROR_MESSAGES = {
  1001: 'You are not signed in!',
  1002: 'You need a 2FA code...',
  1003: 'This account has been suspended',
  1004: 'Your account is frozen and is not permitted to perform this action.',
  1005: 'One of those are wrong.',
  1010: 'Invalid 2FA code',
  1013: 'Email is already verified, drama queen.',
  1014: 'You\'re not part of this transaction.',
  1015: 'Refunding this would exceed your account fund limits.',
  2001: 'Insufficient balance. Hit up IO™!',
  2002: 'Recipient does not exist',
  2003: 'You cannot transfer to yourself!',
  2005: 'Account is restricted from transactions!',
  3001: 'Payment link not found!',
  3002: 'Payment link was already claimed :(',
  3003: 'Payment link was cancelled :(',
  9003: 'MyPayIndia is in maintenance mode - stand down.',
  9004: 'Invalid input',
  9005: 'Session not found or already invalidated',
  9006: 'You are too fast, please take a rest', // https://en.wikipedia.org/wiki/Tay_(chatbot)#:~:text=You%20are%20too%20fast%2C%20please%20take%20a%20rest
};

export function describeError(err) {
  if (!err) return 'Unknown error';
  if (err.code && ERROR_MESSAGES[err.code]) return ERROR_MESSAGES[err.code];
  return err.message || 'Something went wrong...';
}