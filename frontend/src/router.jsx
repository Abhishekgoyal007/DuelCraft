// src/router.jsx
import { createBrowserRouter } from "react-router-dom";

import Landing from "./pages/Landing";
import Hub from "./pages/Hub";
import CharacterCreator from "./pages/CharacterCreator";
import GameModes from "./pages/GameModes";
import Arena from "./pages/Arena";
import Shop from "./pages/Shop";
import Leaderboard from "./pages/Leaderboard";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/hub", element: <Hub /> },
  { path: "/creator", element: <CharacterCreator /> },
  { path: "/modes", element: <GameModes /> },
  { path: "/arena", element: <Arena /> },
  { path: "/shop", element: <Shop /> },
  { path: "/leaderboard", element: <Leaderboard /> },
]);

export default router;
