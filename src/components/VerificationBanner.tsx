import { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useApiCall } from '../hooks/useApiCall.js';
import { getUserInfo, verifyEmail } from '../api/user.js';
import { useToast } from '../context/ToastContext.tsx';
import { describeError } from '../utils/errors.js';

export function VerificationBanner() {
  const { active } = useAuth();
  const toast = useToast();
  const [sending, setSending] = useState(false);

  const { data } = useApiCall<{ email_verified: boolean }>(
    () => getUserInfo(active!) as Promise<{ email_verified: boolean }>,
    [active?.token],
    { skip: !active }
  );
  if (!data || data.email_verified !== false) return null;

  async function send() {
    setSending(true);
    try {
      await verifyEmail(active!);
      toast.success('Verification email sent');
    } catch (e) {
      toast.error(describeError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="verification-banner">
      Please verify your email address. Once you do, your account will be fully activated and you can do everything!
      <button onClick={send} disabled={sending}>
        {sending ? 'Sending...' : 'Send email'}
      </button>
    </div>
  );
}