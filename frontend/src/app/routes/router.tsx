import { createBrowserRouter, Navigate } from "react-router-dom";
import { FavoritesPage } from "@/presentation/pages/FavoritesPage";
import { KnowledgeLibraryPage } from "@/presentation/pages/KnowledgeLibraryPage";
import { TrashPage } from "@/presentation/pages/TrashPage";
import { SettingsPage } from "@/presentation/pages/SettingsPage";
import { NotesPage } from "@/presentation/pages/NotesPage";
import { WorkspacePage } from "@/presentation/pages/WorkspacePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/workspace" replace />,
  },
  {
    path: "/workspace",
    element: <WorkspacePage />,
  },
  {
    path: "/library",
    element: <KnowledgeLibraryPage />,
  },
  {
    path: "/favorites",
    element: <FavoritesPage />,
  },
  {
    path: "/trash",
    element: <TrashPage />,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
  },
  {
    path: "/notes",
    element: <NotesPage />,
  },
  {
    path: "*",
    element: <Navigate to="/workspace" replace />,
  },
]);
