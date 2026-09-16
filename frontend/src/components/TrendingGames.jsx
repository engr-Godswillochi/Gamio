import React from 'react';
import DiscoveryFeed from './feed/DiscoveryFeed';

export default function TrendingGames({ onPlayGame, onRemixGame }) {
  return <DiscoveryFeed onPlayGame={onPlayGame} onRemixGame={onRemixGame} />;
}
