import { useState, useEffect } from 'react';

export default function Navbar() {
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
        ${scrolled ? 'bg-void/90 backdrop-blur-md border-b border-void-border/30' : 'bg-transparent'}`}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="#hero" className="font-display text-xl font-black tracking-wider">
          <span className="text-neon-cyan">GAM</span>
          <span className="text-neon-purple">IO</span>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-body text-sm text-text-secondary hover:text-neon-cyan transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#waitlist"
            className="btn-press px-5 py-2 rounded-lg font-display text-xs font-bold tracking-wider
              bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30
              hover:bg-neon-cyan/20 hover:border-neon-cyan/50 transition-colors"
          >
            GET EARLY ACCESS
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          id="mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-text-secondary hover:text-neon-cyan transition-colors p-1"
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
        <div className="md:hidden bg-void/95 backdrop-blur-md border-t border-void-border/30 px-4 py-4 space-y-3">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block font-body text-sm text-text-secondary hover:text-neon-cyan transition-colors py-2"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#waitlist"
            onClick={() => setMenuOpen(false)}
            className="block btn-press px-5 py-2.5 rounded-lg font-display text-xs font-bold tracking-wider text-center
              bg-gradient-to-r from-neon-cyan to-neon-purple text-void mt-2"
          >
            GET EARLY ACCESS
          </a>
        </div>
      )}
    </nav>
  );
}
