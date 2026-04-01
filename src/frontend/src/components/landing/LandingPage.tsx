import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface LandingPageProps {
  onLaunch: () => void;
}

export default function LandingPage({ onLaunch }: LandingPageProps) {
  const { theme, setTheme } = useTheme();
  const isWin95 = theme === "win95";

  const handleThemeToggle = () => {
    setTheme(isWin95 ? "dark" : "win95");
  };

  if (isWin95) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "660px",
            maxHeight: "90vh",
            overflowY: "auto",
            fontFamily: "system-ui, Arial, sans-serif",
            background: "#c0c0c0",
            border: "2px solid",
            borderColor: "#ffffff #808080 #808080 #ffffff",
            boxShadow: "1px 1px 0 #000000, inset 1px 1px 0 #dfdfdf",
          }}
        >
          {/* Win95 Title Bar */}
          <div
            style={{
              background: "#000080",
              color: "#ffffff",
              padding: "3px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              userSelect: "none",
              height: "24px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: "bold" }}>
              ICPixel v1.0
            </span>
            <button
              type="button"
              onClick={handleThemeToggle}
              aria-label="Switch to Dark Theme"
              title="Switch to Dark Theme"
              style={{
                background: "#c0c0c0",
                color: "#000000",
                border: "2px solid",
                borderColor: "#ffffff #808080 #808080 #ffffff",
                width: "18px",
                height: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                fontSize: "10px",
              }}
            >
              <Moon style={{ width: "10px", height: "10px" }} />
            </button>
          </div>

          {/* Dialog Body */}
          <div style={{ padding: "24px", color: "#000000" }}>
            {/* Logo */}
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <img
                src="/assets/logoicpixel.png"
                alt="ICPixel — Free Pixel Art Editor"
                style={{ height: "80px", display: "inline-block" }}
              />
            </div>

            {/* SEO Content */}
            <h1
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: "10px",
                lineHeight: "1.3",
                color: "#000000",
              }}
            >
              Free Professional Pixel Art Editor on the Internet Computer
            </h1>

            <p
              style={{
                fontSize: "15px",
                textAlign: "center",
                marginBottom: "14px",
                color: "#333333",
                fontStyle: "italic",
              }}
            >
              Create, animate, and mint. Your art lives on-chain, forever.
            </p>

            <p
              style={{
                fontSize: "13px",
                textAlign: "center",
                marginBottom: "20px",
                color: "#222222",
                lineHeight: "1.6",
              }}
            >
              ICPixel is a powerful, browser-based pixel art and animation
              editor with layers, timeline, non-destructive filters, an NFT
              collection generator, and a built-in ICP wallet. No downloads. No
              account required. Open your browser and start drawing.
            </p>

            {/* Feature Pills */}
            <ul
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                listStyle: "none",
                padding: 0,
                margin: "0 0 24px 0",
                justifyContent: "center",
              }}
            >
              {[
                "Layers & Filters",
                "Frame Animation",
                "NFT Generator",
                "Cloud Save",
                "ICP Wallet",
                "Sprite Sheet Export",
                "Multi-Canvas Tabs",
                "Internet Computer",
              ].map((feature) => (
                <li
                  key={feature}
                  style={{
                    background: "#d4d0c8",
                    border: "1px solid #808080",
                    boxShadow:
                      "inset 1px 1px 0 #ffffff, inset -1px -1px 0 #9e9e9e",
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "#000000",
                  }}
                >
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={onLaunch}
                data-ocid="landing.primary_button"
                style={{
                  background: "#c0c0c0",
                  color: "#000000",
                  border: "2px solid",
                  borderColor: "#ffffff #808080 #808080 #ffffff",
                  boxShadow: "1px 1px 0 #000000",
                  padding: "6px 24px",
                  minWidth: "160px",
                  fontSize: "14px",
                  fontFamily: "system-ui, Arial, sans-serif",
                  fontWeight: "bold",
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                }}
                onMouseDown={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.borderColor = "#808080 #ffffff #ffffff #808080";
                  btn.style.boxShadow = "none";
                  btn.style.paddingTop = "7px";
                  btn.style.paddingLeft = "25px";
                }}
                onMouseUp={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.borderColor = "#ffffff #808080 #808080 #ffffff";
                  btn.style.boxShadow = "1px 1px 0 #000000";
                  btn.style.paddingTop = "6px";
                  btn.style.paddingLeft = "24px";
                }}
              >
                Launch Editor →
              </button>
            </div>

            {/* Footer */}
            <p
              style={{
                textAlign: "center",
                fontSize: "11px",
                color: "#666666",
                margin: 0,
              }}
            >
              Free forever · No account required · Built on ICP
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dark theme
  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
      <div className="relative w-full max-w-[660px] max-h-[90vh] overflow-y-auto bg-card border border-border rounded-lg shadow-2xl">
        {/* Theme toggle — top right */}
        <button
          type="button"
          onClick={handleThemeToggle}
          className="absolute top-3 right-3 p-2 rounded hover:bg-muted transition-colors"
          aria-label="Switch to Win95 Theme"
          title="Switch to Win95 Theme"
        >
          <Sun className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-5">
            <img
              src="/assets/logoicpixel.png"
              alt="ICPixel — Free Pixel Art Editor"
              style={{ height: "80px" }}
            />
          </div>

          {/* SEO Content */}
          <h1 className="text-xl font-bold text-center text-foreground mb-3 leading-tight">
            Free Professional Pixel Art Editor on the Internet Computer
          </h1>

          <p className="text-base text-center text-muted-foreground mb-4 italic">
            Create, animate, and mint. Your art lives on-chain, forever.
          </p>

          <p className="text-sm text-center text-foreground/80 mb-6 leading-relaxed">
            ICPixel is a powerful, browser-based pixel art and animation editor
            with layers, timeline, non-destructive filters, an NFT collection
            generator, and a built-in ICP wallet. No downloads. No account
            required. Open your browser and start drawing.
          </p>

          {/* Feature Pills */}
          <ul
            className="flex flex-wrap gap-1.5 justify-center p-0 mb-7"
            style={{ listStyle: "none" }}
          >
            {[
              "Layers & Filters",
              "Frame Animation",
              "NFT Generator",
              "Cloud Save",
              "ICP Wallet",
              "Sprite Sheet Export",
              "Multi-Canvas Tabs",
              "Internet Computer",
            ].map((feature) => (
              <li
                key={feature}
                className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded"
              >
                {feature}
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <div className="flex justify-center mb-5">
            <Button
              variant="default"
              size="lg"
              onClick={onLaunch}
              data-ocid="landing.primary_button"
            >
              Launch Editor →
            </Button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Free forever · No account required · Built on ICP
          </p>
        </div>
      </div>
    </div>
  );
}
