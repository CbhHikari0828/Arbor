import { createBrowserRouter, Navigate } from "react-router-dom";
import { FavoritesPage } from "@/presentation/pages/FavoritesPage";
import { KnowledgeLibraryPage } from "@/presentation/pages/KnowledgeLibraryPage";
import { TrashPage } from "@/presentation/pages/TrashPage";
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
    path: "*",
    element: <Navigate to="/workspace" replace />,
  },
]);
