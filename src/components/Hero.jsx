import GameCanvas from './GameCanvas';

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 md:pt-32 overflow-hidden"
    >
      {/* Radial glow behind hero */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,240,255,0.06) 0%, rgba(179,71,255,0.04) 40%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Logo / Brand */}
      <div className="relative z-10 text-center mb-6">
        <h1 className="font-display text-5xl sm:text-6xl md:text-8xl font-black tracking-wider">
          <span className="text-neon-cyan glow-cyan-text">GAM</span>
          <span className="text-neon-purple glow-purple-text">IO</span>
        </h1>
      </div>

      {/* Headline */}
      <div className="relative z-10 text-center max-w-3xl mx-auto mb-8">
        <p className="font-display text-lg sm:text-xl md:text-2xl font-bold text-text-primary tracking-wide mb-3">
          Build It. Play It. Beat Your Friends.
        </p>
        <p className="font-body text-base sm:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
          Create games in minutes — drag-and-drop or describe your idea to AI. 
          Share with one link. Climb the leaderboard. Get remixed.
        </p>
      </div>

      {/* CTAs */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-4 mb-12">
        <a
          href="#waitlist"
          id="cta-start-building"
          className="btn-press px-8 py-3.5 rounded-lg font-display text-sm font-bold tracking-wider
            bg-gradient-to-r from-neon-cyan to-neon-purple text-void
            glow-cyan hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-shadow"
        >
          START BUILDING
        </a>
        <a
          href="#trending"
          id="cta-see-trending"
          className="btn-press px-8 py-3.5 rounded-lg font-display text-sm font-bold tracking-wider
            border border-neon-purple/40 text-neon-purple
            hover:bg-neon-purple/10 hover:border-neon-purple/60 transition-colors"
        >
          SEE WHAT'S TRENDING
        </a>
      </div>

      {/* Game Canvas */}
      <div className="relative z-10 w-full max-w-lg mx-auto">
        <GameCanvas />
      </div>

      {/* Tagline alternatives (subtle) */}
      <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-text-muted font-body">
        <span>🎮 Create → Share → Compete</span>
        <span>🏆 Your Game, Your Rules, Your Leaderboard</span>
        <span>🚀 From Idea to Playable in Minutes</span>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="w-5 h-8 rounded-full border-2 border-text-muted/30 flex justify-center pt-1.5">
          <div
            className="w-1 h-2 rounded-full bg-neon-cyan"
            style={{
              animation: 'reveal-up 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </section>
  );
}
