import HomePage from "@/pages/HomePage";
import ProfilePage from "@/pages/ProfilePage";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
});

const routeTree = rootRoute.addChildren([homeRoute, profileRoute]);
const router = createRouter({ routeTree });

function RootLayout() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isProfile = pathname === "/profile";

  return (
    <>
      <div
        style={{
          display: isProfile ? "none" : "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
        }}
      >
        <HomePage />
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
