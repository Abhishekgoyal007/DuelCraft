// src/components/Navbar.jsx
import ConnectWallet from "./ConnectWallet";

export default function Navbar({ small }) {
  return (
    <header className="w-full bg-white/60 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
            DC
          </div>
          <div>
            <div className="text-lg font-semibold">DuelCraft</div>
            <div className="text-xs text-slate-500">1v1 Physics Arena — Mantle</div>
          </div>
        </div>

        <nav className="ml-8 flex gap-4 text-sm">
          <a className="hover:text-accent" href="/">Home</a>
          <a className="hover:text-accent" href="/hub">Hub</a>
          <a className="hover:text-accent" href="/creator">Creator</a>
          <a className="hover:text-accent" href="/modes">Modes</a>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
