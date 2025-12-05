// src/pages/Hub.jsx
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

function AvatarPreview({ avatar }) {
  if (!avatar) return <div className="h-40 w-64 bg-slate-50 rounded flex items-center justify-center text-slate-400">No avatar</div>;
  const bg = avatar.color || "#66c2ff";
  const radius = avatar.body === "round" ? 999 : 6;
  return (
    <div className="h-40 w-64 rounded-lg flex items-center justify-center shadow" style={{ background: "linear-gradient(180deg,#f6fbff,#eef8ff)" }}>
      <div style={{ width: 120, height: 120, background: bg, borderRadius: radius }} className="flex items-center justify-center text-white font-medium">
        {avatar.face}
      </div>
    </div>
  );
}

export default function Hub() {
  const { user } = useAuth();
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.address) return;
      try {
        const res = await fetch(`http://localhost:4000/profile?address=${user.address}`);
        const data = await res.json();
        if (data?.avatar) setAvatar(data.avatar);
      } catch (err) {
        console.warn(err);
      }
    }
    fetchProfile();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-white shadow rounded-lg p-6 flex gap-8">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">Game Hub</h2>
            <p className="text-sm text-slate-500">Choose a mode and jump into a match.</p>

            <div className="mt-6 flex gap-4">
              <Link to="/creator"><button className="px-4 py-2 border rounded">Customize</button></Link>
              <Link to="/modes"><button className="px-4 py-2 bg-accent text-white rounded">Modes</button></Link>
              <Link to="/arena"><button className="px-4 py-2 bg-primary text-white rounded">Play</button></Link>
            </div>
          </div>

          <div className="w-80">
            <div className="text-sm text-slate-500 mb-3">Your Avatar</div>
            <AvatarPreview avatar={avatar} />
            <div className="mt-4 text-xs text-slate-500">Saved to profile (in-memory). Save in Character Creator to update.</div>
          </div>
        </div>
      </main>
    </div>
  );
}
