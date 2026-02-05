/**
 * Hash utilities
 *
 * Shared between AEP scripts and SnapLogic scripts
 */

/**
 * Rolling hash function for generating short, deterministic IDs
 *
 * Algorithm:
 * - Uses polynomial rolling hash with base 53
 * - MOD is 10^length + 7 (prime-adjacent for better distribution)
 * - Output is base-36 encoded for compact representation
 *
 * @param s - String to hash
 * @param length - Length of hash output (default 10)
 * @returns Hashed string in base 36
 */
export default function rollingHash(s: string, length?: number): string {
  const len = length || 10;
  if (!s) return '';

  const BASE = 53;
  const MOD = 10 ** len + 7;

  let hash = 0;
  let basePower = 1;

  for (let idx = 0; idx < s.length; idx += 1) {
    hash = (hash + (s.charCodeAt(idx) - 97 + 1) * basePower) % MOD;
    basePower = (basePower * BASE) % MOD;
  }

  return ((hash + MOD) % MOD).toString(36);
}
