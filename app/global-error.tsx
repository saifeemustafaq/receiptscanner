'use client';

// Inline styles required: global-error renders its own <html>/<body>, globals.css is not loaded.
// Hex values match --ivory-card, --text-muted, --golden-main, and --black-text design tokens.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        padding: '24px',
        textAlign: 'center',
        backgroundColor: '#FAF8F3', /* --ivory-card */
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: '14px', color: '#666666' /* --text-muted */, marginBottom: '24px', maxWidth: '480px' }}>
          {error.message || 'A critical error occurred.'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            backgroundColor: '#D4AF37', /* --golden-main */
            border: '2px solid #1A1A1A', /* --black-text */
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
