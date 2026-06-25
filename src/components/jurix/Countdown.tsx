import { useEffect, useState } from "react";
import { countdown } from "@/lib/format";

export function Countdown({ to, className = "" }: { to: string; className?: string }) {
  const [text, setText] = useState(() => countdown(to));
  useEffect(() => {
    const i = setInterval(() => setText(countdown(to)), 30_000);
    return () => clearInterval(i);
  }, [to]);
  return <span className={`font-mono text-warn ${className}`}>{text}</span>;
}
