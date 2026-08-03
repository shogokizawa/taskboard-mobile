let counter = 0;

/**
 * ID生成。Hermes には crypto.randomUUID が無いので自前で組み立てる。
 * 同一ミリ秒内の衝突をカウンタで防ぐ。
 */
export function uid(): string {
  counter = (counter + 1) % 0xffff;
  return [
    Date.now().toString(36),
    counter.toString(36).padStart(3, '0'),
    Math.random().toString(36).slice(2, 8),
  ].join('-');
}
