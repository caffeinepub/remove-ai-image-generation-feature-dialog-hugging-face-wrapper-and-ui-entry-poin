import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

interface ICPInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ICPInfoDialog({
  open,
  onOpenChange,
}: ICPInfoDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal container={document.getElementById("dialog-root")}>
        <DialogContent className="sm:max-w-[500px] z-[1000]">
          <DialogHeader>
            <DialogTitle className="text-lg">About ICP and Pixels</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* What is ICP */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">What is ICP?</h3>
              <p className="text-sm text-muted-foreground">
                ICP (Internet Computer Protocol) is the native cryptocurrency
                token of the Internet Computer blockchain. It's a decentralized
                network that hosts smart contracts and web applications entirely
                on-chain.
              </p>
            </div>

            {/* How to Buy ICP */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">How to Buy ICP</h3>
              <p className="text-sm text-muted-foreground">
                You can purchase ICP from major cryptocurrency exchanges such
                as:
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside ml-2">
                <li>Coinbase</li>
                <li>Binance</li>
                <li>Kraken</li>
                <li>Other major exchanges</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                After purchasing, you can transfer ICP to your Internet Identity
                wallet to use within this application.
              </p>
            </div>

            {/* How ICP is Used */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Using ICP in ICPixel</h3>
              <p className="text-sm text-muted-foreground">
                In this application, you send ICP to purchase pixels. The ICP is
                transferred to the application's admin wallet, and in return,
                you receive pixels credited to your account.
              </p>
            </div>

            {/* Important Notice */}
            <div className="space-y-2 border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-500/10 rounded-r">
              <h3 className="font-semibold text-sm text-yellow-600 dark:text-yellow-400">
                Important Notice
              </h3>
              <p className="text-sm text-muted-foreground">
                <strong>Pixels are NOT tokens.</strong> They are
                non-transferable early supporter credits. All ICP transfers are{" "}
                <strong>final and non-refundable</strong>. Please ensure you
                understand this before making any purchases.
              </p>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
