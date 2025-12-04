// src/pages/Arena.jsx
import Navbar from "../components/Navbar";
import App from "../App";

export default function Arena() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <App />
        </div>
      </main>
    </div>
  );
}
