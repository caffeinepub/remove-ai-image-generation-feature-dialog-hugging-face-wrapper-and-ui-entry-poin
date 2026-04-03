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
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
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
