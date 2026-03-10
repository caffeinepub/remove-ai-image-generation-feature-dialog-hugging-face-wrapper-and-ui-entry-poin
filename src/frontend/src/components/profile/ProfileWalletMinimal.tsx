import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export function ProfileWalletMinimal() {
  const { identity } = useInternetIdentity();

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const principal = identity?.getPrincipal();

  const handleCopyPrincipal = () => {
    if (principal) {
      navigator.clipboard.writeText(principal.toString());
      toast.success("Principal copied to clipboard");
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-['Inter']">Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 font-['Inter']">
          <p className="text-sm text-muted-foreground">
            Please log in to view your wallet information.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-['Inter']">Wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 font-['Inter']">
        {/* Principal */}
        <div className="space-y-2">
          <Label>Your Principal</Label>
          <div className="flex gap-2">
            <Input
              value={principal?.toString() || ""}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyPrincipal}
              disabled={!principal}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your unique Internet Identity principal
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
