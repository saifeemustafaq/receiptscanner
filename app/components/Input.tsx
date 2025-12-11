import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="input-group">
      {label && (
        <label className="input-label">
          {label}
        </label>
      )}
      <input
        className={`input-field ${error ? 'error' : ''} ${className}`}
        {...props}
      />
      {error && (
        <span className="input-error">{error}</span>
      )}
    </div>
  );
}
