import { useEffect, useState } from 'react';
import { useReveal } from '../hooks';

const MOCK_GAMES = [
  {
    id: 1,
    title: 'Pixel Dash Royale',
    creator: 'xN00bSlayer',
    plays: 12847,
    likes: 892,
    genre: 'Platformer',
    color: '#00f0ff',
    trending: true,
  },
  {
    id: 2,
    title: 'Cats vs Lasers',
    creator: 'AI_GameMaster',
    plays: 9421,
    likes: 654,
    genre: 'Dodger',
    color: '#b347ff',
    trending: true,
  },
  {
    id: 3,
    title: 'Quiz Arena: Meme Edition',
    creator: 'memeking42',
    plays: 18293,
    likes: 1203,
    genre: 'Trivia',
    color: '#ff2d7c',
    trending: true,
  },
  {
    id: 4,
    title: 'Gravity Flip',
    creator: 'indie_dev_sam',
    plays: 7632,
    likes: 489,
    genre: 'Puzzle',
    color: '#39ff14',
    trending: false,
  },
  {
    id: 5,
    title: 'Tower Defense: Alien Swarm',
    creator: 'buildQueen',
    plays: 5891,
    likes: 312,
    genre: 'Strategy',
    color: '#00f0ff',
    trending: false,
  },
  {
    id: 6,
    title: 'Speed Typer Championship',
    creator: 'keyboardwarrior',
    plays: 22140,
    likes: 1567,
    genre: 'Racing',
    color: '#b347ff',
    trending: true,
  },
];

const LEADERBOARD_ENTRIES = [
  { rank: 1, name: 'xN00bSlayer', score: 99820, avatar: '🎮' },
  { rank: 2, name: 'speedrunner_jess', score: 98450, avatar: '⚡' },
  { rank: 3, name: 'pixel_pro', score: 97100, avatar: '🏆' },
  { rank: 4, name: 'AI_GameMaster', score: 95230, avatar: '🤖' },
  { rank: 5, name: 'memeking42', score: 93180, avatar: '👑' },
];

function GameCard({ game, index }) {
  return (
    <div
      className="group relative bg-void-card border border-void-border/40 rounded-xl p-4
        hover:border-opacity-80 transition-all duration-200 cursor-pointer btn-press"
      style={{ borderColor: `${game.color}20` }}
    >
      {/* Game thumbnail placeholder */}
      <div
        className="w-full h-28 rounded-lg mb-3 flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${game.color}15, ${game.color}05)`,
          border: `1px solid ${game.color}20`,
        }}
      >
        <span className="font-display text-3xl opacity-40" style={{ color: game.color }}>
          {game.genre === 'Platformer' && '🏃'}
          {game.genre === 'Dodger' && '🐱'}
          {game.genre === 'Trivia' && '🧠'}
          {game.genre === 'Puzzle' && '🧩'}
          {game.genre === 'Strategy' && '🏰'}
          {game.genre === 'Racing' && '⌨️'}
        </span>
      </div>

      {/* Trending badge */}
      {game.trending && (
        <span
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-display font-bold tracking-wider"
          style={{
            background: `${game.color}20`,
            color: game.color,
            border: `1px solid ${game.color}30`,
          }}
        >
          🔥 TRENDING
        </span>
      )}

      {/* Info */}
      <h4 className="font-display text-sm font-bold text-text-primary mb-1 truncate tracking-wide">
        {game.title}
      </h4>
      <p className="font-body text-xs text-text-muted mb-2">by {game.creator}</p>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-text-muted font-body">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2">
            <path d="M8 3L8 13M3 8L8 3L13 8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {game.plays.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          ❤️ {game.likes.toLocaleString()}
        </span>
        <span
          className="ml-auto px-2 py-0.5 rounded text-[10px] font-display tracking-wider"
          style={{ background: `${game.color}10`, color: game.color }}
        >
          {game.genre.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

function LiveLeaderboard() {
  const [entries, setEntries] = useState(LEADERBOARD_ENTRIES);

  // Simulate live score updates
  useEffect(() => {
    const interval = setInterval(() => {
      setEntries((prev) =>
        prev.map((entry) => ({
          ...entry,
          score: entry.score + Math.floor(Math.random() * 50),
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#00f0ff', '#b347ff'];

  return (
    <div className="bg-void-card border border-void-border/40 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-lime opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-lime" />
        </span>
        <h4 className="font-display text-sm font-bold text-text-primary tracking-wider">
          LIVE LEADERBOARD
        </h4>
      </div>

      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div
            key={entry.rank}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-void-lighter/50 transition-colors"
          >
            <span
              className="font-display text-sm font-bold w-6 text-center"
              style={{ color: rankColors[i] }}
            >
              #{entry.rank}
            </span>
            <span className="text-lg">{entry.avatar}</span>
            <span className="font-body text-sm text-text-primary flex-1 truncate">
              {entry.name}
            </span>
            <span className="font-display text-xs font-bold text-neon-cyan tabular-nums tracking-wider">
              {entry.score.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-void-border/30 text-center">
        <span className="font-body text-xs text-text-muted">
          Scores update in real-time • 2,847 players online
        </span>
      </div>
    </div>
  );
}

export default function TrendingGames() {
  const [ref, isVisible] = useReveal(0.1);

  return (
    <section id="trending" className="relative py-24 px-4">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-void-border to-transparent" />

      <div ref={ref} className={`max-w-6xl mx-auto ${isVisible ? 'reveal' : 'opacity-0'}`}>
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide mb-4">
            <span className="text-neon-pink" style={{ textShadow: '0 0 8px rgba(255,45,124,0.5)' }}>
              TRENDING
            </span>{' '}
            <span className="text-text-primary">RIGHT NOW</span>
          </h2>
          <p className="font-body text-text-secondary text-lg max-w-md mx-auto">
            See what the community is building and playing. Join the competition.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Games Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {MOCK_GAMES.map((game, i) => (
              <GameCard key={game.id} game={game} index={i} />
            ))}
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <LiveLeaderboard />
          </div>
        </div>
      </div>
    </section>
  );
}
