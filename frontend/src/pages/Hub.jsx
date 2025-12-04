// src/pages/Hub.jsx
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

export default function Hub() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Game Hub</h2>
              <p className="text-sm text-slate-500">Choose a mode and jump into a match.</p>
            </div>
            <div className="flex gap-3">
              <Link to="/creator" className="px-4 py-2 border rounded-md">Customize</Link>
              <Link to="/modes" className="px-4 py-2 bg-accent text-white rounded-md">Modes</Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="p-4 border rounded">
              <h3 className="font-semibold">1v1 Arena</h3>
              <p className="text-sm text-slate-500">Queue and fight other players.</p>
              <Link to="/arena">
                <button className="mt-3 px-3 py-2 bg-primary text-white rounded">Play</button>
              </Link>
            </div>

            <div className="p-4 border rounded">
              <h3 className="font-semibold">Ranked</h3>
              <p className="text-sm text-slate-500">(Coming soon) Climb the leaderboard.</p>
            </div>

            <div className="p-4 border rounded">
              <h3 className="font-semibold">Custom Rooms</h3>
              <p className="text-sm text-slate-500">Create private matches with friends.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
