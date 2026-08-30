import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OnboardingWizardSubtask } from '../api/flow.ts';
import { Modal } from '../components/ui/modal.tsx';
import { Skeleton, ErrorBox } from '../components/ui/status.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import { useLazyModule } from '../hooks/lazy_module.ts';
import { PlusIcon, CloseIcon, SuccessIcon, ArrowLeftIcon, ChevronRight } from '../components/ui/icons.tsx';

interface OnboardingWizardProps {
  subtask: OnboardingWizardSubtask | null;
  loading: boolean;
  error: unknown;
}

export default function FinetunePage({ subtask, loading, error }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const [step, setStep] = useState(0);
  const [accentInput, setAccentInput] = useState(settings.accent);
  const colorsMod = useLazyModule(() => import('../utils/colors.js'));
  const normalizeHex = (hex: string) => colorsMod ? colorsMod.normalizeHex(hex) : null;
  const detail = subtask?.onboarding_wizard;
  const totalSteps = detail?.steps.length ?? 0;
  const currentStep = detail?.steps[step];
  const done = Boolean(detail) && step >= totalSteps;

  function applyAccent(hex: string) {
    const norm = normalizeHex(hex);
    if (!norm) return;
    update({ accent: norm });
    setAccentInput(norm);
  }

  function next() { setStep((current) => current + 1); }
  function back() { setStep((current) => Math.max(0, current - 1)); }
  function close() { navigate('/dash', { replace: true }); }

  function renderStep() {
    if (!currentStep) return null;

    switch (currentStep.type) {
      case 'theme_picker':
        return (
          <>
            <h2 className="mt-0">{currentStep.primary_text.text}</h2>
            <p className="muted" style={{ marginTop: 0 }}>{currentStep.secondary_text.text}</p>
            <div className="btn-row">
              {currentStep.theme_options.map((option) => (
                <button
                  key={option.value}
                  className={settings.theme === option.value ? '' : 'secondary'}
                  onClick={() => update({ theme: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="mt-2">{currentStep.accent_label}</label>
            <div className="row gap-sm">
              <input
                type="color"
                value={normalizeHex(accentInput) || currentStep.accent_placeholder}
                onChange={(event) => applyAccent(event.target.value)}
              />
              <input
                type="text"
                value={accentInput}
                onChange={(event) => setAccentInput(event.target.value)}
                onBlur={() => applyAccent(accentInput)}
                placeholder={currentStep.accent_placeholder}
                style={{ maxWidth: 160 }}
              />
            </div>
          </>
        );

      case 'speed_dial': {
        const firstRoute = currentStep.route_options[0]?.value;
        return (
          <>
            <h2 className="mt-0">{currentStep.primary_text.text}</h2>
            <p className="muted" style={{ marginTop: 0 }}>{currentStep.secondary_text.text}</p>
            {settings.dashboardButtons.map((button, index) => (
              <div key={index} className="row gap-sm" style={{ marginTop: 6, alignItems: 'center', flexWrap: 'nowrap' }}>
                <select
                  value={button.route}
                  style={{ flex: 1, minWidth: 0 }}
                  onChange={(event) => {
                    const buttons = [...settings.dashboardButtons];
                    buttons[index] = { ...buttons[index], route: event.target.value };
                    update({ dashboardButtons: buttons });
                  }}
                >
                  {currentStep.route_options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select
                  value={button.style}
                  style={{ width: 130, flexShrink: 0 }}
                  aria-label={currentStep.style_label}
                  onChange={(event) => {
                    const buttons = [...settings.dashboardButtons];
                    buttons[index] = {
                      ...buttons[index],
                      style: event.target.value as 'primary' | 'secondary' | 'danger',
                    };
                    update({ dashboardButtons: buttons });
                  }}
                >
                  {currentStep.style_options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button
                  className="btn ghost"
                  style={{ padding: '0 6px', lineHeight: 0, flexShrink: 0 }}
                  aria-label={currentStep.remove_label}
                  onClick={() => update({ dashboardButtons: settings.dashboardButtons.filter((_, itemIndex) => itemIndex !== index) })}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            ))}
            <div className="row gap-sm" style={{ marginTop: 10 }}>
              {firstRoute && settings.dashboardButtons.length < currentStep.max_buttons && (
                <button
                  className="btn secondary row gap-sm"
                  onClick={() => update({
                    dashboardButtons: [...settings.dashboardButtons, { route: firstRoute, style: 'secondary' }],
                  })}
                >
                  <PlusIcon size={16} /> {currentStep.add_label}
                </button>
              )}
              <button
                className="btn ghost"
                onClick={() => update({ dashboardButtons: currentStep.default_buttons.map((button) => ({ ...button })) })}
              >
                {currentStep.reset_label}
              </button>
            </div>
          </>
        );
      }

      case 'default_page':
        return (
          <>
            <h2 className="mt-0">{currentStep.primary_text.text}</h2>
            <p className="muted" style={{ marginTop: 0 }}>{currentStep.secondary_text.text}</p>
            <select
              value={settings.homePage}
              onChange={(event) => update({ homePage: event.target.value })}
            >
              {currentStep.route_options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </>
        );

      case 'boolean_setting': {
        const inputId = `onboarding-${currentStep.setting}`;
        return (
          <>
            <h2 className="mt-0">{currentStep.primary_text.text}</h2>
            <p className="muted" style={{ marginTop: 0 }}>{currentStep.secondary_text.text}</p>
            <div className="checkbox-row">
              <input
                type="checkbox"
                id={inputId}
                checked={settings[currentStep.setting]}
                onChange={(event) => {
                  if (currentStep.setting === 'autoUpdate') update({ autoUpdate: event.target.checked });
                  else update({ autoRefresh: event.target.checked });
                }}
              />
              <label htmlFor={inputId} style={{ margin: 0 }}>{currentStep.label}</label>
            </div>
          </>
        );
      }
    }
  }

  return (
    <Modal open onClose={close}>
      {loading && !detail ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Skeleton width={140} height={14} />
          <Skeleton width={200} height={26} />
          <Skeleton width="100%" height={72} />
          <div className="modal-actions">
            <Skeleton width={90} height={38} radius={6} />
            <Skeleton width={90} height={38} radius={6} />
          </div>
        </div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : detail && !done && currentStep ? (
        <>
          <div className="row spread" style={{ marginBottom: 4 }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Step {step + 1} of {totalSteps}</span>
            <span className="muted" style={{ fontSize: '0.85rem' }}>{currentStep.progress_label}</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${((step + 1) / totalSteps) * 100}%`,
              background: 'var(--brand)',
              transition: 'width 0.2s',
            }} />
          </div>

          {renderStep()}

          <div className="modal-actions">
            <button className="secondary row gap-sm" onClick={back} disabled={step === 0}>
              <ArrowLeftIcon size={16} /> {detail.navigation.back_label}
            </button>
            <button className="row gap-sm" onClick={next}>
              {step === totalSteps - 1 ? detail.navigation.finish_label : detail.navigation.next_label}
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : detail && done ? (
        <div className="center" style={{ textAlign: 'center', padding: '12px 0' }}>
          <SuccessIcon size={40} />
          <h2>{detail.completion.primary_text.text}</h2>
          <p>{detail.completion.secondary_text.text}</p>
          <button style={{ width: '100%', marginTop: 8 }} onClick={close}>
            {detail.completion.action.label}
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
