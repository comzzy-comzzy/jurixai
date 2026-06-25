import { Copy } from "lucide-react";
import { toast } from "sonner";
import { truncateAddr } from "@/lib/format";

export function WalletAddress({
  address,
  head = 6,
  tail = 4,
  className = "",
}: {
  address: string;
  head?: number;
  tail?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(address);
        toast.success("Wallet copied", { description: address });
      }}
      className={`group inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-accent transition-colors ${className}`}
    >
      <span>{truncateAddr(address, head, tail)}</span>
      <Copy className="size-3 opacity-60 group-hover:opacity-100" />
    </button>
  );
}
