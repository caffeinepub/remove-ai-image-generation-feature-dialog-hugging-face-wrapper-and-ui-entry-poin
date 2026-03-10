import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { LogIn, User } from "lucide-react";

export default function LoginButton() {
  const { isAuthenticated, login, logout, loginStatus } = useAuth();
  const navigate = useNavigate();

  const isLoggingIn = loginStatus === "logging-in";
  const disabled = isLoggingIn;

  const handleClick = async () => {
    if (isAuthenticated) {
      navigate({ to: "/profile" });
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error("Login error:", error);
        if (error.message === "User is already authenticated") {
          await logout();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      variant={isAuthenticated ? "outline" : "default"}
      size="sm"
      className="font-['Inter'] text-sm h-7 px-2.5 bg-[#7CB342] hover:bg-[#689F38] border-[#7CB342] text-black"
    >
      {isLoggingIn ? (
        "..."
      ) : isAuthenticated ? (
        <>
          <User className="w-3 h-3 mr-1.5" />
          Profile
        </>
      ) : (
        <>
          <LogIn className="w-3 h-3 mr-1.5" />
          Log In
        </>
      )}
    </Button>
  );
}
