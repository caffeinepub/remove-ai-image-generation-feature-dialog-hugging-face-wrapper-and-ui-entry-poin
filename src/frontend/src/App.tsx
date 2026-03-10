import HomePage from "@/pages/HomePage";
import ProfilePage from "@/pages/ProfilePage";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";

// Create root route
const rootRoute = createRootRoute();

// Create home route
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

// Create profile route
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

// Create router
const routeTree = rootRoute.addChildren([homeRoute, profileRoute]);
const router = createRouter({ routeTree });

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
