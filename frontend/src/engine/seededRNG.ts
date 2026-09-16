/**
 * Seeded Pseudo-Random Number Generator using Mulberry32.
 * Crucial for deterministic game replays and Gameplay Cam clip generation.
 * (PRD Section 7.3 & Guiderail hard requirement)
 */
export class SeededRNG {
  private initialSeedStr: string;
  private state: number;

  constructor(seedStr?: string) {
    const s = seedStr || SeededRNG.generateRandomSeed();
    this.initialSeedStr = s;
    this.state = SeededRNG.hashString(s);
  }

  /**
   * Generates a 32-bit hash integer from a string seed.
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash >>> 0;
  }

  /**
   * Generates a fresh random seed string.
   */
  public static generateRandomSeed(): string {
    const values = new Uint32Array(2);
    crypto.getRandomValues(values);
    return `${values[0].toString(36)}${values[1].toString(36)}`;
  }

  /**
   * Returns a float in range [0, 1) using Mulberry32 algorithm.
   */
  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in range [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    const minCeil = Math.ceil(min);
    const maxFloor = Math.floor(max);
    return Math.floor(this.nextFloat() * (maxFloor - minCeil + 1)) + minCeil;
  }

  /**
   * Selects a random element from an array.
   */
  public choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot select from an empty array");
    }
    const index = Math.floor(this.nextFloat() * array.length);
    return array[index];
  }

  /**
   * Returns true with the specified probability [0.0 - 1.0].
   */
  public chance(probability: number): boolean {
    return this.nextFloat() < probability;
  }

  /**
   * Gets the original seed string.
   */
  public getSeed(): string {
    return this.initialSeedStr;
  }
}
