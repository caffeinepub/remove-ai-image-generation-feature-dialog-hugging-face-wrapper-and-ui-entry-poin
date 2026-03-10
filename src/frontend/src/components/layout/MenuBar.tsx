import MenuBarBase from "@/components/MenuBar/MenuBarBase";
import MenuBarCloud from "@/components/MenuBar/MenuBarCloud";
import { useAuth } from "@/hooks/useAuth";

/**
 * MenuBar: Lightweight composer that renders MenuBarBase always and MenuBarCloud only when authenticated.
 * This ensures the editor loads freely without backend or login, while cloud features appear only when logged in.
 */
export default function MenuBar() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex items-center gap-0">
      <MenuBarBase />
      {isAuthenticated && <MenuBarCloud />}
    </div>
  );
}
