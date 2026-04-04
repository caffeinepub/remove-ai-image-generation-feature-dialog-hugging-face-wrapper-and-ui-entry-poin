import LandingPage from "@/components/landing/LandingPage";
import HomePage from "@/pages/HomePage";
import ProfilePage from "@/pages/ProfilePage";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";

// Session flag: set when the user clicks "Launch Editor" from the landing page.
// This ensures /editor and /profile always redirect to / on a fresh page load.
const SESSION_KEY = "icpixel_launched";

export function markAppLaunched() {
  sessionStorage.setItem(SESSION_KEY, "1");
}

function isAppLaunched() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => {
    // Redirect any unknown path to the landing page
    throw redirect({ to: "/" });
  },
});

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor",
  beforeLoad: () => {
    if (!isAppLaunched()) {
      throw redirect({ to: "/" });
    }
  },
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  beforeLoad: () => {
    if (!isAppLaunched()) {
      throw redirect({ to: "/" });
    }
  },
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  editorRoute,
  profileRoute,
]);
const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => {
    throw redirect({ to: "/" });
  },
});

function RootLayout() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isProfile = pathname === "/profile";
  const isEditor = pathname === "/editor";
  // Treat anything that isn't /editor or /profile as the landing page
  const isLanding = !isEditor && !isProfile;

  return (
    <>
      {isLanding && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            width: "100%",
          }}
        >
          <LandingPage />
        </div>
      )}
      <div
        style={{
          display: isEditor ? "flex" : "none",
          flexDirection: "column",
          height: "100%",
          width: "100%",
        }}
      >
        <HomePage isVisible={isEditor} />
      </div>
      <div
        style={{
          display: isProfile ? "flex" : "none",
          flexDirection: "column",
          height: "100%",
          width: "100%",
        }}
      >
        <ProfilePage />
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="win95"
      enableSystem={false}
      themes={["dark", "win95"]}
    >
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
