import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/unicorn-empire-logo-clear.png";

/**
 * Site-wide chrome: white unicorn logo + wordmark top-left on every page,
 * and a legal footer naming the entity. Rendered globally from App.tsx so
 * we do not have to edit every page individually.
 */
export const SiteHeaderMark = () => {
  const { pathname } = useLocation();
  // Hide on the root veil page — it already shows the centered hero logo,
  // and the veil itself owns the upper-left brand.
  if (pathname === "/") return null;
  return (
    <Link
      to="/"
      aria-label="Unicorn Empire — home"
      className="fixed top-2 left-2 z-[100] flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors shadow-lg ring-1 ring-white/20"
    >
      <img
        src={logo}
        alt="Unicorn Empire"
        className="h-7 w-7 object-contain"
        style={{ filter: "brightness(0) invert(1)" }}
      />
      <span className="text-white font-semibold tracking-tight text-sm">
        Unicorn Empire
      </span>
    </Link>
  );
};

export const LegalFooter = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-white/10 bg-black/40 text-white/80 text-xs px-4 py-4 mt-12">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-2 sm:gap-4 items-center justify-between">
        <div className="text-center sm:text-left">
          © {year} <strong className="text-white">PGVA Ventures LLC</strong> ·
          Unicorn Empire™ · All rights reserved.
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/community" className="hover:text-white font-semibold">Community</Link>
          <Link to="/messages" className="hover:text-white">Messages</Link>
          <Link to="/terms" className="hover:text-white">Terms</Link>
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
          <Link to="/refund" className="hover:text-white">Refund</Link>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-2 text-center sm:text-left text-white/60">
        Trademarks, product names, designs, source code, and AI agents are the
        intellectual property of David Noyes and PGVA Ventures LLC. Unauthorized
        reproduction, scraping, reverse-engineering, or commercial use is
        prohibited.
      </div>
    </footer>
  );
};
