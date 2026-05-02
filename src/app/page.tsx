// src/app/page.tsx
import Link from "next/link";
import NavWrapper from "@/components/nav/NavWrapper";

export default function HomePage() {
  return (
    <>
      <NavWrapper />
      <style>{`
        .home-root {
          min-height: calc(100vh - 52px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px 80px;
          position: relative;
          overflow: hidden;
        }

        /* Ambient background glow */
        .home-root::before {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            color-mix(in srgb, var(--accent) 8%, transparent) 0%,
            transparent 70%
          );
          top: 50%;
          left: 50%;
          transform: translate(-50%, -60%);
          pointer-events: none;
        }

        .home-inner {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 560px;
          animation: homeReveal 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes homeReveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Eyebrow */
        .home-eyebrow {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 20px;
          animation: homeReveal 600ms 60ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Wordmark */
        .home-wordmark {
          font-family: var(--font-serif, 'DM Serif Display', serif);
          font-size: clamp(44px, 8vw, 72px);
          color: var(--text-primary);
          letter-spacing: -0.03em;
          line-height: 1;
          margin: 0 0 8px;
          animation: homeReveal 600ms 100ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .home-wordmark-dash {
          color: var(--accent);
        }

        /* Description */
        .home-description {
          font-family: var(--font-sans, 'Outfit', sans-serif);
          font-size: 15px;
          color: var(--text-sec, var(--text-muted));
          line-height: 1.7;
          margin: 20px 0 0;
          max-width: 420px;
          animation: homeReveal 600ms 160ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Quote */
        .home-quote-wrap {
          margin: 32px 0 40px;
          padding: 20px 24px;
          border-left: 2px solid var(--accent);
          text-align: left;
          background: color-mix(in srgb, var(--accent) 5%, transparent);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          animation: homeReveal 600ms 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .home-quote {
          font-family: var(--font-serif, 'DM Serif Display', serif);
          font-size: 16px;
          color: var(--text-primary);
          line-height: 1.55;
          margin: 0 0 8px;
          font-style: italic;
        }

        .home-quote-attr {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.06em;
        }

        /* CTAs */
        .home-ctas {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
          animation: homeReveal 600ms 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 42px;
          padding: 0 24px;
          background: var(--accent);
          color: var(--beige, #EAF0CE);
          font-family: var(--font-sans, 'Outfit', sans-serif);
          font-size: 13px;
          font-weight: 600;
          border-radius: var(--radius-sm, 6px);
          text-decoration: none;
          letter-spacing: 0.01em;
          transition: opacity 160ms var(--ease), transform 120ms var(--ease);
        }

        .cta-primary:hover { opacity: 0.85; }
        .cta-primary:active { transform: scale(0.97); }

        .cta-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 42px;
          padding: 0 20px;
          background: none;
          color: var(--text-muted);
          font-family: var(--font-sans, 'Outfit', sans-serif);
          font-size: 13px;
          font-weight: 500;
          border-radius: var(--radius-sm, 6px);
          border: 0.5px solid var(--border);
          text-decoration: none;
          transition: color 160ms var(--ease), border-color 160ms var(--ease), transform 120ms var(--ease);
        }

        .cta-secondary:hover {
          color: var(--text-primary);
          border-color: var(--border-hover);
        }

        .cta-secondary:active { transform: scale(0.97); }

        /* Feature pills */
        .home-features {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 48px;
          animation: homeReveal 600ms 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .feature-pill {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          padding: 5px 12px;
          border: 0.5px solid var(--border);
          border-radius: 20px;
          background: var(--bg-2);
          text-transform: uppercase;
        }

        /* Footer */
        .home-footer {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          white-space: nowrap;
          animation: homeReveal 600ms 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .home-footer a {
          color: var(--accent);
          text-decoration: none;
          transition: opacity 160ms;
        }

        .home-footer a:hover { opacity: 0.7; }
      `}</style>

      <main className="home-root">
        <div className="home-inner">

          <p className="home-eyebrow">A Mono Project</p>

          <h1 className="home-wordmark">
            mono<span className="home-wordmark-dash">—</span>dialect
          </h1>

          <p className="home-description">
            A word game built around the roguelike loop — progressive difficulty,
            configurable runs, and a scoring system that rewards risk.
          </p>

          <blockquote className="home-quote-wrap">
            <p className="home-quote">
              &ldquo;The limits of my language mean the limits of my world.&rdquo;
            </p>
            <cite className="home-quote-attr">— Ludwig Wittgenstein</cite>
          </blockquote>

          <div className="home-ctas">
            <Link href="/run" className="cta-primary">
              Play now &#8594;
            </Link>
            
            <a
              href="https://disposably-mono.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-secondary"
            >
              Portfolio &#8599;
            </a>
          </div>

          <div className="home-features">
            <span className="feature-pill">Roguelike runs</span>
            <span className="feature-pill">Timed &amp; Lives modes</span>
            <span className="feature-pill">Leaderboards</span>
            <span className="feature-pill">Friends</span>
          </div>

        </div>

        <footer className="home-footer">
          Built by{" "}
          <a href="https://disposably-mono.github.io/" target="_blank" rel="noopener noreferrer">
            Mikel Taopa
          </a>
        </footer>
      </main>
    </>
  );
}
