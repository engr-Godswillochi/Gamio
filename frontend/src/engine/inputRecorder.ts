import { ReplayPayload, ReplayTickInput } from '../types/gameSchema.js';

export class InputRecorder {
  private gameId: string;
  private rngSeed: string;
  private startTime: number = 0;
  private activeKeys: Set<string> = new Set();
  private inputLog: ReplayTickInput[] = [];
  private lastRecordedKeysStr: string = '';
  private isRecording: boolean = false;

  constructor(gameId: string, rngSeed: string) {
    this.gameId = gameId;
    this.rngSeed = rngSeed;
  }

  public start(): void {
    this.startTime = performance.now();
    this.activeKeys.clear();
    this.inputLog = [];
    this.lastRecordedKeysStr = '';
    this.isRecording = true;
  }

  public handleKeyDown(key: string): void {
    if (!this.isRecording) return;
    this.activeKeys.add(key);
  }

  public handleKeyUp(key: string): void {
    if (!this.isRecording) return;
    this.activeKeys.delete(key);
  }

  public clearKeys(): void { this.activeKeys.clear(); }

  /**
   * Called on every game frame/tick update.
   */
  public recordTick(tickIndex: number): void {
    if (!this.isRecording) return;

    const currentKeysArray = Array.from(this.activeKeys).sort();
    const currentKeysStr = currentKeysArray.join(',');

    // Record when keys change or on tick zero
    if (tickIndex === 0 || currentKeysStr !== this.lastRecordedKeysStr) {
      const timeMs = Math.round(performance.now() - this.startTime);
      this.inputLog.push({
        tick: tickIndex,
        timeMs,
        keys: currentKeysArray
      });
      this.lastRecordedKeysStr = currentKeysStr;
    }
  }

  public stop(): ReplayPayload {
    this.isRecording = false;
    const durationMs = Math.round(performance.now() - this.startTime);
    return {
      gameId: this.gameId,
      rngSeed: this.rngSeed,
      inputLog: this.inputLog,
      durationMs
    };
  }

  public getLog(): ReplayTickInput[] {
    return this.inputLog;
  }
}

export class ReplayPlayer {
  private inputLog: ReplayTickInput[];
  private logIndex: number = 0;
  private currentKeys: Set<string> = new Set();

  constructor(inputLog: ReplayTickInput[]) {
    // Sort input log by tick index
    this.inputLog = [...inputLog].sort((a, b) => a.tick - b.tick);
  }

  /**
   * Advances replay to the target tick index and returns active keys for that tick.
   */
  public getKeysForTick(tickIndex: number): Set<string> {
    while (
      this.logIndex < this.inputLog.length &&
      this.inputLog[this.logIndex].tick <= tickIndex
    ) {
      this.currentKeys = new Set(this.inputLog[this.logIndex].keys);
      this.logIndex++;
    }
    return this.currentKeys;
  }

  public reset(): void {
    this.logIndex = 0;
    this.currentKeys.clear();
  }
}
