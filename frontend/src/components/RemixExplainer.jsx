import { useReveal } from '../hooks';

const REMIX_STEPS = [
  {
    label: 'Original Game',
    title: 'Pixel Dash',
    creator: 'xN00bSlayer',
    description: 'Classic platformer — dodge spikes, collect coins.',
    emoji: '🏃',
    color: '#00f0ff',
  },
  {
    label: 'Remix #1',
    title: 'Pixel Dash: Space Edition',
    creator: 'astro_gamer',
    description: 'Same mechanics, but in zero gravity with asteroid obstacles.',
    emoji: '🚀',
    color: '#b347ff',
  },
  {
    label: 'Remix #2',
    title: 'Pixel Dash: Speedrun Mode',
    creator: 'speedrunner_jess',
    description: 'Timer-based variant with tighter platforms and a 60-second clock.',
    emoji: '⏱️',
    color: '#ff2d7c',
  },
  {
    label: 'Remix #3',
    title: 'Cat Dash',
    creator: 'memeking42',
    description: 'Swapped the character for a cat. Added fish collectibles. Internet approved.',
    emoji: '🐱',
    color: '#39ff14',
  },
];

export default function RemixExplainer() {
  const [ref, isVisible] = useReveal(0.1);

  return (
    <section id="remix" className="relative py-24 px-4">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-void-border to-transparent" />

      <div ref={ref} className={`max-w-5xl mx-auto ${isVisible ? 'reveal' : 'opacity-0'}`}>
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide mb-4">
            <span className="text-text-primary">REMIX</span>{' '}
            <span className="text-neon-lime" style={{ textShadow: '0 0 8px rgba(57,255,20,0.5)' }}>
              EVERYTHING
            </span>
          </h2>
          <p className="font-body text-text-secondary text-lg max-w-lg mx-auto">
            Every game on Gamio can be forked and remixed. Take someone's idea, put your spin on it, and challenge them to beat your version.
          </p>
        </div>

        {/* Remix Flow Visualization */}
        <div className="relative">
          {/* Connection lines (desktop) */}
          <div className="hidden md:block absolute top-0 left-[calc(12.5%-1px)] w-0.5 h-full">
            <div className="w-full h-full bg-gradient-to-b from-[#00f0ff]/40 via-[#b347ff]/30 to-[#39ff14]/20" />
          </div>

          <div className="space-y-4 md:space-y-6">
            {REMIX_STEPS.map((step, i) => (
              <div
                key={i}
                className="relative flex items-start gap-4 md:gap-6"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Node dot */}
                <div className="hidden md:flex shrink-0 w-[25%] items-center justify-center">
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2"
                      style={{
                        borderColor: step.color,
                        background: `${step.color}15`,
                        boxShadow: `0 0 12px ${step.color}30`,
                      }}
                    >
                      {step.emoji}
                    </div>
                    {/* Branch line for remixes */}
                    {i > 0 && (
                      <div
                        className="absolute top-1/2 -left-2 w-8 h-0.5 -translate-y-1/2"
                        style={{ background: `${step.color}40` }}
                      />
                    )}
                  </div>
                </div>

                {/* Card */}
                <div
                  className={`flex-1 p-4 sm:p-5 rounded-xl bg-void-card border transition-all duration-300
                    hover:scale-[1.01] cursor-pointer
                    ${i === 0 ? 'md:ml-0' : 'md:ml-4'}`}
                  style={{ borderColor: `${step.color}25` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span
                        className="font-display text-[10px] font-bold tracking-[0.3em] block mb-1"
                        style={{ color: step.color }}
                      >
                        {step.label.toUpperCase()}
                      </span>
                      <h4 className="font-display text-base sm:text-lg font-bold text-text-primary tracking-wide">
                        {step.title}
                      </h4>
                    </div>
                    <span className="md:hidden text-2xl">{step.emoji}</span>
                  </div>
                  <p className="font-body text-xs text-text-muted mb-1">by {step.creator}</p>
                  <p className="font-body text-sm text-text-secondary leading-relaxed">
                    {step.description}
                  </p>

                  {i === 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="font-display text-[10px] text-neon-cyan tracking-wider">
                        3 REMIXES
                      </span>
                      <div className="flex -space-x-1">
                        {['🚀', '⏱️', '🐱'].map((e, j) => (
                          <span
                            key={j}
                            className="w-5 h-5 rounded-full bg-void-lighter border border-void-border text-xs flex items-center justify-center"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom callout */}
        <div className="mt-10 text-center">
          <p className="font-body text-text-muted text-sm mb-4">
            Every remix links back to the original. Creators get credit. The best version wins.
          </p>
          <a
            href="#waitlist"
            className="btn-press inline-block px-6 py-3 rounded-lg font-display text-sm font-bold tracking-wider
              border border-neon-lime/30 text-neon-lime
              hover:bg-neon-lime/10 hover:border-neon-lime/50 transition-colors"
          >
            REMIX YOUR FIRST GAME →
          </a>
        </div>
      </div>
    </section>
  );
}
