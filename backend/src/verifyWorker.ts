import { parentPort, workerData } from 'node:worker_threads';
import { EntityEngine } from '../../frontend/src/engine/entityEngine.js';
try {
  const canvas = { width: 800, height: 450, getContext: () => ({}) } as any;
  const engine = new EntityEngine(canvas, workerData.schema, workerData.payload.rngSeed, {}, true);
  parentPort!.postMessage(engine.simulate(workerData.payload));
} catch { parentPort!.postMessage({ error: 'Replay could not be verified' }); }
