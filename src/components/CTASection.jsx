import { useState } from 'react';
import { useReveal } from '../hooks';

export default function CTASection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [ref, isVisible] = useReveal(0.1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <section id="waitlist" className="relative py-24 px-4">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-void-border to-transparent" />

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,240,255,0.04) 0%, rgba(179,71,255,0.02) 50%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div ref={ref} className={`relative z-10 max-w-2xl mx-auto text-center ${isVisible ? 'reveal' : 'opacity-0'}`}>
        {/* Decorative top element */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20
            flex items-center justify-center text-3xl">
            🎮
          </div>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide mb-4">
          <span className="text-neon-cyan glow-cyan-text">READY</span>{' '}
          <span className="text-text-primary">TO PLAY?</span>
        </h2>

        <p className="font-body text-text-secondary text-lg max-w-md mx-auto mb-8 leading-relaxed">
          Join thousands of creators and players building the next generation of social games. 
          Early access is limited — grab your spot.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              id="waitlist-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 px-4 py-3.5 rounded-lg bg-void-card border border-void-border
                text-text-primary font-body text-sm
                placeholder:text-text-muted
                focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20
                transition-colors"
              aria-label="Email address for waitlist"
            />
            <button
              type="submit"
              id="cta-join-waitlist"
              className="btn-press px-8 py-3.5 rounded-lg font-display text-sm font-bold tracking-wider
                bg-gradient-to-r from-neon-cyan to-neon-purple text-void
                glow-cyan hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-shadow
                shrink-0"
            >
              JOIN THE WAITLIST
            </button>
          </form>
        ) : (
          <div className="max-w-md mx-auto p-6 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20">
            <div className="text-3xl mb-3">🎉</div>
            <h3 className="font-display text-lg font-bold text-neon-cyan tracking-wide mb-2">
              YOU'RE IN!
            </h3>
            <p className="font-body text-sm text-text-secondary">
              We'll hit you up when it's your turn. In the meantime, tell your friends — the more
              players, the better the games.
            </p>
          </div>
        )}

        {/* Social proof stats */}
        <div className="mt-10 flex flex-wrap justify-center gap-8">
          {[
            { value: '12,847', label: 'Creators waiting' },
            { value: '340+', label: 'Games in beta' },
            { value: '2.1M', label: 'Plays this week' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-display text-xl sm:text-2xl font-bold text-neon-cyan tracking-wider">
                {stat.value}
              </div>
              <div className="font-body text-xs text-text-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
