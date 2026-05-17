export function getDisplayName(account, mode) {
  if (!account) return '';
  if (mode === 'first_name') return account.firstName || account.username;
  if (mode === 'full_name') {
    const full = [account.firstName, account.lastName].filter(Boolean).join(' ');
    return full || account.username;
  }
  return account.username;
}
