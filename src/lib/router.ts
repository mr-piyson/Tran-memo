import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import App from "@/App";

// Tauri has no URL bar, so memory history is the correct backend. On mobile the
// route depth doubles as the pane back-stack; the Android back button drives
// `router.history.back()` (see useAndroidBack in App.tsx).
const rootRoute = createRootRoute({ component: App });

export const dealersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
});

export const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dealers/$dealerId",
});

export const threadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dealers/$dealerId/notes/$noteId",
});

export const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dealers/$dealerId/detail",
});

const routeTree = rootRoute.addChildren([
  dealersRoute,
  notesRoute,
  threadRoute,
  detailRoute,
]);

export const router = createRouter({
  routeTree,
  history: createMemoryHistory(),
  defaultPreload: false,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
