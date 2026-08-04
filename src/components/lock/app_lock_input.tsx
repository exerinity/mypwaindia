import { useEffect, useState } from 'react';
import type { AppLockMethod } from '../../utils/app_lock.ts';
import { EyeIcon, EyeOffIcon } from '../ui/icons.tsx';

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
const PATTERN_DOTS = Array.from({ length: 9 }, (_, i) => i);

interface AppLockInputProps {
  method: AppLockMethod;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export function AppLockInput({ method, value, onChange, autoFocus }: AppLockInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (method !== 'pin') return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') {
        if (value.length >= 8) return;
        onChange(value + e.key);
      } else if (e.key === 'Backspace') {
        onChange(value.slice(0, -1));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [method, value, onChange]);

  if (method === 'pin') {
    function pressKey(key: string) {
      if (key === 'C') { onChange(''); return; }
      if (key === '⌫') { onChange(value.slice(0, -1)); return; }
      if (value.length >= 8) return;
      onChange(value + key);
    }
    return (
      <div className="app-lock-pin">
        <div className="app-lock-pin-dots">
          {Array.from({ length: Math.max(4, value.length) }).map((_, i) => (
            <span key={i} className={`app-lock-pin-dot${i < value.length ? ' filled' : ''}`} />
          ))}
        </div>
        <div className="app-lock-keypad">
          {PAD_KEYS.map((k, i) => (
            <button
              key={i}
              type="button"
              className={`app-lock-key${k === 'C' ? ' app-lock-key-clear' : ''}`}
              onClick={() => pressKey(k)}
              aria-label={k === 'C' ? 'Clear' : undefined}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (method === 'pattern') {
    const sequence = value ? value.split('-').map(Number) : [];
    function toggleDot(i: number) {
      if (sequence.includes(i)) return;
      onChange([...sequence, i].join('-'));
    }
    return (
      <div className="app-lock-pattern">
        <div className="app-lock-pattern-grid">
          {PATTERN_DOTS.map((i) => (
            <button
              key={i}
              type="button"
              className={`app-lock-pattern-dot${sequence.includes(i) ? ' active' : ''}`}
              onClick={() => toggleDot(i)}
              aria-label={`Pattern point ${i + 1}`}
            />
          ))}
        </div>
        <button type="button" className="ghost compact" style={{ marginTop: 10 }} onClick={() => onChange('')}>
          Restart
        </button>
      </div>
    );
  }

  return (
    <div className="app-lock-password" style={{ position: 'relative' }}>
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Password"
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        className="ghost"
        onClick={() => setShowPassword((s) => !s)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 6 }}
      >
        {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
      </button>
    </div>
  );
}
