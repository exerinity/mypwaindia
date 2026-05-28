import React from 'react';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FloatingInput({ label, id, ...props }: FloatingInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="mpi-float">
      <input id={inputId} placeholder=" " {...props} />
      <label htmlFor={inputId}>{label}</label>
    </div>
  );
}

interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function FloatingTextarea({ label, id, ...props }: FloatingTextareaProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="mpi-float">
      <textarea id={inputId} placeholder=" " {...props} />
      <label htmlFor={inputId}>{label}</label>
    </div>
  );
}
