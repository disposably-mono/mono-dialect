"use client";

// src/app/profile/[username]/ProfileClient.tsx
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  username: string;
  image: string | null;
  joinedAt: string;
  isYou: boolean;
  isAuthenticated: boolean;
  friendStatus: "none" | "pending_sent" | "pending_received" | "friends";
  pendingRequestId: string | null;
  globalRank: number | null;
  rogue: {
    highScore: number;
    totalRuns: number;
    totalRounds: number;
    totalScore: number;
  };
}

interface Friend {
  id: string;
  username: string;
  image: string | null;
  highScore: number;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({
  image,
  username,
  size = 56,
}: {
  image: string | null;
  username: string;
  size?: number;
}) {
  const colors = [
    "#2A3A20", "#2A2A4A", "#3A2A1A", "#1A2A3A",
    "#3A1A2A", "#2A3A3A", "#1A3A2A", "#3A3A1A",
  ];
  const color = colors[username.charCodeAt(0) % colors.length];
  const initials = username.slice(0, 2).toUpperCase();

  if (image) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          border: "1.5px solid var(--accent)",
        }}
      >
        <img src={image} alt={username} width={size} height={size} style={{ display: "block" }} />
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
        border: "1.5px solid var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-serif, 'DM Serif Display', serif)",
        fontSize: size * 0.38,
        color: "var(--accent)",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Friend Button ────────────────────────────────────────────────────────────

function FriendButton({
  profileId,
  username,
  initialStatus,
  pendingRequestId,
}: {
  profileId: string;
  username: string;
  initialStatus: Profile["friendStatus"];
  pendingRequestId: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [msg, setMsg] = useState<string | null>(null);
  const [acting, startActing] = useTransition();
  const router = useRouter();

  async function handleAdd() {
    startActing(async () => {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: profileId }),
      });
      const data = await res.json();
      if (data.status === "friends") { setStatus("friends"); router.refresh(); }
      else if (data.status === "pending_sent") setStatus("pending_sent");
      else setMsg(data.error ?? "Failed");
    });
  }

  async function handleAccept() {
    if (!pendingRequestId) return;
    startActing(async () => {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: pendingRequestId, action: "accept" }),
      });
      const data = await res.json();
      if (data.status === "friends") { setStatus("friends"); router.refresh(); }
    });
  }

  async function handleRemove() {
    startActing(async () => {
      const res = await fetch(`/api/friends/${profileId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status === "removed") { setStatus("none"); router.refresh(); }
    });
  }

  if (status === "friends") {
    return (
      <div className="friend-btn-wrap">
        <span className="friend-tag friends">Friends ✓</span>
        <button className="unfriend-btn" onClick={handleRemove} disabled={acting}>
          {acting ? "…" : "Remove"}
        </button>
      </div>
    );
  }
  if (status === "pending_sent") return <span className="friend-tag pending">Request sent</span>;
  if (status === "pending_received") {
    return (
      <button className="action-btn" onClick={handleAccept} disabled={acting}>
        {acting ? "…" : `Accept ${username}'s request`}
      </button>
    );
  }
  return (
    <div>
      <button className="action-btn" onClick={handleAdd} disabled={acting}>
        {acting ? "…" : "+ Add friend"}
      </button>
      {msg && <p className="action-msg">{msg}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileClient({
  profile,
  friends,
}: {
  profile: Profile;
  friends: Friend[];
}) {
  const joinedDate = new Date(profile.joinedAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        .profile-page {
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 24px 80px;
        }
        .profile-header {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 32px;
          padding-bottom: 28px;
          border-bottom: 0.5px solid var(--border);
        }
        .profile-meta { flex: 1; min-width: 0; }
        .profile-username {
          font-family: var(--font-serif, 'DM Serif Display', serif);
          font-size: 26px;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }
        .profile-handle {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .profile-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 14px;
        }
        .profile-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          padding: 3px 8px;
          border-radius: 4px;
          border: 0.5px solid var(--border);
          color: var(--text-muted);
        }
        .profile-badge.rank {
          color: var(--highlight, #C8A84B);
          border-color: color-mix(in srgb, var(--highlight, #C8A84B) 30%, transparent);
          background: color-mix(in srgb, var(--highlight, #C8A84B) 8%, transparent);
        }
        .action-btn {
          height: 32px;
          padding: 0 16px;
          background: var(--accent);
          border: none;
          border-radius: var(--radius-sm);
          color: var(--beige, #EAF0CE);
          font-family: var(--font-sans, 'Outfit', sans-serif);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 160ms;
        }
        .action-btn:hover:not(:disabled) { opacity: 0.82; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .friend-btn-wrap { display: flex; align-items: center; gap: 8px; }
        .friend-tag {
          font-size: 11px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          padding: 4px 10px;
          border-radius: 4px;
        }
        .friend-tag.friends {
          color: var(--accent);
          background: color-mix(in srgb, var(--accent) 12%, transparent);
        }
        .friend-tag.pending { color: var(--text-muted); background: var(--bg-3); }
        .unfriend-btn {
          font-size: 11px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          color: var(--text-muted);
          background: none;
          border: 0.5px solid var(--border);
          border-radius: 4px;
          padding: 4px 10px;
          cursor: pointer;
          transition: color 160ms, border-color 160ms;
        }
        .unfriend-btn:hover { color: #E57373; border-color: #E57373; }
        .action-msg {
          font-size: 11px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          color: #E57373;
          margin-top: 6px;
        }
        .section-label {
          font-size: 10px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          color: var(--text-muted);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .rogue-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 28px;
        }
        .rogue-card {
          background: var(--bg-2);
          border: 0.5px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .rogue-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          border: 0.5px solid color-mix(in srgb, var(--accent) 30%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 14px;
        }
        .rogue-val {
          display: block;
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 18px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .rogue-label {
          display: block;
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .friends-list { margin-bottom: 28px; }
        .friend-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 0.5px solid var(--border);
        }
        .friend-row:last-child { border-bottom: none; }
        .friend-name {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          text-decoration: none;
        }
        .friend-name:hover { color: var(--accent); }
        .friend-score {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 13px;
          color: var(--accent);
        }
        .empty-friends {
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono, 'DM Mono', monospace);
          padding: 16px 0;
        }
        @media (max-width: 600px) {
          .rogue-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <main className="profile-page">
        {/* Header */}
        <div className="profile-header">
          <Avatar image={profile.image} username={profile.username} size={60} />
          <div className="profile-meta">
            <h1 className="profile-username">{profile.username}</h1>
            <p className="profile-handle">joined {joinedDate}</p>
            <div className="profile-badges">
              {profile.globalRank && (
                <span className="profile-badge rank">#{profile.globalRank} global</span>
              )}
              {profile.isYou && (
                <span className="profile-badge">your profile</span>
              )}
            </div>
            {!profile.isYou && profile.isAuthenticated && (
              <FriendButton
                profileId={profile.id}
                username={profile.username}
                initialStatus={profile.friendStatus}
                pendingRequestId={profile.pendingRequestId}
              />
            )}
            {!profile.isAuthenticated && (
              <Link href="/api/auth/signin" className="action-btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Sign in to add friend
              </Link>
            )}
          </div>
        </div>

        {/* Roguelike stats */}
        <div className="section-label">Roguelike</div>
        <div className="rogue-grid">
          <div className="rogue-card">
            <div className="rogue-icon">⭐</div>
            <div>
              <span className="rogue-val" style={{ color: "var(--highlight, #C8A84B)" }}>
                {profile.rogue.highScore.toLocaleString()}
              </span>
              <span className="rogue-label">high score</span>
            </div>
          </div>
          <div className="rogue-card">
            <div className="rogue-icon">🎮</div>
            <div>
              <span className="rogue-val">{profile.rogue.totalRuns}</span>
              <span className="rogue-label">total runs</span>
            </div>
          </div>
          <div className="rogue-card">
            <div className="rogue-icon">✓</div>
            <div>
              <span className="rogue-val">{profile.rogue.totalRounds}</span>
              <span className="rogue-label">rounds won</span>
            </div>
          </div>
          <div className="rogue-card">
            <div className="rogue-icon">📈</div>
            <div>
              <span className="rogue-val" style={{ color: "var(--accent)" }}>
                {profile.rogue.totalScore > 999
                  ? `${(profile.rogue.totalScore / 1000).toFixed(1)}k`
                  : profile.rogue.totalScore}
              </span>
              <span className="rogue-label">total score</span>
            </div>
          </div>
        </div>

        {/* Friends */}
        <div className="section-label">Friends ({friends.length})</div>
        <div className="friends-list">
          {friends.length === 0 ? (
            <p className="empty-friends">No friends yet.</p>
          ) : (
            friends.map((f) => (
              <div key={f.id} className="friend-row">
                <Avatar image={f.image} username={f.username} size={28} />
                <Link href={`/profile/${f.username}`} className="friend-name">
                  {f.username}
                </Link>
                {f.highScore > 0 && (
                  <span className="friend-score">{f.highScore.toLocaleString()}</span>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
