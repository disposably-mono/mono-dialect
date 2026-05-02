"use client";
// src/app/(game)/run/AbandonModal.tsx

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AbandonModal({ isOpen, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 100,
          animation: "fadeIn 150ms var(--ease) forwards",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="abandon-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg, 20px)",
          padding: "28px 28px 24px",
          width: 360,
          maxWidth: "calc(100vw - 32px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          animation: "slideUp 200ms var(--ease) forwards",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-md, 12px)",
            background: "color-mix(in srgb, #E85D5D 12%, var(--bg-3))",
            border: "1px solid color-mix(in srgb, #E85D5D 30%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 3v7M9 13.5v.5"
              stroke="#E85D5D"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="9" cy="9" r="7.5" stroke="#E85D5D" strokeWidth="1.2" />
          </svg>
        </div>

        <h2
          id="abandon-title"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 18,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            margin: "0 0 8px",
          }}
        >
          Abandon this run?
        </h2>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-muted)",
            margin: "0 0 24px",
            lineHeight: 1.6,
          }}
        >
          Your current progress and score won&apos;t be saved. This can&apos;t be undone.
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          {/* Secondary: border-color shift on hover */}
          <button
            onClick={onCancel}
            autoFocus
            style={{
              flex: 1,
              background: "var(--bg-3)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md, 12px)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              padding: "14px",
              cursor: "pointer",
              transition: "border-color 160ms var(--ease), transform 120ms var(--ease)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            Keep playing
          </button>
          {/* Primary (destructive): opacity fade on hover */}
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: "color-mix(in srgb, #E85D5D 15%, var(--bg-3))",
              border: "1px solid color-mix(in srgb, #E85D5D 40%, transparent)",
              borderRadius: "var(--radius-md, 12px)",
              color: "#E85D5D",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              padding: "14px",
              cursor: "pointer",
              transition: "opacity 160ms var(--ease), transform 120ms var(--ease)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            Abandon run
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  );
}