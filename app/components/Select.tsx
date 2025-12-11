import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export default function Select({ label, error, options, children, className = '', ...props }: SelectProps) {
  return (
    <div className="input-group">
      {label && (
        <label className="input-label">
          {label}
        </label>
      )}
      <select
        className={`input-field ${error ? 'error' : ''} ${className}`}
        style={{ cursor: 'pointer' }}
        {...props}
      >
        {options ? (
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        ) : (
          children
        )}
      </select>
      {error && (
        <span className="input-error">{error}</span>
      )}
    </div>
  );
}
