import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, Heart } from "lucide-react";
import { useState } from "react";

const WALLETS = [
  {
    label: "ICP",
    address: "jmh3u-uokam-yrnes-etebe-ydnrg-5ommf-n7prp-it2js-2qsfk-vcptw-gae",
  },
  {
    label: "BTC",
    address: "bc1qpsutp65mth33uagq82w6tcehe9jdjhnehlkx8h",
  },
  {
    label: "ETH",
    address: "0x3A709682504e2C9498B8A902C9bB7C5B8Bc598Ff",
  },
  {
    label: "SOL",
    address: "GYqyR18NBa2JWpx7N6PfEMnKuiw3owXXo3a72hNyko87",
  },
];

interface DonateICPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DonateICPDialog({
  open,
  onOpenChange,
}: DonateICPDialogProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (address: string, index: number) => {
    await navigator.clipboard.writeText(address);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border border-border text-foreground max-w-md z-[1000]"
        data-ocid="donate.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Heart className="h-5 w-5 text-red-400" />
            Donate
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            If you enjoy ICPixel, consider supporting development with a
            donation. Send crypto directly to any of the addresses below.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          {WALLETS.map((wallet, index) => (
            <div
              key={wallet.label}
              className="rounded-md bg-muted/40 border border-border p-3"
            >
              <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">
                {wallet.label}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-foreground break-all leading-relaxed">
                  {wallet.address}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(wallet.address, index)}
                  className="shrink-0 h-8 w-8 p-0 hover:bg-accent"
                  title={`Copy ${wallet.label} address`}
                  data-ocid={`donate.secondary_button.${index + 1}`}
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground">
            All donations are greatly appreciated and go directly toward
            improving ICPixel.
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-sm"
            data-ocid="donate.close_button"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
