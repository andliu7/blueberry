import { useEffect, useState } from "react";

interface Piece {
  id: number;
  left: number;
  color: string;
  duration: number;
  delay: number;
}

// The first stop is --bb-primary's hue (H 251.0 against the token's H 250.6),
// lightened so one value works over both grounds a burst can land on: 3.85:1 on
// the cream ground and 4.04:1 on the dark one, both over the 3:1 a meaningful
// graphic asks for. The old `#6366F1` was indigo (H 238.7).
const COLORS = ["#7e67e4", "#F59E0B", "#22C55E", "#EF4444", "#0EA5E9"];

export function Confetti({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const next = Array.from({ length: 80 }, (_, i) => ({
      id: trigger * 1000 + i,
      left: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      duration: 2 + Math.random() * 1.5,
      delay: Math.random() * 0.4,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 4200);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none fixed top-[-10px] z-[60] h-3.5 w-2 opacity-90"
          style={{
            left: `${p.left}vw`,
            background: p.color,
            animation: `confetti-fall ${p.duration}s linear forwards`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(600deg); opacity: 0.6; }
        }
      `}</style>
    </>
  );
}
