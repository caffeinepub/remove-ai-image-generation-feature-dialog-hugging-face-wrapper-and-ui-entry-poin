import { useAuth } from "@/hooks/useAuth";
import GetPixelsDialogBase from "./GetPixelsDialogBase";
import GetPixelsDialogCloud from "./GetPixelsDialogCloud";

interface GetPixelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GetPixelsDialog({
  open,
  onOpenChange,
}: GetPixelsDialogProps) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <GetPixelsDialogCloud open={open} onOpenChange={onOpenChange} />;
  }

  return <GetPixelsDialogBase open={open} onOpenChange={onOpenChange} />;
}
