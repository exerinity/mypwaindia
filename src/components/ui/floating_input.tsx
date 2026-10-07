import React from 'react';
import { form_classes } from '../../styles/forms.stylex.ts';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  compact?: boolean;
}

export function FloatingInput({ label, id, leading, trailing, compact = false, type = 'text', className, ...props }: FloatingInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const input_class = leading && trailing ? form_classes.floating_input_leading_trailing : leading ? form_classes.floating_input_leading : trailing ? form_classes.floating_input_trailing : form_classes.floating_input;
  return (
    <div className={`mpi-float${leading ? ' has-leading' : ''}${trailing ? ' has-trailing' : ''} ${compact ? form_classes.floating_compact : form_classes.floating}`}>
      <input id={inputId} type={type} placeholder=" " className={`${input_class}${className ? ` ${className}` : ''}`} {...props} />
      <label htmlFor={inputId} className={leading ? form_classes.floating_label_leading : form_classes.floating_label}>{label}</label>
      {leading && <span className={`mpi-float-leading ${form_classes.floating_leading}`}>{leading}</span>}
      {trailing && <span className={`mpi-float-trailing ${form_classes.floating_trailing}`}>{trailing}</span>}
    </div>
  );
}

interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function FloatingTextarea({ label, id, ...props }: FloatingTextareaProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={`mpi-float ${form_classes.floating}`}>
      <textarea id={inputId} placeholder=" " className={form_classes.floating_textarea} {...props} />
      <label htmlFor={inputId} className={form_classes.floating_textarea_label}>{label}</label>
    </div>
  );
}
