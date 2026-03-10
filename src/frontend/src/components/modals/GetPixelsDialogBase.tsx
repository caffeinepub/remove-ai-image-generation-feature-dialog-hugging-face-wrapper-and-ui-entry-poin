import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useGetCurrentEra } from "@/hooks/useQueries";

interface GetPixelsDialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GetPixelsDialogBase({
  open,
  onOpenChange,
}: GetPixelsDialogBaseProps) {
  const { login, loginStatus } = useAuth();
  const { data: currentEra } = useGetCurrentEra();

  const era = currentEra || "Alpha";

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const isLoggingIn = loginStatus === "logging-in";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal container={document.getElementById("dialog-root")}>
        <DialogContent className="sm:max-w-[500px] z-[1000]">
          <DialogHeader>
            <DialogTitle className="text-lg">Get Early Pixels</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Explanation Section */}
            <div className="space-y-3">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">What is ICP?</h3>
                <p className="text-sm text-muted-foreground">
                  ICP (Internet Computer Protocol) is the native token of the
                  Internet Computer blockchain. It's required to purchase pixels
                  in this application.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">What are Pixels?</h3>
                <p className="text-sm text-muted-foreground">
                  Pixels are early supporter credits for the {era} era. They are{" "}
                  <strong>not a token</strong> and are{" "}
                  <strong>not transferable</strong>. They grant priority access,
                  future rewards, and governance influence.
                </p>
              </div>
            </div>

            {/* Steps Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">How to Get Started:</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Create or log in with Internet Identity</li>
                <li>Acquire ICP from an exchange (e.g., Coinbase, Binance)</li>
                <li>Transfer ICP by purchasing pixels inside the app</li>
              </ol>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <Button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full"
              >
                {isLoggingIn ? "Logging in..." : "Login to Buy Pixels"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
