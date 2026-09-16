import { useReveal, useStaggerReveal } from '../hooks';

const steps = [
  {
    number: '01',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12">
        <rect x="6" y="10" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
        <rect x="12" y="16" width="10" height="8" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="26" y="16" width="10" height="4" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="26" y="24" width="10" height="4" rx="1" fill="currentColor" opacity="0.2" />
        <line x1="12" y1="30" x2="36" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <circle cx="38" cy="12" r="6" fill="currentColor" opacity="0.6" />
        <path d="M36 12L38.5 14L41 10" stroke="#0a0a0f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Create',
    subtitle: 'Manual Builder or AI',
    description:
      'Drag-and-drop game elements with our visual builder, or just tell AI what you want. "Make a platformer where you dodge pizza" — done.',
    color: 'text-neon-cyan',
    glow: 'glow-cyan',
    borderColor: 'border-neon-cyan/20',
  },
  {
    number: '02',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12">
        <path d="M10 34L24 10L38 34H10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="24" cy="26" r="4" fill="currentColor" opacity="0.4" />
        <path d="M20 38L24 42L28 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 22H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <path d="M36 22H44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <circle cx="24" cy="26" r="1.5" fill="currentColor" />
      </svg>
    ),
    title: 'Publish & Share',
    subtitle: 'One Link, Instant Play',
    description:
      "Hit publish and get a shareable link. Your friends can play instantly in their browser — no downloads, no accounts, no friction.",
    color: 'text-neon-purple',
    glow: 'glow-purple',
    borderColor: 'border-neon-purple/20',
  },
  {
    number: '03',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12">
        <path d="M24 6L28 16H38L30 22L33 32L24 26L15 32L18 22L10 16H20L24 6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="14" cy="40" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="34" cy="40" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M18 40H30" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="24" cy="16" r="2" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    title: 'Compete & Remix',
    subtitle: 'Leaderboards & Forks',
    description:
      'Every game has a live leaderboard. Think you can do better? Remix any game into your own version and challenge the creator.',
    color: 'text-neon-pink',
    glow: '',
    borderColor: 'border-neon-pink/20',
  },
];

export default function HowItWorks() {
  const [containerRef, isVisible, getDelay] = useStaggerReveal(3, 150);

  return (
    <section id="how-it-works" className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide mb-4">
            <span className="text-neon-cyan glow-cyan-text">HOW</span>{' '}
            <span className="text-text-primary">IT WORKS</span>
          </h2>
          <p className="font-body text-text-secondary text-lg max-w-md mx-auto">
            Three steps. Zero game-dev experience required.
          </p>
        </div>

        {/* Steps */}
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`relative rounded-xl p-6 md:p-8
                bg-void-card/80 backdrop-blur-sm border ${step.borderColor}
                ${isVisible ? 'reveal' : 'opacity-0'}
                group hover:border-opacity-60 transition-all duration-300`}
              style={isVisible ? getDelay(i) : {}}
            >
              {/* Step number */}
              <span className={`font-display text-xs ${step.color} opacity-60 tracking-[0.3em] mb-4 block`}>
                STEP {step.number}
              </span>

              {/* Icon */}
              <div className={`${step.color} mb-5 transition-transform duration-300 group-hover:scale-110`}>
                {step.icon}
              </div>

              {/* Content */}
              <h3 className={`font-display text-xl font-bold ${step.color} mb-1 tracking-wide`}>
                {step.title}
              </h3>
              <p className="font-display text-sm text-text-secondary mb-3 tracking-wide">
                {step.subtitle}
              </p>
              <p className="font-body text-text-secondary text-sm leading-relaxed">
                {step.description}
              </p>

              {/* Connector line (desktop) */}
              {i < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-4 md:-right-5 w-8 md:w-10 h-px bg-gradient-to-r from-void-border to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
