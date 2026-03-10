/**
 * ProceduralBrushEngine.ts
 * Full procedural brush generator with HSL-based effects for artistic brush types.
 * Defines ProceduralBrushType, utilities (hash2D, color conversion, geometry caching),
 * and generateProceduralStamp() returning procedural pixel samples for various artistic brush types.
 * All alpha values are properly floored to ensure consistent opacity behavior.
 */

export type ProceduralBrushType =
  | "grass"
  | "stone"
  | "cloud"
  | "metallic"
  | "calligraphy"
  | "fur"
  | "sparkle"
  | "dither"
  | "bark";

/**
 * Simple 2D hash function for procedural randomness
 */
function hash2D(x: number, y: number, seed = 0): number {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296; // Normalize to [0, 1]
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      case bn:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }

  return [h, s, l];
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tn = t;
      if (tn < 0) tn += 1;
      if (tn > 1) tn -= 1;
      if (tn < 1 / 6) return p + (q - p) * 6 * tn;
      if (tn < 1 / 2) return q;
      if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Apply HSL shift to RGB color
 */
function applyHslShift(
  r: number,
  g: number,
  b: number,
  satShift: number,
  lightShift: number,
): [number, number, number] {
  let [h, s, l] = rgbToHsl(r, g, b);

  // Apply shifts
  s = Math.max(0, Math.min(1, s + satShift));
  l = Math.max(0, Math.min(1, l + lightShift));

  return hslToRgb(h, s, l);
}

/**
 * Geometry cache for circle patterns
 */
const circleCache = new Map<number, Array<{ x: number; y: number }>>();

function getCirclePoints(radius: number): Array<{ x: number; y: number }> {
  if (circleCache.has(radius)) {
    return circleCache.get(radius)!;
  }

  const points: Array<{ x: number; y: number }> = [];
  const r2 = radius * radius;

  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y <= r2) {
        points.push({ x, y });
      }
    }
  }

  circleCache.set(radius, points);
  return points;
}

/**
 * Generate procedural stamp for a given brush type
 * Returns array of pixel samples with RGBA values
 * baseA parameter is the finalAlpha computed from brushOpacity in ToolController
 */
export function generateProceduralStamp(
  brushType: ProceduralBrushType,
  size: number,
  baseR: number,
  baseG: number,
  baseB: number,
  baseA: number,
  randomness: number,
  saturationShift: number,
  lightnessShift: number,
): Array<{ x: number; y: number; r: number; g: number; b: number; a: number }> {
  const pixels: Array<{
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    a: number;
  }> = [];
  const radius = Math.floor(size / 2);

  // Apply HSL shift to base color
  const [shiftedR, shiftedG, shiftedB] = applyHslShift(
    baseR,
    baseG,
    baseB,
    saturationShift,
    lightnessShift,
  );

  switch (brushType) {
    case "grass":
      // Grass brush: vertical streaks with random length
      for (let i = 0; i < size * 3; i++) {
        const x = Math.floor(hash2D(i, 0, 1) * size) - radius;
        const length = Math.floor(hash2D(i, 1, 2) * size * 0.5) + 1;
        const startY = Math.floor(hash2D(i, 2, 3) * size) - radius;

        for (let j = 0; j < length; j++) {
          const y = startY + j;
          const alpha = baseA * (1 - j / length);
          pixels.push({
            x,
            y,
            r: shiftedR,
            g: shiftedG,
            b: shiftedB,
            a: Math.floor(alpha),
          });
        }
      }
      break;

    case "stone": {
      // Stone brush: irregular chunky pattern
      const circlePoints = getCirclePoints(radius);
      for (const point of circlePoints) {
        const noise = hash2D(point.x, point.y, 4);
        if (noise > 0.3) {
          const alphaMod = 0.7 + noise * 0.3;
          pixels.push({
            x: point.x,
            y: point.y,
            r: shiftedR,
            g: shiftedG,
            b: shiftedB,
            a: Math.floor(baseA * alphaMod),
          });
        }
      }
      break;
    }

    case "cloud":
      // Cloud brush: soft, diffuse edges
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const falloff = 1 - dist / radius;
            const noise = hash2D(dx, dy, 5) * 0.3;
            const alpha = baseA * falloff * (0.7 + noise);
            pixels.push({
              x: dx,
              y: dy,
              r: shiftedR,
              g: shiftedG,
              b: shiftedB,
              a: Math.floor(alpha),
            });
          }
        }
      }
      break;

    case "metallic":
      // Metallic brush: sharp edges with highlights
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const angle = Math.atan2(dy, dx);
            const highlight = Math.abs(Math.sin(angle * 3)) * 0.3;
            const lightness = lightnessShift + highlight;
            const [hr, hg, hb] = applyHslShift(
              baseR,
              baseG,
              baseB,
              saturationShift,
              lightness,
            );
            pixels.push({
              x: dx,
              y: dy,
              r: hr,
              g: hg,
              b: hb,
              a: Math.floor(baseA),
            });
          }
        }
      }
      break;

    case "calligraphy":
      // Calligraphy brush: angled, pressure-sensitive
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const angle = Math.atan2(dy, dx);
          const rotated = Math.abs(Math.cos(angle + Math.PI / 4));
          if (rotated > 0.3) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
              const alpha = baseA * rotated;
              pixels.push({
                x: dx,
                y: dy,
                r: shiftedR,
                g: shiftedG,
                b: shiftedB,
                a: Math.floor(alpha),
              });
            }
          }
        }
      }
      break;

    case "fur":
      // Fur brush: radial streaks from center
      for (let i = 0; i < size * 5; i++) {
        const angle = hash2D(i, 0, 6) * Math.PI * 2;
        const length = hash2D(i, 1, 7) * radius;
        const steps = Math.floor(length);

        for (let j = 0; j < steps; j++) {
          const x = Math.floor(Math.cos(angle) * j);
          const y = Math.floor(Math.sin(angle) * j);
          const alpha = baseA * (1 - j / steps);
          pixels.push({
            x,
            y,
            r: shiftedR,
            g: shiftedG,
            b: shiftedB,
            a: Math.floor(alpha),
          });
        }
      }
      break;

    case "sparkle":
      // Sparkle brush: random bright points
      for (let i = 0; i < size * 2; i++) {
        const x = Math.floor(hash2D(i, 0, 8) * size) - radius;
        const y = Math.floor(hash2D(i, 1, 9) * size) - radius;
        const brightness = hash2D(i, 2, 10);
        const lightness = lightnessShift + brightness * 0.5;
        const [sr, sg, sb] = applyHslShift(
          baseR,
          baseG,
          baseB,
          saturationShift,
          lightness,
        );
        pixels.push({ x, y, r: sr, g: sg, b: sb, a: Math.floor(baseA) });
      }
      break;

    case "dither":
      // Dither brush: checkerboard pattern
      for (let dy = -radius; dy < size - radius; dy++) {
        for (let dx = -radius; dx < size - radius; dx++) {
          if ((dx + dy) % 2 === 0) {
            pixels.push({
              x: dx,
              y: dy,
              r: shiftedR,
              g: shiftedG,
              b: shiftedB,
              a: Math.floor(baseA),
            });
          }
        }
      }
      break;

    case "bark":
      // Bark brush: horizontal streaks with noise
      for (let dy = -radius; dy <= radius; dy++) {
        const noise = hash2D(0, dy, 11);
        const width = Math.floor(size * (0.5 + noise * 0.5));
        for (let dx = -width / 2; dx < width / 2; dx++) {
          const alpha = baseA * (0.6 + noise * 0.4);
          pixels.push({
            x: dx,
            y: dy,
            r: shiftedR,
            g: shiftedG,
            b: shiftedB,
            a: Math.floor(alpha),
          });
        }
      }
      break;
  }

  // Apply randomness to all pixels
  if (randomness > 0) {
    return pixels.filter(
      () => hash2D(Math.random() * 1000, Math.random() * 1000, 12) > randomness,
    );
  }

  return pixels;
}
