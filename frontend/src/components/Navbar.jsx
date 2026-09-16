import { useState, useEffect } from 'react';

export default function Navbar({ onBuildClick, onPlayClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Create', href: '#dual-creation' },
    { label: 'Trending', href: '#trending' },
    { label: 'Remix', href: '#remix' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled ? 'bg-[#07040d]/90 backdrop-blur-md border-b border-purple-900/30' : 'bg-transparent'}`}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="#hero" className="font-display text-xl font-black tracking-wider flex items-center space-x-2">
          <span className="text-cyan-400">GAM</span>
          <span className="text-fuchsia-500">IO</span>
        </a>

        {/* Desktop Links & CTAs */}
        <div className="hidden md:flex items-center gap-4">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-body text-xs font-semibold text-purple-200/70 hover:text-cyan-400 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={onPlayClick}
            className="px-4 py-2 rounded-lg font-display text-xs font-bold tracking-wider
              bg-purple-950 text-cyan-400 border border-cyan-500/40
              hover:bg-purple-900 hover:border-cyan-400 transition-colors"
          >
            ▶ PLAY DEMO
          </button>
          <button
            onClick={onBuildClick}
            className="px-5 py-2 rounded-lg font-display text-xs font-bold tracking-wider
              bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20
              hover:from-cyan-400 hover:to-fuchsia-500 transition-all active:scale-95"
          >
            ⚡ BUILD GAME
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          id="mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-purple-200 hover:text-cyan-400 transition-colors p-1"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0a0515]/95 backdrop-blur-md border-t border-purple-900/30 px-4 py-4 space-y-3">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block font-body text-sm text-purple-200/80 hover:text-cyan-400 transition-colors py-1"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col space-y-2 pt-2">
            <button
              onClick={() => {
                setMenuOpen(false);
                onPlayClick && onPlayClick();
              }}
              className="w-full py-2.5 rounded-lg text-xs font-bold bg-purple-950 text-cyan-400 border border-cyan-500/40"
            >
              ▶ PLAY DEMO
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onBuildClick && onBuildClick();
              }}
              className="w-full py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white"
            >
              ⚡ BUILD GAME
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
