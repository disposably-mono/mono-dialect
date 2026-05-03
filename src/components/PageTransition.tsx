"use client";
// src/components/PageTransition.tsx

import { usePathname } from "next/navigation";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .page-transition {
          animation: pageIn 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
      <div key={pathname} className="page-transition">
        {children}
      </div>
    </>
  );
}
