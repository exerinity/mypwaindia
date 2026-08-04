import { useState } from 'react';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useGlobalData } from '../../context/global_data_ctx.tsx';
import { verifyEmail } from '../../api/user.js';
import { useToast } from '../../context/toast_ctx.tsx';

export function VerificationBanner() {
  const { active } = useAuth();
  const toast = useToast();
  const [sending, setSending] = useState(false);

  const { userInfo } = useGlobalData();
  if (!active || !userInfo || userInfo.email_verified !== false) return null;

  async function send() {
    setSending(true);
    try {
      await verifyEmail(active!);
      toast.success('Verification email sent');
    } catch (e) {
      const { describeError } = await import('../../utils/errors.js');
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