import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_RUNNER_SCHEMA } from '../../types/gameSchema';
import { EndlessRunnerEngine } from '../../engine/templates/endlessRunner';
import { TopDownDodgeEngine } from '../../engine/templates/topDownDodge';
import { PlatformerEngine } from '../../engine/templates/platformer';
import { EntityEngine } from '../../engine/entityEngine';
import RemixLineageTree from '../remix/RemixLineageTree';
import { GameplayCam } from '../../engine/gameplayCam';
import { apiUrl } from '../../lib/api';

export default function GamePlayer({ slug = 'neon-dash-runner', onRemixClick, onBackClick, onNavigateSlug }) {
  const [gameRecord, setGameRecord] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState('CyberRunner');
  const [currentScore, setCurrentScore] = useState(0);
  const [lastGameOver, setLastGameOver] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecordingClip, setIsRecordingClip] = useState(false);

  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  // Fetch Game Schema & Leaderboard
  useEffect(() => {
    let active = true;

    async function loadGameAndLeaderboard() {
      try {
        const gameRes = await fetch(apiUrl(`/games/${encodeURIComponent(slug)}`));
        if (!gameRes.ok) throw new Error(`Could not load game (${gameRes.status})`);
        const gameData = await gameRes.json();
        if (!active) return;
        setGameRecord(gameData);

        const targetId = gameData.id || slug;
        try {
          const lbRes = await fetch(apiUrl(`/leaderboards/${encodeURIComponent(targetId)}`));
          if (!lbRes.ok) throw new Error(`Could not load leaderboard (${lbRes.status})`);
          const lbData = await lbRes.json();
          if (active) setLeaderboard(lbData.scores || []);
        } catch (leaderboardError) {
          console.warn('Could not load leaderboard:', leaderboardError);
          if (active) setLeaderboard([]);
        }
      } catch (err) {
        console.warn('Backend offline or failed to fetch, using default runner:', err);
        if (!active) return;
        setLeaderboard([]);
        setGameRecord({
          id: 'demo-runner',
          title: DEFAULT_RUNNER_SCHEMA.title,
          slug: DEFAULT_RUNNER_SCHEMA.slug,
          template: 'runner',
          schema: DEFAULT_RUNNER_SCHEMA,
        });
      }
    }
    loadGameAndLeaderboard();
    return () => { active = false; };
  }, [slug]);

  // Mount Game Engine dynamically based on template type
  useEffect(() => {
    if (!canvasRef.current || !gameRecord?.schema) return;

    if (engineRef.current) {
      engineRef.current.detachEvents();
    }

    try {
      const callbacks = {
        onScoreChange: (score) => setCurrentScore(score),
        onGameOver: (finalScore, replayPayload) => {
          setLastGameOver({ score: finalScore, replay: replayPayload });
          handleAutoSubmit(finalScore, replayPayload);
        },
      };

      if (gameRecord.schema && Array.isArray(gameRecord.schema.entities)) {
        engineRef.current = new EntityEngine(canvasRef.current, gameRecord.schema, undefined, callbacks);
      } else {
        const tpl = gameRecord.template || gameRecord.schema.template || 'runner';
        if (tpl === 'dodge') {
          engineRef.current = new TopDownDodgeEngine(canvasRef.current, gameRecord.schema, undefined, callbacks);
        } else if (tpl === 'platformer') {
          engineRef.current = new PlatformerEngine(canvasRef.current, gameRecord.schema, undefined, callbacks);
        } else {
          engineRef.current = new EndlessRunnerEngine(canvasRef.current, gameRecord.schema, undefined, callbacks);
        }
      }
    } catch (e) {
      console.error('Failed to initialize engine:', e);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.detachEvents();
      }
    };
  }, [gameRecord]);

  const handleAutoSubmit = async (scoreVal, replayPayload) => {
    setIsSubmitting(true);
    try {
      const targetGameId = gameRecord?.id || 'demo-runner';

      let replayId = null;
      try {
        const replayRes = await fetch(apiUrl('/replays'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: targetGameId,
            rngSeed: replayPayload.rngSeed,
            inputLog: replayPayload.inputLog,
            durationMs: replayPayload.durationMs,
          }),
        });
        if (replayRes.ok) {
          const replayData = await replayRes.json();
          replayId = replayData.id || null;
        }
      } catch (e) {
        console.warn('Could not post replay:', e);
      }

      const scoreRes = await fetch(apiUrl('/scores'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: targetGameId,
          username: playerName || 'Anonymous Runner',
          value: scoreVal,
          metricType: 'score',
          replayId,
        }),
      });

      if (scoreRes.ok) {
        const lbRes = await fetch(apiUrl(`/leaderboards/${encodeURIComponent(targetGameId)}`));
        const lbData = await lbRes.json();
        setLeaderboard(lbData.scores || []);
      }
    } catch (err) {
      console.error('Failed to submit score:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayReplay = () => {
    if (engineRef.current && lastGameOver?.replay && engineRef.current.startReplay) {
      engineRef.current.startReplay(lastGameOver.replay);
    }
  };

  const handleRecordGameplayCam = async () => {
    if (!canvasRef.current || !engineRef.current || !lastGameOver?.replay) return;

    setIsRecordingClip(true);
    const cam = new GameplayCam(canvasRef.current);
    cam.startRecording();

    // Start deterministic replay
    engineRef.current.startReplay(lastGameOver.replay);

    const clipDuration = Math.min(lastGameOver.replay.durationMs || 5000, 10000);
    setTimeout(async () => {
      await cam.stopAndDownload(`gamio-${slug}-gameplay-clip.webm`);
      setIsRecordingClip(false);
    }, clipDuration + 200);
  };

  const handleRestart = () => {
    if (engineRef.current) {
      setLastGameOver(null);
      engineRef.current.resetGame();
      engineRef.current.startPlay();
    }
  };

  const activeSchema = gameRecord?.schema || DEFAULT_RUNNER_SCHEMA;

  return (
    <div className="min-h-screen bg-[#07040d] text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-purple-900/40 bg-[#0d071a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackClick}
            className="text-xs font-bold text-purple-300 hover:text-white px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-800/60 transition-all"
          >
            ← Home Feed
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center space-x-2">
              <span>{activeSchema.title}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                {activeSchema.template}
              </span>
            </h1>
            <p className="text-xs text-purple-300/60">{activeSchema.description || 'Created on Gamio'}</p>
          </div>
        </div>

        <button
          onClick={() => onRemixClick && onRemixClick(activeSchema)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold shadow-lg shadow-purple-600/25 active:scale-95 transition-all flex items-center space-x-2"
        >
          <span>🔄 Remix This Game</span>
        </button>
      </header>

      {/* Main Game Host Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Canvas Host */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="bg-[#0f091f]/90 border border-purple-900/40 rounded-2xl p-4 shadow-2xl flex flex-col items-center justify-center relative">
            <div className="relative rounded-xl overflow-hidden border border-purple-800/50 shadow-2xl w-full flex items-center justify-center bg-black">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full max-w-[640px] h-auto aspect-[16/9] block cursor-pointer"
                onClick={handleRestart}
              />
            </div>

            {/* Game Controls Footer */}
            <div className="w-full mt-4 flex flex-wrap items-center justify-between gap-4 px-2">
              <div className="flex items-center space-x-3 text-xs text-purple-300/80">
                <span className="font-semibold">Controls:</span>
                <kbd className="px-2 py-1 bg-purple-950 border border-purple-800 rounded font-mono text-cyan-300">Space</kbd>
                <span>/</span>
                <kbd className="px-2 py-1 bg-purple-950 border border-purple-800 rounded font-mono text-cyan-300">Arrows / WASD</kbd>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {lastGameOver && engineRef.current?.startReplay && (
                  <>
                    <button
                      onClick={handlePlayReplay}
                      className="px-3 py-1.5 rounded-lg bg-yellow-950/60 border border-yellow-700/50 text-yellow-300 text-xs font-bold hover:bg-yellow-900/60 transition-all"
                    >
                      ▶ Replay
                    </button>
                    <button
                      onClick={handleRecordGameplayCam}
                      disabled={isRecordingClip}
                      className="px-3 py-1.5 rounded-lg bg-fuchsia-950/80 border border-fuchsia-700/60 text-fuchsia-300 text-xs font-bold hover:bg-fuchsia-900/80 transition-all flex items-center space-x-1"
                    >
                      <span>{isRecordingClip ? '🔴 Recording Video Clip...' : '🎥 Gameplay Cam Clip'}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={handleRestart}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  ▶ Start Run
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Leaderboard & Remix Lineage Tree */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="bg-[#0f091f]/90 border border-purple-900/40 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <h3 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
                <span>🏆 Arcade Leaderboard</span>
              </h3>
              <span className="text-[10px] text-purple-400/60 font-mono">TOP 50</span>
            </div>

            {/* Username Input */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-purple-300/80 font-semibold whitespace-nowrap">Your Tag:</span>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={16}
                className="bg-purple-950/70 border border-purple-800/60 text-xs text-white rounded-lg px-2.5 py-1.5 focus:border-cyan-400 focus:outline-none w-full"
                placeholder="Enter player name..."
              />
            </div>

            {/* Leaderboard Entries List */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-xs text-purple-400/50">
                  No high scores recorded yet. Be the first to set a record!
                </div>
              ) : (
                leaderboard.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                      idx === 0
                        ? 'bg-gradient-to-r from-yellow-950/50 to-amber-900/30 border-yellow-600/40 text-yellow-200'
                        : idx === 1
                        ? 'bg-slate-900/40 border-slate-700/50 text-slate-200'
                        : idx === 2
                        ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                        : 'bg-purple-950/20 border-purple-900/30 text-purple-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold w-5 text-center text-purple-400/80">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <span className="font-semibold truncate max-w-[110px]">{entry.username}</span>
                    </div>
                    <span className="font-extrabold font-mono text-cyan-300">{entry.value} pts</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Lineage Tree */}
          <RemixLineageTree
            gameId={gameRecord?.id || slug}
            onSelectGame={(targetSlug) => onNavigateSlug && onNavigateSlug(targetSlug)}
          />
        </div>
      </div>
    </div>
  );
}
