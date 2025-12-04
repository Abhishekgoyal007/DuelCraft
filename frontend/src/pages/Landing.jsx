// src/pages/Landing.jsx
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-16 flex gap-12 items-center">
        <div className="flex-1">
          <h1 className="text-5xl font-extrabold mb-4">DuelCraft</h1>
          <p className="text-lg text-slate-600 mb-6">
            Fast-paced, physics-driven 1v1 battles with customizable characters and token rewards.
          </p>

          <div className="flex gap-3">
            <Link to="/hub">
              <button className="px-5 py-3 rounded-lg bg-accent text-white font-semibold shadow hover:opacity-95">
                Enter Game
              </button>
            </Link>
            <Link to="/creator">
              <button className="px-4 py-3 rounded-lg border border-slate-200 text-slate-700">
                Customize Character
              </button>
            </Link>
          </div>
        </div>

        <div className="w-96 h-56 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
          Arena Preview
        </div>
      </main>
    </div>
  );
}
