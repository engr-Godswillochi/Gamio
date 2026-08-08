import { useState } from 'react';
import { useReveal } from '../hooks';

const paths = [
  {
    id: 'manual',
    label: 'BUILD IT YOURSELF',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16 sm:w-20 sm:h-20">
        <rect x="8" y="8" width="48" height="48" rx="4" stroke="currentColor" strokeWidth="2" />
        {/* Grid */}
        <line x1="24" y1="8" x2="24" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.2" />
        <line x1="40" y1="8" x2="40" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.2" />
        <line x1="8" y1="24" x2="56" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.2" />
        <line x1="8" y1="40" x2="56" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.2" />
        {/* Blocks being placed */}
        <rect x="12" y="28" width="10" height="10" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="28" y="12" width="10" height="10" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="44" y="44" width="8" height="8" rx="2" fill="currentColor" opacity="0.4" />
        {/* Cursor */}
        <path d="M36 32L42 38L38 40L36 46L34 40L30 38L36 32Z" fill="currentColor" />
      </svg>
    ),
    color: 'neon-cyan',
    features: [
      'Drag-and-drop visual builder',
      'Pre-built game templates',
      'Custom physics & rules editor',
      'Sprite & asset library included',
      'Real-time preview as you build',
    ],
    cta: 'Open the Builder',
    description:
      "Full creative control. Snap together game mechanics like building blocks. Choose from platformers, puzzles, runners, shooters — or invent something new. No code required, but you're the architect.",
  },
  {
    id: 'ai',
    label: 'LET AI BUILD IT',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16 sm:w-20 sm:h-20">
        {/* Brain / AI shape */}
        <circle cx="32" cy="28" r="18" stroke="currentColor" strokeWidth="2" />
        <path d="M24 22C24 22 28 18 32 22C36 18 40 22 40 22" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <circle cx="26" cy="28" r="2.5" fill="currentColor" opacity="0.5" />
        <circle cx="38" cy="28" r="2.5" fill="currentColor" opacity="0.5" />
        {/* Chat bubble */}
        <rect x="14" y="48" width="36" height="10" rx="5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="20" y1="53" x2="44" y2="53" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        {/* Connection lines */}
        <path d="M26 46L28 48" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <path d="M38 46L36 48" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        {/* Sparkle */}
        <path d="M48 12L50 16L54 14L50 18L52 22L48 18L44 20L48 16L46 12L48 12Z" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    color: 'neon-purple',
    features: [
      '"Make a game where cats dodge falling lasers"',
      'AI generates mechanics, levels & art',
      'Refine with follow-up prompts',
      'Edit the result in the visual builder',
      'Generate variations instantly',
    ],
    cta: 'Try AI Creator',
    description:
      "Just describe what you want in plain English. Our AI builds the game — mechanics, visuals, levels, and all. Don't like something? Tell it to change. Remix the output in the builder anytime.",
  },
];

export default function DualCreation() {
  const [activePath, setActivePath] = useState('manual');
  const [ref, isVisible] = useReveal(0.1);

  const active = paths.find((p) => p.id === activePath);

  return (
    <section id="dual-creation" className="relative py-24 px-4">
      {/* Section divider - scanline accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-void-border to-transparent" />

      <div ref={ref} className={`max-w-5xl mx-auto ${isVisible ? 'reveal' : 'opacity-0'}`}>
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide mb-4">
            <span className="text-text-primary">TWO WAYS TO </span>
            <span className="text-neon-purple glow-purple-text">CREATE</span>
          </h2>
          <p className="font-body text-text-secondary text-lg max-w-lg mx-auto">
            Whether you want full creative control or instant AI magic — both paths lead to a playable game.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-lg bg-void-card border border-void-border p-1 gap-1">
            {paths.map((path) => (
              <button
                key={path.id}
                id={`toggle-${path.id}`}
                onClick={() => setActivePath(path.id)}
                className={`btn-press px-5 py-2.5 rounded-md font-display text-xs sm:text-sm font-bold tracking-wider transition-all duration-200
                  ${
                    activePath === path.id
                      ? path.id === 'manual'
                        ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30'
                        : 'bg-neon-purple/15 text-neon-purple border border-neon-purple/30'
                      : 'text-text-muted border border-transparent hover:text-text-secondary'
                  }`}
              >
                {path.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Card */}
        <div
          className={`gradient-border rounded-2xl bg-void-card p-6 sm:p-8 md:p-10
            transition-all duration-300`}
          style={{
            '--tw-gradient-from': activePath === 'manual' ? '#00f0ff' : '#b347ff',
          }}
        >
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left: Icon + Description */}
            <div>
              <div className={`text-${active.color} mb-6`}>
                {active.icon}
              </div>
              <h3 className={`font-display text-2xl font-bold text-${active.color} mb-4 tracking-wide`}>
                {active.label}
              </h3>
              <p className="font-body text-text-secondary leading-relaxed mb-6">
                {active.description}
              </p>
              <a
                href="#waitlist"
                className={`btn-press inline-block px-6 py-3 rounded-lg font-display text-sm font-bold tracking-wider
                  ${
                    activePath === 'manual'
                      ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/25'
                      : 'bg-neon-purple/15 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/25'
                  } transition-colors`}
              >
                {active.cta} →
              </a>
            </div>

            {/* Right: Features */}
            <div className="space-y-3">
              {active.features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-void/50 border border-void-border/30"
                >
                  <span className={`text-${active.color} mt-0.5 shrink-0`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 1l2 3h3l-2 3 1 3-4-2-4 2 1-3-2-3h3l2-3z" />
                    </svg>
                  </span>
                  <span className="font-body text-sm text-text-primary">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
