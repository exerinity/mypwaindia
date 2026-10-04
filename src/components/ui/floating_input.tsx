import React from 'react';
import { form_classes } from '../../styles/forms.stylex.ts';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  trailing?: React.ReactNode;
}

export function FloatingInput({ label, id, trailing, type = 'text', ...props }: FloatingInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={`mpi-float${trailing ? ' has-trailing' : ''} ${form_classes.floating}`}>
      <input id={inputId} type={type} placeholder=" " className={trailing ? form_classes.floating_input_trailing : form_classes.floating_input} {...props} />
      <label htmlFor={inputId} className={form_classes.floating_label}>{label}</label>
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
