import { useNavigate } from "@tanstack/react-router";
import {
  Coins,
  Download,
  Film,
  Gamepad2,
  Grid,
  Heart,
  Layers,
  MonitorSmartphone,
  Moon,
  Palette,
  Sparkles,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const isWin95 = theme === "win95";

  const handleThemeToggle = () => {
    setTheme(isWin95 ? "dark" : "win95");
  };

  const handleLaunchEditor = () => {
    navigate({ to: "/editor" });
  };

  if (isWin95) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#c0c0c0",
          fontFamily: "system-ui, Arial, sans-serif",
          color: "#000000",
        }}
      >
        {/* Nav */}
        <nav
          style={{
            background: "#d4d0c8",
            borderBottom: "2px solid",
            borderColor: "#808080",
            padding: "8px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 0 #ffffff inset",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src="/assets/logoicpixel.png"
              alt="ICPixel — Free Online Pixel Art Editor"
              style={{ height: "40px", imageRendering: "pixelated" }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Win95Button onClick={handleThemeToggle} small>
              <Moon size={14} />
            </Win95Button>
            <Win95Button
              onClick={handleLaunchEditor}
              data-ocid="nav.launch_editor.button"
            >
              Launch Editor
            </Win95Button>
          </div>
        </nav>

        {/* Hero */}
        <section
          id="hero"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            maxWidth: "1100px",
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 32px)",
              fontWeight: "bold",
              marginBottom: "12px",
              lineHeight: 1.3,
            }}
          >
            Free Online Pixel Art Editor (No Download Required)
          </h1>
          <p
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              marginBottom: "16px",
              color: "#000080",
            }}
          >
            Create, animate, and export pixel art directly in your browser.
          </p>
          <p
            style={{
              fontSize: "14px",
              marginBottom: "28px",
              lineHeight: 1.6,
              color: "#333",
            }}
          >
            ICPixel is a free online pixel art editor that runs entirely in your
            browser. Create sprites, pixel animations, and game assets with
            layers, timeline tools, and modern export options — no download
            required.
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Win95Button
              onClick={handleLaunchEditor}
              primary
              data-ocid="hero.launch_editor.primary_button"
            >
              🚀 Launch Editor
            </Win95Button>
            <Win95Button
              as="a"
              href="#features"
              data-ocid="hero.learn_more.button"
            >
              Learn More ↓
            </Win95Button>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          style={{ padding: "40px 24px", maxWidth: "1200px", margin: "0 auto" }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: "24px",
              borderBottom: "2px solid #808080",
              paddingBottom: "8px",
            }}
          >
            Everything You Need to Create Pixel Art Online
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {features.map((f) => (
              <li key={f.title} style={win95Panel}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <span>{f.icon}</span>
                  <h3
                    style={{ fontWeight: "bold", fontSize: "13px", margin: 0 }}
                  >
                    {f.title}
                  </h3>
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#333",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {f.desc}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Use Cases */}
        <section
          id="use-cases"
          style={{ padding: "40px 24px", maxWidth: "1200px", margin: "0 auto" }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: "20px",
              borderBottom: "2px solid #808080",
              paddingBottom: "8px",
            }}
          >
            Who Uses ICPixel?
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            {useCases.map((u) => (
              <li
                key={u.title}
                style={{
                  ...win95Panel,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "20px" }}>{u.icon}</span>
                <div>
                  <h3
                    style={{
                      fontWeight: "bold",
                      fontSize: "13px",
                      margin: "0 0 4px",
                    }}
                  >
                    {u.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#333",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {u.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p
            style={{
              fontSize: "13px",
              color: "#555",
              textAlign: "center",
              marginTop: "16px",
              fontStyle: "italic",
            }}
          >
            Ideal for creating game sprites, tilesets, and pixel animations for
            modern web and indie games.
          </p>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          style={{ padding: "40px 24px", maxWidth: "900px", margin: "0 auto" }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: "24px",
              borderBottom: "2px solid #808080",
              paddingBottom: "8px",
            }}
          >
            How It Works
          </h2>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {steps.map((s, i) => (
              <li
                key={s.title}
                style={{
                  ...win95Panel,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    minWidth: "28px",
                    height: "28px",
                    background: "#000080",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "bold",
                    border: "2px solid #ffffff",
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <h3
                    style={{
                      fontWeight: "bold",
                      fontSize: "13px",
                      margin: "0 0 4px",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#333",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section
          id="cta"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "#d4d0c8",
            borderTop: "2px solid #808080",
            borderBottom: "2px solid #808080",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "bold",
              marginBottom: "12px",
            }}
          >
            Start Creating Pixel Art Now
          </h2>
          <p style={{ fontSize: "14px", marginBottom: "24px", color: "#333" }}>
            Free browser-based pixel art editor — no download, no account
            required.
          </p>
          <Win95Button
            onClick={handleLaunchEditor}
            primary
            data-ocid="cta.launch_editor.primary_button"
          >
            🚀 Launch Editor
          </Win95Button>
        </section>

        {/* Footer */}
        <footer
          style={{
            padding: "24px",
            background: "#c0c0c0",
            borderTop: "2px solid #808080",
            textAlign: "center",
            fontSize: "12px",
            color: "#444",
          }}
        >
          <p style={{ marginBottom: "12px" }}>
            ICPixel is free to use. Optional support is available through
            donations and pixel asset sales within the platform.
          </p>
        </footer>
      </div>
    );
  }

  // Dark theme
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-card px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img
            src="/assets/logoicpixel.png"
            alt="ICPixel — Free Online Pixel Art Editor"
            className="h-10"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleThemeToggle}
            className="p-2 rounded-md border border-border bg-card hover:bg-muted transition-colors"
            aria-label="Switch to Win95 theme"
          >
            <Sun size={16} />
          </button>
          <button
            type="button"
            onClick={handleLaunchEditor}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity text-sm"
            data-ocid="nav.launch_editor.button"
          >
            Launch Editor
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section id="hero" className="py-20 px-6 text-center max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
          Free Online Pixel Art Editor{" "}
          <span className="text-muted-foreground">(No Download Required)</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-4 font-medium">
          Create, animate, and export pixel art directly in your browser.
        </p>
        <p className="text-base text-muted-foreground mb-8 leading-relaxed">
          ICPixel is a free online pixel art editor that runs entirely in your
          browser. Create sprites, pixel animations, and game assets with
          layers, timeline tools, and modern export options — no download
          required.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            type="button"
            onClick={handleLaunchEditor}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-md font-semibold text-lg hover:opacity-90 transition-opacity"
            data-ocid="hero.launch_editor.primary_button"
          >
            🚀 Launch Editor
          </button>
          <a
            href="#features"
            className="px-8 py-3 border border-border rounded-md font-semibold text-lg hover:bg-muted transition-colors"
            data-ocid="hero.learn_more.button"
          >
            Learn More ↓
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-6 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          Everything You Need to Create Pixel Art Online
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 list-none p-0">
          {features.map((f) => (
            <li
              key={f.title}
              className="bg-card border border-border rounded-lg p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-primary">{f.icon}</span>
                <h3 className="font-semibold text-base">{f.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Use Cases */}
      <section
        id="use-cases"
        className="py-16 px-6 bg-card border-y border-border"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Who Uses ICPixel?
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0">
            {useCases.map((u) => (
              <li key={u.title} className="flex flex-col items-start gap-3">
                <span className="text-3xl">{u.icon}</span>
                <h3 className="font-semibold">{u.title}</h3>
                <p className="text-sm text-muted-foreground">{u.desc}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground text-center mt-6 italic">
            Ideal for creating game sprites, tilesets, and pixel animations for
            modern web and indie games.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-6 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          How It Works
        </h2>
        <ol className="flex flex-col gap-6 list-none p-0">
          {steps.map((s, i) => (
            <li key={s.title} className="flex items-start gap-5">
              <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section
        id="cta"
        className="py-20 px-6 text-center bg-card border-y border-border"
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Start Creating Pixel Art Now
        </h2>
        <p className="text-muted-foreground mb-8">
          Free browser-based pixel art editor — no download, no account
          required.
        </p>
        <button
          type="button"
          onClick={handleLaunchEditor}
          className="px-10 py-4 bg-primary text-primary-foreground rounded-md font-bold text-xl hover:opacity-90 transition-opacity"
          data-ocid="cta.launch_editor.primary_button"
        >
          🚀 Launch Editor
        </button>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-border text-center text-sm text-muted-foreground">
        <p className="mb-4">
          ICPixel is free to use. Optional support is available through
          donations and pixel asset sales within the platform.
        </p>
      </footer>
    </div>
  );
}

// Win95 button helper component
function Win95Button({
  children,
  onClick,
  primary,
  small,
  as: Tag = "button",
  href,
  "data-ocid": dataOcid,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  small?: boolean;
  as?: "button" | "a";
  href?: string;
  "data-ocid"?: string;
}) {
  const [pressed, setPressed] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: small ? "3px 8px" : primary ? "8px 24px" : "5px 16px",
    fontSize: primary ? "14px" : small ? "12px" : "13px",
    fontWeight: primary ? "bold" : "normal",
    fontFamily: "system-ui, Arial, sans-serif",
    background: primary ? "#000080" : "#d4d0c8",
    color: primary ? "#ffffff" : "#000000",
    border: "2px solid",
    borderColor: pressed
      ? "#808080 #ffffff #ffffff #808080"
      : "#ffffff #808080 #808080 #ffffff",
    cursor: "pointer",
    userSelect: "none",
    textDecoration: "none",
  };

  if (Tag === "a") {
    return (
      <a href={href} style={baseStyle} data-ocid={dataOcid}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      style={baseStyle}
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      data-ocid={dataOcid}
    >
      {children}
    </button>
  );
}

import React from "react";

const features = [
  {
    icon: <Layers size={18} />,
    title: "Pixel Drawing Tools with Layers",
    desc: "Professional drawing tools including pencil, eraser, fill, and shapes. Work with multiple layers for complex pixel art projects.",
  },
  {
    icon: <Film size={18} />,
    title: "Frame-by-Frame Pixel Animation with Timeline Control",
    desc: "Create smooth pixel animations using a frame timeline. Adjust timing, preview animations, and manage frames easily.",
  },
  {
    icon: <Grid size={18} />,
    title: "Sprite Sheet Export",
    desc: "Export your pixel art as sprite sheets for use in games and animations.",
  },
  {
    icon: <MonitorSmartphone size={18} />,
    title: "Multi-Canvas Workflow",
    desc: "Work on multiple canvases and projects simultaneously. Easily switch between different pixel art files.",
  },
  {
    icon: <Download size={18} />,
    title: "Works Entirely in the Browser",
    desc: "No downloads or installation required. Create pixel art instantly in your browser.",
  },
  {
    icon: <Sparkles size={18} />,
    title: "WebM Animation Export (Modern Alternative to GIF)",
    desc: "Export animations as WebM for high-quality playback and smaller file sizes compared to traditional GIFs.",
  },
];

const useCases = [
  {
    icon: <Gamepad2 size={24} />,
    title: "Game Developers",
    desc: "Create sprites, tilesets, and animations for 2D games and indie projects.",
  },
  {
    icon: <Palette size={24} />,
    title: "Pixel Artists",
    desc: "Design detailed pixel artwork with precision tools and layered workflows.",
  },
  {
    icon: <Coins size={24} />,
    title: "NFT Creators / Digital Collectibles",
    desc: "Create pixel-based digital assets and collections.",
  },
  {
    icon: <Heart size={24} />,
    title: "Hobbyists",
    desc: "Make pixel art for fun, learning, or personal creative projects.",
  },
];

const steps = [
  {
    title: "Open the Editor",
    desc: 'Click "Launch Editor" to start creating pixel art instantly in your browser — no download or sign-up required.',
  },
  {
    title: "Create Pixel Art or Animation",
    desc: "Use drawing tools, layers, and animation features to build your artwork or animated sequences.",
  },
  {
    title: "Export or Share",
    desc: "Export your work as PNG sprite sheets or WebM animations for high-quality playback.",
  },
];

const win95Panel: React.CSSProperties = {
  background: "#d4d0c8",
  border: "2px solid",
  borderColor: "#808080 #ffffff #ffffff #808080",
  boxShadow: "inset 1px 1px 0 #808080, inset -1px -1px 0 #ffffff",
  padding: "12px",
};
