'use client';

import { useEffect } from 'react';
import Button from './components/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      textAlign: 'center',
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: 'var(--black-text)',
        marginBottom: '12px',
      }}>
        Something went wrong
      </h2>
      <p style={{
        fontSize: '14px',
        color: 'var(--black-secondary)',
        marginBottom: '24px',
        maxWidth: '480px',
      }}>
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button variant="primary" onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}
