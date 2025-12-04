import { Link } from "react-router-dom";

export default function GameModes() {
  return (
    <div style={{ padding: 40 }}>
      <h2>Game Modes</h2>
      <ul>
        <li>⚔️ 1v1 Arena</li>
        <li>🔥 Sudden Death </li>
        <li>💣 Physics Madness</li>
      </ul>

      <Link to="/hub">
        <button>Back</button>
      </Link>
    </div>
  );
}
