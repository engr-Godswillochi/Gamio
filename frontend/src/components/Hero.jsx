import GameCanvas from './GameCanvas';

export default function Hero({ onBuildClick, onPlayClick }) {
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
          <span className="text-cyan-400">GAM</span>
          <span className="text-fuchsia-500">IO</span>
        </h1>
      </div>

      {/* Headline */}
      <div className="relative z-10 text-center max-w-3xl mx-auto mb-8">
        <p className="font-display text-lg sm:text-xl md:text-2xl font-bold text-white tracking-wide mb-3">
          Build It. Play It. Beat Your Friends.
        </p>
        <p className="font-body text-base sm:text-lg text-purple-200/80 max-w-xl mx-auto leading-relaxed">
          Create games in minutes with our visual editor — zero AI cost to start. 
          Share with one link, compete on leaderboards, and remix anything.
        </p>
      </div>

      {/* CTAs */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-4 mb-12">
        <button
          onClick={onBuildClick}
          id="cta-start-building"
          className="px-8 py-3.5 rounded-xl font-display text-sm font-bold tracking-wider
            bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white shadow-xl shadow-cyan-500/20
            hover:from-cyan-400 hover:to-fuchsia-500 transition-all active:scale-95 flex items-center justify-center space-x-2"
        >
          <span>⚡ START BUILDING (VISUAL EDITOR)</span>
        </button>
        <button
          onClick={onPlayClick}
          id="cta-play-runner"
          className="px-8 py-3.5 rounded-xl font-display text-sm font-bold tracking-wider
            border border-purple-500/40 text-purple-200 bg-purple-950/40
            hover:bg-purple-900/60 hover:border-cyan-400 transition-all active:scale-95 flex items-center justify-center space-x-2"
        >
          <span>🎮 PLAY ENDLESS RUNNER</span>
        </button>
      </div>

      {/* Game Canvas preview */}
      <div className="relative z-10 w-full max-w-lg mx-auto">
        <GameCanvas />
      </div>

      {/* Tagline subtle */}
      <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-purple-400/60 font-body">
        <span>🎮 Create → Share → Compete</span>
        <span>🏆 Your Game, Your Rules, Your Leaderboard</span>
        <span>🚀 Shared Schema Architecture (PRD Section 5.0)</span>
      </div>
    </section>
  );
}
