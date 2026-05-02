"use client";

// src/app/leaderboard/LeaderboardClient.tsx
import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  image: string | null;
  isYou?: boolean;
  highScore: number;
  totalRuns: number;
  totalRounds: number;
  totalScore: number;
}

interface SearchResult {
  id: string;
  username: string;
  image: string | null;
  highScore: number;
  totalRuns: number;
  friendStatus: "none" | "pending_sent" | "pending_received" | "friends";
  pendingRequestId: string | null;
}

interface Props {
  globalEntries: LeaderboardEntry[];
  friendEntries: LeaderboardEntry[];
  isAuthenticated: boolean;
  currentUserId: string | null;
  pendingCount: number;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({
  image,
  username,
  size = 32,
  isYou = false,
}: {
  image: string | null;
  username: string;
  size?: number;
  isYou?: boolean;
}) {
  const initials = username.slice(0, 2).toUpperCase();
  const colors = [
    "#2A3A20", "#2A2A4A", "#3A2A1A", "#1A2A3A",
    "#3A1A2A", "#2A3A3A", "#1A3A2A", "#3A3A1A",
  ];
  const color = colors[username.charCodeAt(0) % colors.length];

  if (image) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          border: isYou ? "1.5px solid var(--accent)" : "none",
        }}
      >
        <Image src={image} alt={username} width={size} height={size} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        border: isYou ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono)",
        fontSize: size * 0.38,
        color: "var(--accent)",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Entry Row ───────────────────────────────────────────────────────────────

function EntryRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const isTop3 = entry.rank <= 3;
  const rankLabel = isTop3 ? ["#1", "#2", "#3"][entry.rank - 1] : String(entry.rank);

  return (
    <div
      className="lb-entry"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <span
        className="lb-rank"
        style={{ color: isTop3 ? "var(--highlight)" : "var(--text-muted)" }}
      >
        {rankLabel}
      </span>

      <Avatar image={entry.image} username={entry.username} isYou={entry.isYou} />

      <div className="lb-name-col">
        <Link href={`/profile/${entry.username}`} className="lb-name">
          {entry.username}
          {entry.isYou && <span className="you-tag">you</span>}
        </Link>
        <span className="lb-sub">
          {entry.totalRuns} runs · {entry.totalRounds} rounds
        </span>
      </div>

      <div className="lb-score-col">
        <span className="lb-score">{entry.highScore.toLocaleString()}</span>
        <span className="lb-score-sub">{entry.totalScore.toLocaleString()} total</span>
      </div>
    </div>
  );
}

// ─── Friend Search ────────────────────────────────────────────────────────────

function FriendSearch({ onFriendAdded }: { onFriendAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [acting, startActing] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setResult(null);
    setSearchError(null);
    setActionMsg(null);

    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (data.error === "that_is_you") {
        setSearchError("That's you!");
      } else if (!data.result) {
        setSearchError("No player found with that username or ID.");
      } else {
        setResult(data.result);
      }
    } catch {
      setSearchError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(receiverId: string) {
    startActing(async () => {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      });
      const data = await res.json();

      if (data.status === "friends") {
        setActionMsg("Now friends!");
        setResult((r) => r ? { ...r, friendStatus: "friends" } : r);
        onFriendAdded();
      } else if (data.status === "pending_sent") {
        setActionMsg("Request sent.");
        setResult((r) => r ? { ...r, friendStatus: "pending_sent" } : r);
      } else {
        setActionMsg(data.error ?? "Something went wrong.");
      }
    });
  }

  async function handleAccept(requestId: string) {
    startActing(async () => {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "accept" }),
      });
      const data = await res.json();
      if (data.status === "friends") {
        setActionMsg("Accepted! You're now friends.");
        setResult((r) => r ? { ...r, friendStatus: "friends" } : r);
        onFriendAdded();
      }
    });
  }

  function getAddButton(r: SearchResult) {
    if (r.friendStatus === "friends") {
      return <span className="friend-status-tag friends">Friends ✓</span>;
    }
    if (r.friendStatus === "pending_sent") {
      return <span className="friend-status-tag pending">Request sent</span>;
    }
    if (r.friendStatus === "pending_received" && r.pendingRequestId) {
      return (
        <button
          className="add-btn accept"
          onClick={() => handleAccept(r.pendingRequestId!)}
          disabled={acting}
        >
          {acting ? "…" : "Accept"}
        </button>
      );
    }
    return (
      <button
        className="add-btn"
        onClick={() => handleAdd(r.id)}
        disabled={acting}
      >
        {acting ? "…" : "+ Add"}
      </button>
    );
  }

  return (
    <div className="friend-search-wrap">
      <form className="friend-search-form" onSubmit={handleSearch}>
        <input
          ref={inputRef}
          className="friend-search-input"
          type="text"
          placeholder="Username or user ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className="friend-search-btn"
          type="submit"
          disabled={searching || !query.trim()}
        >
          {searching ? "…" : "Search"}
        </button>
      </form>

      {searchError && (
        <p className="search-feedback error">{searchError}</p>
      )}
      {actionMsg && (
        <p className="search-feedback success">{actionMsg}</p>
      )}

      {result && (
        <div className="search-result-card">
          <Avatar image={result.image} username={result.username} size={36} />
          <div className="search-result-info">
            <Link href={`/profile/${result.username}`} className="search-result-name">
              {result.username}
            </Link>
            <span className="search-result-sub">
              {result.highScore > 0
                ? `${result.highScore.toLocaleString()} pts · ${result.totalRuns} runs`
                : "No runs yet"}
            </span>
          </div>
          <div className="search-result-action">{getAddButton(result)}</div>
        </div>
      )}
    </div>
  );
}

// ─── Pending Requests Banner ──────────────────────────────────────────────────

function PendingRequests({
  count,
  onRespond,
}: {
  count: number;
  onRespond: () => void;
}) {
  const [requests, setRequests] = useState<
    { requestId: string; sender: { id: string; username: string; image: string | null; highScore: number } }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [acting, startActing] = useTransition();

  async function load() {
    const res = await fetch("/api/friends/requests");
    const data = await res.json();
    setRequests(data.requests ?? []);
    setOpen(true);
  }

  async function respond(requestId: string, action: "accept" | "reject") {
    startActing(async () => {
      await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      if (action === "accept") onRespond();
    });
  }

  if (count === 0) return null;

  return (
    <div className="pending-banner">
      <button className="pending-banner-btn" onClick={open ? () => setOpen(false) : load}>
        <span className="pending-dot" />
        {count} pending friend request{count > 1 ? "s" : ""}
        <span className="pending-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && requests.length > 0 && (
        <div className="pending-list">
          {requests.map((r) => (
            <div key={r.requestId} className="pending-row">
              <Avatar image={r.sender.image} username={r.sender.username} size={28} />
              <Link href={`/profile/${r.sender.username}`} className="pending-name">
                {r.sender.username}
              </Link>
              <div className="pending-actions">
                <button
                  className="add-btn accept small"
                  onClick={() => respond(r.requestId, "accept")}
                  disabled={acting}
                >
                  Accept
                </button>
                <button
                  className="add-btn reject small"
                  onClick={() => respond(r.requestId, "reject")}
                  disabled={acting}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeaderboardClient({
  globalEntries,
  friendEntries: initialFriendEntries,
  isAuthenticated,
  currentUserId,
  pendingCount: initialPendingCount,
}: Props) {
  const [tab, setTab] = useState<"global" | "friends">("global");
  const [friendEntries, setFriendEntries] = useState(initialFriendEntries);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const router = useRouter();

  function refreshFriends() {
    router.refresh();
  }

  const entries = tab === "global" ? globalEntries : friendEntries;
  const hasFriends = friendEntries.filter((e) => !e.isYou).length > 0;

  return (
    <>
      <style>{`
        .lb-page {
          max-width: var(--max-w, 960px);
          margin: 0 auto;
          padding: 32px 24px 80px;
        }

        .lb-header-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .lb-page-title {
          font-family: var(--font-serif, 'DM Serif Display', serif);
          font-size: 28px;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .lb-tabs {
          display: flex;
          gap: 2px;
          background: var(--bg-2);
          padding: 3px;
          border-radius: var(--radius-sm);
        }

        .lb-tab-btn {
          font-family: var(--font-sans, 'Outfit', sans-serif);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          padding: 5px 14px;
          border-radius: 4px;
          border: none;
          background: none;
          cursor: pointer;
          transition: color 120ms, background 120ms;
          white-space: nowrap;
        }

        .lb-tab-btn:hover { color: var(--text-sec); }
        .lb-tab-btn.active {
          background: var(--bg-3);
          color: var(--text-primary);
        }

        /* friend search */
        .friend-search-wrap {
          margin-bottom: 20px;
        }

        .friend-search-form {
          display: flex;
          gap: 8px;
        }

        .friend-search-input {
          flex: 1;
          height: 38px;
          background: var(--bg-2);
          border: 0.5px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 12px;
          padding: 0 12px;
          outline: none;
          transition: border-color 160ms;
        }

        .friend-search-input:focus {
          border-color: var(--border-hover);
        }

        .friend-search-input::placeholder { color: var(--text-muted); }

        .friend-search-btn {
          height: 38px;
          padding: 0 16px;
          background: var(--bg-3);
          border: 0.5px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-family: var(--font-sans, 'Outfit', sans-serif);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 160ms;
          white-space: nowrap;
        }

        .friend-search-btn:hover:not(:disabled) { opacity: 0.8; }
        .friend-search-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .search-feedback {
          font-size: 11px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          margin-top: 8px;
        }

        .search-feedback.error { color: #E57373; }
        .search-feedback.success { color: var(--accent); }

        .search-result-card {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
          padding: 12px 14px;
          background: var(--bg-2);
          border: 0.5px solid var(--border-hover);
          border-radius: var(--radius-sm);
          animation: slideDown 160ms ease forwards;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .search-result-info { flex: 1; min-width: 0; }
        .search-result-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          text-decoration: none;
          display: block;
        }
        .search-result-name:hover { color: var(--accent); }
        .search-result-sub {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono, 'DM Mono', monospace);
        }

        .search-result-action { flex-shrink: 0; }

        .add-btn {
          height: 30px;
          padding: 0 14px;
          background: var(--accent);
          border: none;
          border-radius: 4px;
          color: var(--beige, #EAF0CE);
          font-family: var(--font-sans, 'Outfit', sans-serif);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 160ms;
        }

        .add-btn:hover:not(:disabled) { opacity: 0.82; }
        .add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .add-btn.accept { background: var(--accent); }
        .add-btn.reject { background: var(--bg-3); color: var(--text-muted); border: 0.5px solid var(--border); }
        .add-btn.small { height: 26px; font-size: 11px; padding: 0 10px; }

        .friend-status-tag {
          font-size: 11px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          padding: 4px 10px;
          border-radius: 4px;
        }

        .friend-status-tag.friends { color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
        .friend-status-tag.pending { color: var(--text-muted); background: var(--bg-3); }

        /* pending banner */
        .pending-banner {
          margin-bottom: 16px;
        }

        .pending-banner-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          color: var(--highlight, #C8A84B);
          background: color-mix(in srgb, var(--highlight, #C8A84B) 8%, transparent);
          border: 0.5px solid color-mix(in srgb, var(--highlight, #C8A84B) 25%, transparent);
          border-radius: var(--radius-sm);
          padding: 8px 14px;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: opacity 160ms;
        }

        .pending-banner-btn:hover { opacity: 0.85; }

        .pending-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--highlight, #C8A84B);
          flex-shrink: 0;
        }

        .pending-chevron { margin-left: auto; font-size: 9px; }

        .pending-list {
          margin-top: 6px;
          background: var(--bg-2);
          border: 0.5px solid var(--border);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .pending-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-bottom: 0.5px solid var(--border);
        }

        .pending-row:last-child { border-bottom: none; }

        .pending-name {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          text-decoration: none;
        }
        .pending-name:hover { color: var(--accent); }

        .pending-actions { display: flex; gap: 6px; }

        /* leaderboard list */
        .lb-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .lb-entry {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 0;
          border-bottom: 0.5px solid var(--border);
          animation: fadeSlide 200ms ease backwards;
        }

        .lb-entry:last-child { border-bottom: none; }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .lb-rank {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 13px;
          width: 28px;
          text-align: center;
          flex-shrink: 0;
        }

        .lb-name-col { flex: 1; min-width: 0; }

        .lb-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .lb-name:hover { color: var(--accent); }

        .you-tag {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px;
          color: var(--accent);
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          padding: 1px 6px;
          border-radius: 3px;
        }

        .lb-sub {
          display: block;
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono, 'DM Mono', monospace);
          margin-top: 1px;
        }

        .lb-score-col { text-align: right; }

        .lb-score {
          display: block;
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 14px;
          font-weight: 500;
          color: var(--accent);
        }

        .lb-score-sub {
          display: block;
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 1px;
        }

        /* empty state */
        .empty-state {
          padding: 48px 0;
          text-align: center;
        }

        .empty-state-icon {
          font-size: 32px;
          margin-bottom: 12px;
          opacity: 0.4;
        }

        .empty-state-title {
          font-family: var(--font-serif, 'DM Serif Display', serif);
          font-size: 18px;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .empty-state-sub {
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono, 'DM Mono', monospace);
        }

        /* sign-in prompt */
        .signin-prompt {
          padding: 32px 0;
          text-align: center;
        }

        .signin-prompt p {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .signin-link {
          display: inline-block;
          padding: 8px 20px;
          background: var(--beige, #EAF0CE);
          color: var(--graphite, #34312D);
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          transition: opacity 160ms;
        }

        .signin-link:hover { opacity: 0.88; }

        /* section label */
        .section-label {
          font-size: 10px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          color: var(--text-muted);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
      `}</style>

      <main className="lb-page">
        {/* Header */}
        <div className="lb-header-row">
          <h1 className="lb-page-title">Leaderboard</h1>
          <div className="lb-tabs">
            <button
              className={`lb-tab-btn ${tab === "global" ? "active" : ""}`}
              onClick={() => setTab("global")}
            >
              Global top 100
            </button>
            <button
              className={`lb-tab-btn ${tab === "friends" ? "active" : ""}`}
              onClick={() => setTab("friends")}
            >
              Friends
              {pendingCount > 0 && (
                <span
                  style={{
                    display: "inline-block",
                    marginLeft: 6,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--highlight, #C8A84B)",
                    verticalAlign: "middle",
                  }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Friends tab */}
        {tab === "friends" && (
          <>
            {!isAuthenticated ? (
              <div className="signin-prompt">
                <p>Sign in to see your friends leaderboard and add players.</p>
                <Link href="/api/auth/signin" className="signin-link">
                  Sign in
                </Link>
              </div>
            ) : (
              <>
                {pendingCount > 0 && (
                  <PendingRequests count={pendingCount} onRespond={refreshFriends} />
                )}

                <div className="section-label">Find players</div>
                <FriendSearch onFriendAdded={refreshFriends} />

                {hasFriends ? (
                  <>
                    <div className="section-label" style={{ marginTop: 24 }}>
                      Friends ranking
                    </div>
                    <div className="lb-list">
                      {friendEntries.map((entry, i) => (
                        <EntryRow key={entry.userId} entry={entry} index={i} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">⬛</div>
                    <div className="empty-state-title">No friends yet</div>
                    <p className="empty-state-sub">
                      Add players above to see how you stack up.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Global tab */}
        {tab === "global" && (
          <>
            {globalEntries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⬛</div>
                <div className="empty-state-title">No runs yet</div>
                <p className="empty-state-sub">
                  Complete a roguelike run to appear here.
                </p>
              </div>
            ) : (
              <div className="lb-list">
                {globalEntries.map((entry, i) => (
                  <EntryRow key={entry.userId} entry={entry} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
