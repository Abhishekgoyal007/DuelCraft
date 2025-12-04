// src/pages/CharacterCreator.jsx
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

export default function CharacterCreator() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Character Creator</h2>
          <p className="text-sm text-slate-500 mb-6">Pick body, hair, face and accessories. Save to your wallet profile.</p>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 p-6 border rounded">
              <div className="h-64 bg-slate-50 flex items-center justify-center text-slate-400">Avatar Preview</div>
            </div>
            <div className="p-4 border rounded">
              <div className="mb-3">Body</div>
              <div className="mb-3">Hair</div>
              <div className="mb-3">Face</div>
              <button className="mt-4 px-4 py-2 bg-accent text-white rounded">Save Character</button>
              <Link to="/hub"><button className="mt-3 ml-2 px-3 py-2 border rounded">Back</button></Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
