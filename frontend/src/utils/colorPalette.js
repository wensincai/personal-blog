/**
 * 配色工具 - 色阶生成与和谐配色
 * 参考 tailwindcolorshades + kigen.design 的配色算法
 */

// ============ 基础转换函数 ============

function hexToRgb(hex) {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

function hslToHex(h, s, l) {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// ============ 色阶生成 (Tailwind 风格) ============

const SHADE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Tailwind 默认色阶的亮度映射 (近似)
const DEFAULT_LIGHTNESS_MAP = {
  50:  95.5,
  100: 91.0,
  200: 82.0,
  300: 72.5,
  400: 62.0,
  500: 52.0,
  600: 42.5,
  700: 33.0,
  800: 23.5,
  900: 14.0,
  950: 8.0,
};

// 根据基色亮度自适应调整映射，让基色尽量对齐到 500
function generateLightnessMap(baseL) {
  // 基色在 500 位置，计算偏移量
  const offset = baseL - DEFAULT_LIGHTNESS_MAP[500];
  const map = {};
  for (const stop of SHADE_STOPS) {
    let l = DEFAULT_LIGHTNESS_MAP[stop] + offset;
    // 限制在合理范围内
    if (stop <= 100) l = Math.min(l, 98);
    if (stop >= 900) l = Math.max(l, 3);
    map[stop] = Math.max(2, Math.min(98, l));
  }
  return map;
}

function generateShades(baseHex) {
  const baseHsl = hexToHsl(baseHex);
  const lightnessMap = generateLightnessMap(baseHsl.l);
  const shades = {};

  for (const stop of SHADE_STOPS) {
    let s = baseHsl.s;
    let l = lightnessMap[stop];

    // 高亮区降低饱和度，避免过艳
    if (stop <= 100) {
      s = s * 0.4;
    } else if (stop <= 200) {
      s = s * 0.6;
    } else if (stop <= 300) {
      s = s * 0.8;
    }

    // 极暗区略微降低饱和度，避免浑浊
    if (stop >= 900) {
      s = Math.min(s * 1.1, 100);
    }

    shades[stop] = hslToHex(baseHsl.h, s, l);
  }

  return shades;
}

// ============ 和谐配色 (类似 kigen.design) ============

function generateHarmony(baseHex) {
  const { h, s, l } = hexToHsl(baseHex);

  const harmonies = {
    // 互补色
    complementary: hslToHex((h + 180) % 360, Math.min(s * 0.95, 95), Math.max(l, 35)),
    // 类比色 (左)
    analogous1: hslToHex((h + 30) % 360, s * 0.9, l),
    // 类比色 (右)
    analogous2: hslToHex((h - 30 + 360) % 360, s * 0.9, l),
    // 三角色 1
    triadic1: hslToHex((h + 120) % 360, s * 0.9, Math.max(l, 30)),
    // 三角色 2
    triadic2: hslToHex((h + 240) % 360, s * 0.9, Math.max(l, 30)),
    // 分裂互补 1
    split1: hslToHex((h + 150) % 360, s * 0.85, Math.max(l, 30)),
    // 分裂互补 2
    split2: hslToHex((h + 210) % 360, s * 0.85, Math.max(l, 30)),
    // 单色调亮
    monoLight: hslToHex(h, s * 0.5, Math.min(l + 35, 95)),
    // 单色调暗
    monoDark: hslToHex(h, Math.min(s * 1.1, 100), Math.max(l - 25, 10)),
  };

  return harmonies;
}

// ============ 随机生成和谐基色 ============

function randomBaseColor() {
  const hue = Math.floor(Math.random() * 360);
  const sat = 55 + Math.floor(Math.random() * 35); // 55-90%
  const light = 45 + Math.floor(Math.random() * 20); // 45-65%
  return hslToHex(hue, sat, light);
}

function randomPalette() {
  const base = randomBaseColor();
  return {
    base,
    shades: generateShades(base),
    harmony: generateHarmony(base),
  };
}

// ============ 导出 ============

export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hexToHsl,
  hslToHex,
  generateShades,
  generateHarmony,
  randomBaseColor,
  randomPalette,
  SHADE_STOPS,
};

export default {
  generateShades,
  generateHarmony,
  randomPalette,
  hexToHsl,
  hslToHex,
};
