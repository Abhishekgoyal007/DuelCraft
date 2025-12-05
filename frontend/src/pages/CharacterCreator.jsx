// src/pages/CharacterCreator.jsx
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const BODY_OPTIONS = ["square", "round", "tall"];
const HAIR_OPTIONS = ["spiky", "short", "bald", "long"];
const FACE_OPTIONS = ["smile", "angry", "neutral"];
const COLOR_OPTIONS = ["#66c2ff", "#ffb86b", "#7b61ff", "#6ee7b7"];

export default function CharacterCreator() {
  const auth = useAuth();
  const user = auth?.user ?? null;

  const [body, setBody] = useState(BODY_OPTIONS[0]);
  const [hair, setHair] = useState(HAIR_OPTIONS[0]);
  const [face, setFace] = useState(FACE_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // fetch existing profile when mounted
    async function fetchProfile() {
      if (!user?.address) return;
      try {
        const res = await fetch(`http://localhost:4000/profile?address=${user.address}`);
        const data = await res.json();
        if (data?.avatar) {
          const a = data.avatar;
          setBody(a.body || BODY_OPTIONS[0]);
          setHair(a.hair || HAIR_OPTIONS[0]);
          setFace(a.face || FACE_OPTIONS[0]);
          setColor(a.color || COLOR_OPTIONS[0]);
        }
      } catch (err) {
        console.warn("couldn't fetch profile", err);
      }
    }
    fetchProfile();
  }, [user]);

  async function save() {
    if (!user?.address) {
      alert("Please connect wallet first");
      return;
    }
    setLoading(true);
    const avatar = { body, hair, face, color };
    try {
      const res = await fetch("http://localhost:4000/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: user.address, avatar })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Save failed");
    } finally {
      setLoading(false);
    }
  }

  // very simple preview renderer (can be swapped for canvas)
  function renderPreview() {
    const bg = color;
    return (
      <div className="w-full h-64 flex items-center justify-center" style={{ background: "linear-gradient(180deg,#fff 0%, #f7fbff 100%)" }}>
        <div style={{ width: 140, height: 140, background: bg, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: body === "round" ? 999 : 6 }}>
          {/* hair box */}
          <div style={{ position: "absolute", top: 54, width: 100, height: body === "tall" ? 60 : 40, background: "#111", borderRadius: 6 }}></div>
          {/* face mark */}
          <div style={{ position: "relative", zIndex: 5, color: "#fff" }}>{face}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Character Creator</h2>
          <p className="text-sm text-slate-500 mb-6">Pick the look for your DuelCraft avatar and save to your profile (wallet required).</p>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <div className="mb-4">{renderPreview()}</div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <div className="text-xs font-medium mb-2">Body</div>
                  <div className="flex gap-2">
                    {BODY_OPTIONS.map(o => (
                      <button key={o} onClick={() => setBody(o)} className={`px-3 py-1 rounded ${body===o ? 'bg-accent text-white' : 'bg-slate-100'}`}>{o}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium mb-2">Hair</div>
                  <div className="flex gap-2">
                    {HAIR_OPTIONS.map(o => (
                      <button key={o} onClick={() => setHair(o)} className={`px-3 py-1 rounded ${hair===o ? 'bg-accent text-white' : 'bg-slate-100'}`}>{o}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium mb-2">Face</div>
                  <div className="flex gap-2">
                    {FACE_OPTIONS.map(o => (
                      <button key={o} onClick={() => setFace(o)} className={`px-3 py-1 rounded ${face===o ? 'bg-accent text-white' : 'bg-slate-100'}`}>{o}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-medium mb-2">Color</div>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} onClick={() => setColor(c)} style={{ background: c }} className={`w-10 h-8 rounded ${color===c ? 'ring-4 ring-offset-2 ring-accent' : ''}`} />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={save} disabled={loading} className="px-4 py-2 bg-accent text-white rounded">
                  {loading ? "Saving..." : "Save Character"}
                </button>
                <Link to="/hub"><button className="px-3 py-2 border rounded">Back</button></Link>
                {saved ? <div className="text-sm text-green-600 ml-2">Saved!</div> : null}
              </div>
            </div>

            <div className="p-4 border rounded">
              <h4 className="font-medium mb-2">Preview Details</h4>
              <div className="text-sm text-slate-600">Body: {body}</div>
              <div className="text-sm text-slate-600">Hair: {hair}</div>
              <div className="text-sm text-slate-600">Face: {face}</div>
              <div className="text-sm text-slate-600">Color: <span className="inline-block w-4 h-4 align-middle" style={{background: color}}></span></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
