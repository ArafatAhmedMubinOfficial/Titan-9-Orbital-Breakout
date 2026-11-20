import React, { useEffect, useRef } from 'react';
import { ART_ASSETS, ROOMS } from '../game/data/world';
import { CharacterAppearance, CombatState, RoomId, StageActivity, StageFxEvent } from '../game/types';

interface LiveCharacterStageProps {
  roomId: RoomId;
  activity: StageActivity;
  activityLabel: string;
  appearance: CharacterAppearance;
  weaponId: string | null;
  armorId: string | null;
  combat: CombatState | null;
  fxEvent: StageFxEvent | null;
  compact?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  text?: string;
}

interface RigPose {
  hipY: number;
  torsoLean: number;
  headTilt: number;
  bodyRotate: number;
  lThigh: number;
  lShin: number;
  rThigh: number;
  rShin: number;
  lUpper: number;
  lFore: number;
  rUpper: number;
  rFore: number;
}

type ExtraHairStyle = CharacterAppearance['hairStyle'] | 'ponytail' | 'bob' | 'buzz' | 'riot_helmet';

interface DollConfig {
  facing: 1 | -1;
  suitColor: string;
  pantsColor?: string;
  skinTone: string;
  hairColor: string;
  eyeColor: string;
  hairStyle: ExtraHairStyle;
  armorId: string | null;
  weaponId: string | null;
  glasses?: boolean;
  sleeveless?: boolean;
  labCoat?: boolean;
  collar?: boolean;
  scar?: boolean;
  build?: number; // shoulder/limb thickness multiplier
  scale?: number;
  expression: 'neutral' | 'focused' | 'sleeping' | 'talking' | 'eating' | 'hurt';
  rimColor: string;
  flash?: boolean;
  t: number;
  mode: StageActivity;
  pose: RigPose;
}

// Module-level image cache for painted room backdrops
const backdropCache: Partial<Record<string, HTMLImageElement>> = {};
function getBackdropImage(src: string): HTMLImageElement | null {
  if (typeof window === 'undefined') return null;
  let img = backdropCache[src];
  if (!img) {
    img = new Image();
    img.src = src;
    backdropCache[src] = img;
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

// Preload all room art once
if (typeof window !== 'undefined') {
  Object.values(ART_ASSETS).forEach((src) => getBackdropImage(src));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function adjustHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = clamp(((num >> 16) & 0xff) + amount, 0, 255);
  const g = clamp(((num >> 8) & 0xff) + amount, 0, 255);
  const b = clamp((num & 0xff) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

const ROOM_LIGHTING: Record<
  RoomId,
  { rim: string; tint: string; floorGlow: string; fallbackTop: string; fallbackBot: string }
> = {
  cell: {
    rim: 'rgba(135, 175, 255, 0.55)',
    tint: 'rgba(26, 22, 58, 0.36)',
    floorGlow: 'rgba(92, 118, 210, 0.22)',
    fallbackTop: '#1B1638',
    fallbackBot: '#292252',
  },
  hub: {
    rim: 'rgba(155, 185, 255, 0.55)',
    tint: 'rgba(28, 22, 62, 0.32)',
    floorGlow: 'rgba(120, 130, 225, 0.22)',
    fallbackTop: '#1D183D',
    fallbackBot: '#30265E',
  },
  mineshaft: {
    rim: 'rgba(255, 186, 82, 0.7)',
    tint: 'rgba(34, 18, 18, 0.32)',
    floorGlow: 'rgba(255, 165, 58, 0.28)',
    fallbackTop: '#241826',
    fallbackBot: '#3A2322',
  },
  medbay: {
    rim: 'rgba(78, 240, 188, 0.65)',
    tint: 'rgba(12, 34, 38, 0.28)',
    floorGlow: 'rgba(52, 211, 153, 0.25)',
    fallbackTop: '#102833',
    fallbackBot: '#183C45',
  },
  yard: {
    rim: 'rgba(255, 200, 130, 0.6)',
    tint: 'rgba(24, 20, 44, 0.32)',
    floorGlow: 'rgba(240, 170, 95, 0.22)',
    fallbackTop: '#1C1B33',
    fallbackBot: '#2D2847',
  },
  market: {
    rim: 'rgba(218, 125, 255, 0.65)',
    tint: 'rgba(32, 14, 42, 0.34)',
    floorGlow: 'rgba(192, 92, 245, 0.26)',
    fallbackTop: '#231333',
    fallbackBot: '#381B45',
  },
  command: {
    rim: 'rgba(255, 198, 128, 0.65)',
    tint: 'rgba(14, 16, 40, 0.28)',
    floorGlow: 'rgba(125, 115, 235, 0.25)',
    fallbackTop: '#0F112B',
    fallbackBot: '#211E4A',
  },
};

const DEFAULT_POSE: RigPose = {
  hipY: 0,
  torsoLean: 0.03,
  headTilt: 0,
  bodyRotate: 0,
  lThigh: 0.08,
  lShin: 0.05,
  rThigh: -0.09,
  rShin: 0.08,
  lUpper: 0.14,
  lFore: -0.25,
  rUpper: -0.1,
  rFore: -0.2,
};

function computeTargetPose(
  mode: StageActivity,
  t: number,
  lunge: number,
  recoil: number,
  hasWeapon: boolean
): RigPose {
  const breathe = Math.sin(t * 2.6);
  const idleSway = Math.sin(t * 1.4);

  if (mode === 'WALKING') {
    const w = t * 7.8;
    const s = Math.sin(w);
    const c = Math.cos(w);
    return {
      hipY: -Math.abs(s) * 4.5,
      torsoLean: 0.1 + Math.abs(s) * 0.03,
      headTilt: -0.05 + Math.sin(w * 2) * 0.02,
      bodyRotate: 0,
      lThigh: s * 0.46,
      lShin: Math.max(0, -c) * 0.62 + 0.06,
      rThigh: -s * 0.46,
      rShin: Math.max(0, c) * 0.62 + 0.06,
      lUpper: -s * 0.42,
      lFore: -0.28 - Math.max(0, s) * 0.22,
      rUpper: s * 0.42,
      rFore: -0.28 - Math.max(0, -s) * 0.22,
    };
  }

  if (mode === 'SLEEPING') {
    return {
      hipY: 26,
      torsoLean: 0.04,
      headTilt: -0.08 + breathe * 0.02,
      bodyRotate: -Math.PI / 2,
      lThigh: -0.22,
      lShin: 0.32,
      rThigh: -0.08,
      rShin: 0.18,
      lUpper: -0.45,
      lFore: -1.1,
      rUpper: 0.18 + breathe * 0.03,
      rFore: -0.65,
    };
  }

  if (mode === 'EATING') {
    const bite = Math.max(0, Math.sin(t * 2.8));
    return {
      hipY: 34,
      torsoLean: 0.12 + bite * 0.05,
      headTilt: 0.12 - bite * 0.05,
      bodyRotate: 0,
      lThigh: -1.42,
      lShin: 1.44,
      rThigh: -1.36,
      rShin: 1.38,
      lUpper: -0.45,
      lFore: -0.85,
      rUpper: -0.58 - bite * 0.46,
      rFore: -1.05 - bite * 0.65,
    };
  }

  if (mode === 'MINING') {
    const phase = (t * 3.1) % (Math.PI * 2);
    // Slow raise, fast heavy chop
    const swing = Math.sin(phase) - 0.28 * Math.sin(phase * 2);
    return {
      hipY: 8 + Math.max(0, swing) * 5,
      torsoLean: 0.18 + swing * 0.22,
      headTilt: -0.05 + swing * 0.1,
      bodyRotate: 0,
      lThigh: 0.28,
      lShin: 0.24,
      rThigh: -0.36,
      rShin: 0.34,
      lUpper: -1.45 + swing * 1.15,
      lFore: -0.42 + swing * 0.25,
      rUpper: -1.6 + swing * 1.25,
      rFore: -0.52 + swing * 0.25,
    };
  }

  if (mode === 'TRAINING') {
    const rep = (Math.sin(t * 3.8) + 1) * 0.5;
    return {
      hipY: 6 + (1 - rep) * 7,
      torsoLean: 0.06 - rep * 0.05,
      headTilt: -0.04,
      bodyRotate: 0,
      lThigh: 0.22 + (1 - rep) * 0.12,
      lShin: 0.2 + (1 - rep) * 0.14,
      rThigh: -0.26 - (1 - rep) * 0.12,
      rShin: 0.24 + (1 - rep) * 0.14,
      lUpper: -0.35 - rep * 1.55,
      lFore: -1.25 - rep * 0.25,
      rUpper: -0.35 - rep * 1.55,
      rFore: -1.25 - rep * 0.25,
    };
  }

  if (mode === 'TALKING') {
    const gesture = Math.sin(t * 4.2);
    return {
      hipY: breathe * 1.2,
      torsoLean: 0.04 + Math.sin(t * 2.1) * 0.02,
      headTilt: Math.sin(t * 3.4) * 0.07,
      bodyRotate: 0,
      lThigh: 0.08,
      lShin: 0.05,
      rThigh: -0.1,
      rShin: 0.08,
      lUpper: 0.12,
      lFore: -0.3,
      rUpper: -0.42 + gesture * 0.2,
      rFore: -0.88 - Math.abs(gesture) * 0.25,
    };
  }

  if (mode === 'HEALING') {
    return {
      hipY: Math.sin(t * 2.2) * 2.2,
      torsoLean: -0.04,
      headTilt: -0.1 + breathe * 0.03,
      bodyRotate: 0,
      lThigh: 0.06,
      lShin: 0.04,
      rThigh: -0.08,
      rShin: 0.06,
      lUpper: 0.26,
      lFore: -0.25,
      rUpper: -0.26,
      rFore: -0.35,
    };
  }

  if (mode === 'FIGHTING') {
    const bob = Math.sin(t * 4.6);
    const strike = lunge > 0.05 ? Math.sin(lunge * Math.PI) : 0;
    const hit = recoil > 0.05 ? Math.sin(recoil * Math.PI) : 0;
    return {
      hipY: 7 + bob * 2.4 - strike * 4 + hit * 3,
      torsoLean: 0.16 + strike * 0.28 - hit * 0.34,
      headTilt: -0.08 + hit * 0.22,
      bodyRotate: 0,
      lThigh: 0.34 + strike * 0.14,
      lShin: 0.26,
      rThigh: -0.36 - strike * 0.16,
      rShin: 0.38,
      lUpper: -0.85 - bob * 0.06 + hit * 0.4,
      lFore: -1.05,
      rUpper: hasWeapon
        ? -0.68 - strike * 1.15 + hit * 0.45
        : -0.88 - strike * 0.9 + hit * 0.45,
      rFore: hasWeapon ? -0.65 + strike * 0.55 : -1.1 + strike * 0.85,
    };
  }

  // IDLE — relaxed natural weight shift & breathing
  return {
    hipY: breathe * 1.4,
    torsoLean: 0.02 + idleSway * 0.015,
    headTilt: idleSway * 0.035,
    bodyRotate: 0,
    lThigh: 0.09,
    lShin: 0.05,
    rThigh: -0.1,
    rShin: 0.07,
    lUpper: 0.12 + breathe * 0.025,
    lFore: -0.24,
    rUpper: hasWeapon ? -0.28 + breathe * 0.02 : -0.09 - breathe * 0.025,
    rFore: hasWeapon ? -0.42 : -0.22,
  };
}

/** Draw an anatomically tapered limb segment along +Y from (0,0) to (0,len) */
function drawTaperedLimb(
  c: CanvasRenderingContext2D,
  len: number,
  topW: number,
  midW: number,
  botW: number,
  baseColor: string,
  rimColor: string,
  flash: boolean,
  isBack: boolean
) {
  const fillGrad = c.createLinearGradient(-topW, 0, topW, 0);
  if (flash) {
    fillGrad.addColorStop(0, '#FFFFFF');
    fillGrad.addColorStop(1, '#FFF5F8');
  } else if (isBack) {
    fillGrad.addColorStop(0, adjustHex(baseColor, -42));
    fillGrad.addColorStop(0.6, adjustHex(baseColor, -24));
    fillGrad.addColorStop(1, adjustHex(baseColor, -10));
  } else {
    fillGrad.addColorStop(0, adjustHex(baseColor, -30));
    fillGrad.addColorStop(0.55, baseColor);
    fillGrad.addColorStop(1, adjustHex(baseColor, 22));
  }

  c.beginPath();
  c.moveTo(-topW * 0.5, 0);
  c.quadraticCurveTo(-midW * 0.58, len * 0.42, -botW * 0.5, len);
  c.arc(0, len, botW * 0.5, Math.PI, 0, true);
  c.quadraticCurveTo(midW * 0.62, len * 0.38, topW * 0.5, 0);
  c.arc(0, 0, topW * 0.5, 0, Math.PI, true);
  c.closePath();

  c.fillStyle = fillGrad;
  c.fill();

  // Soft rim highlight along lit front edge
  if (!flash && !isBack) {
    c.save();
    c.strokeStyle = rimColor;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(topW * 0.44, 2);
    c.quadraticCurveTo(midW * 0.56, len * 0.4, botW * 0.44, len - 2);
    c.stroke();
    c.restore();
  }

  c.strokeStyle = '#140E24';
  c.lineWidth = 1.6;
  c.stroke();
}

/** Draw detailed tactical sci-fi boot at ankle origin (0,0) */
function drawBoot(
  c: CanvasRenderingContext2D,
  isBack: boolean,
  rimColor: string,
  flash: boolean
) {
  const bootBase = isBack ? '#1A172B' : '#25213D';
  const bootLight = isBack ? '#2C2845' : '#403B63';

  c.save();
  // Main boot body
  const g = c.createLinearGradient(-8, -2, 16, 12);
  g.addColorStop(0, flash ? '#FFFFFF' : bootBase);
  g.addColorStop(1, flash ? '#FFFFFF' : bootLight);

  c.beginPath();
  c.moveTo(-6, -3);
  c.lineTo(5.5, -3);
  c.quadraticCurveTo(9, 4, 16.5, 7.5);
  c.quadraticCurveTo(19, 10, 16, 12.5);
  c.lineTo(-7.5, 12.5);
  c.quadraticCurveTo(-9, 7, -6, -3);
  c.closePath();
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = '#110C1F';
  c.lineWidth = 1.6;
  c.stroke();

  if (!flash) {
    // Reinforced thick sole
    c.fillStyle = '#0F0C1B';
    c.fillRect(-7.5, 9.5, 24.5, 3.2);
    // Ankle strap & metallic clasp
    c.fillStyle = '#4B486B';
    c.fillRect(-5.5, 1.5, 12, 2.5);
    if (!isBack) {
      c.strokeStyle = rimColor;
      c.lineWidth = 1.1;
      c.beginPath();
      c.moveTo(6.5, 1);
      c.quadraticCurveTo(11, 5.5, 15.5, 7.5);
      c.stroke();
    }
  }
  c.restore();
}

/** Draw sculpted hand (bare or fingerless combat glove) at wrist origin (0,0) */
function drawHand(
  c: CanvasRenderingContext2D,
  skinTone: string,
  isBack: boolean,
  flash: boolean
) {
  c.save();
  // Tactical fingerless glove cuff
  c.fillStyle = flash ? '#FFFFFF' : isBack ? '#1B182E' : '#282342';
  c.strokeStyle = '#120D22';
  c.lineWidth = 1.4;
  c.beginPath();
  c.roundRect(-4.2, -1, 8.4, 6, 2);
  c.fill();
  c.stroke();

  // Fingers + thumb
  c.fillStyle = flash ? '#FFFFFF' : isBack ? adjustHex(skinTone, -25) : skinTone;
  c.beginPath();
  c.ellipse(0.5, 6.2, 4.2, 4.4, 0.1, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();
}

/** Draw held weapon / tool anchored at front hand (0, 5) */
function drawHeldProp(
  c: CanvasRenderingContext2D,
  mode: StageActivity,
  weaponId: string | null,
  t: number
) {
  c.save();
  c.translate(1, 5);

  if (mode === 'MINING') {
    // Heavy Industrial Plasma Pickaxe
    c.rotate(-0.45);
    const shaft = c.createLinearGradient(-2, -30, 4, 24);
    shaft.addColorStop(0, '#64748B');
    shaft.addColorStop(1, '#334155');
    c.fillStyle = shaft;
    c.strokeStyle = '#120D22';
    c.lineWidth = 1.5;
    c.beginPath();
    c.roundRect(-2.5, -6, 5, 48, 2);
    c.fill();
    c.stroke();

    // Superheated amber pick head
    c.save();
    c.translate(0, 38);
    c.shadowColor = '#F59E0B';
    c.shadowBlur = 12;
    c.fillStyle = '#F59E0B';
    c.beginPath();
    c.moveTo(-22, -6);
    c.quadraticCurveTo(0, -13, 24, -4);
    c.lineTo(19, 3);
    c.quadraticCurveTo(0, -2, -18, 2);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = '#1C1018';
    c.lineWidth = 1.4;
    c.stroke();
    // Hot core edge
    c.fillStyle = '#FEF08A';
    c.fillRect(-15, -5, 32, 2);
    c.restore();
  } else if (mode === 'TRAINING') {
    // Weighted Steel Dumbbell
    c.fillStyle = '#64748B';
    c.strokeStyle = '#120D22';
    c.lineWidth = 1.4;
    c.fillRect(-14, -2, 28, 4.5);
    c.strokeRect(-14, -2, 28, 4.5);
    c.fillStyle = '#334155';
    c.beginPath();
    c.roundRect(-20, -9, 7, 18, 2);
    c.roundRect(13, -9, 7, 18, 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#94A3B8';
    c.fillRect(-18, -7, 2, 14);
    c.fillRect(15, -7, 2, 14);
  } else if (mode === 'EATING') {
    // Brushed Steel Insulated Ration Mug
    c.fillStyle = '#CBD5E1';
    c.strokeStyle = '#120D22';
    c.lineWidth = 1.4;
    c.beginPath();
    c.roundRect(-5, -6, 11, 13, 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#38BDF8';
    c.fillRect(-3.5, -1, 8, 2.5);
  } else if (weaponId) {
    c.rotate(-0.35);
    if (weaponId === 'plasma_blade') {
      // Sculpted Emitter Hilt
      c.fillStyle = '#334155';
      c.strokeStyle = '#120D22';
      c.lineWidth = 1.5;
      c.beginPath();
      c.roundRect(-3, -6, 6, 16, 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#94A3B8';
      c.fillRect(-4.5, 8, 9, 4);

      // Glowing Volumetric Plasma Blade
      c.save();
      c.shadowColor = '#38BDF8';
      c.shadowBlur = 16;
      c.fillStyle = '#38BDF8';
      c.beginPath();
      c.moveTo(-3.5, 12);
      c.lineTo(3.5, 12);
      c.lineTo(2.4, 54);
      c.lineTo(0, 62);
      c.lineTo(-2.4, 54);
      c.closePath();
      c.fill();
      c.fillStyle = '#F0F9FF';
      c.beginPath();
      c.moveTo(-1.5, 13);
      c.lineTo(1.5, 13);
      c.lineTo(0.8, 56);
      c.lineTo(-0.8, 56);
      c.closePath();
      c.fill();
      c.restore();
    } else if (weaponId === 'shock_baton') {
      c.fillStyle = '#1E293B';
      c.strokeStyle = '#120D22';
      c.lineWidth = 1.5;
      c.beginPath();
      c.roundRect(-2.8, -5, 5.6, 40, 2);
      c.fill();
      c.stroke();
      // Conductive Shock Head
      c.fillStyle = '#F59E0B';
      c.fillRect(-3.5, 24, 7, 13);
      c.strokeRect(-3.5, 24, 7, 13);
      // Live crackling micro-arcs
      if (Math.sin(t * 24) > -0.2) {
        c.strokeStyle = '#7DD3FC';
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(-5, 24);
        c.lineTo(4, 30 + Math.sin(t * 45) * 3);
        c.lineTo(-4, 38);
        c.stroke();
      }
    } else {
      // Forged Heavy Pipe Wrench
      const metal = c.createLinearGradient(-4, 0, 4, 0);
      metal.addColorStop(0, '#64748B');
      metal.addColorStop(0.5, '#CBD5E1');
      metal.addColorStop(1, '#475569');
      c.fillStyle = metal;
      c.strokeStyle = '#120D22';
      c.lineWidth = 1.5;
      c.beginPath();
      c.roundRect(-2.6, -5, 5.2, 34, 2);
      c.fill();
      c.stroke();
      // Wrench Jaw Head
      c.beginPath();
      c.moveTo(-6, 26);
      c.lineTo(7, 26);
      c.lineTo(7, 38);
      c.lineTo(2, 38);
      c.lineTo(2, 32);
      c.lineTo(-2, 32);
      c.lineTo(-2, 38);
      c.lineTo(-6, 38);
      c.closePath();
      c.fill();
      c.stroke();
    }
  }
  c.restore();
}

/** Draw complete 7.2-head realistic cel-shaded skeletal human character doll */
function drawRealisticCharacter(c: CanvasRenderingContext2D, x: number, y: number, cfg: DollConfig) {
  const {
    facing,
    suitColor,
    pantsColor,
    skinTone,
    hairColor,
    eyeColor,
    hairStyle,
    armorId,
    weaponId,
    glasses,
    sleeveless,
    labCoat,
    collar = true,
    scar,
    build = 1,
    scale = 1,
    expression,
    rimColor,
    flash = false,
    t,
    mode,
    pose,
  } = cfg;

  const legColor = pantsColor ?? adjustHex(suitColor, -22);

  c.save();
  c.translate(x, y);

  // Soft grounded elliptical contact shadow (only when upright/seated)
  if (mode !== 'SLEEPING') {
    const shadowGrad = c.createRadialGradient(0, 2, 3, 0, 2, 32 * scale * build);
    shadowGrad.addColorStop(0, 'rgba(6, 4, 18, 0.62)');
    shadowGrad.addColorStop(0.65, 'rgba(6, 4, 18, 0.25)');
    shadowGrad.addColorStop(1, 'rgba(6, 4, 18, 0)');
    c.fillStyle = shadowGrad;
    c.beginPath();
    c.ellipse(0, 2, 32 * scale * build, 8.5 * scale, 0, 0, Math.PI * 2);
    c.fill();
  }

  c.scale(facing * scale, scale);

  // Pelvis anchor sits ~88px above boots when standing upright
  const pelvisY = -88 + pose.hipY;
  c.translate(0, pelvisY);
  if (pose.bodyRotate !== 0) {
    c.rotate(pose.bodyRotate);
  }

  const drawLegChain = (hipX: number, thighAng: number, shinAng: number, isBack: boolean) => {
    c.save();
    c.translate(hipX, 4);
    c.rotate(thighAng);
    drawTaperedLimb(c, 42, 16 * build, 14.5 * build, 11.5 * build, legColor, rimColor, flash, isBack);
    // Knee pad detail
    if (!flash) {
      c.fillStyle = isBack ? '#1D1830' : '#2C264A';
      c.strokeStyle = '#120D22';
      c.lineWidth = 1.2;
      c.beginPath();
      c.ellipse(3, 41, 4.5 * build, 5.5, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.translate(0, 42);
    c.rotate(shinAng);
    drawTaperedLimb(c, 40, 11.5 * build, 12.2 * build, 8.2 * build, legColor, rimColor, flash, isBack);
    c.translate(0, 39);
    // Keep boot roughly level with floor unless walking
    c.rotate(-(thighAng + shinAng) * 0.72);
    drawBoot(c, isBack, rimColor, flash);
    c.restore();
  };

  const drawArmChain = (
    shX: number,
    shY: number,
    upperAng: number,
    foreAng: number,
    isBack: boolean,
    holdProp: boolean
  ) => {
    c.save();
    c.translate(shX, shY);
    c.rotate(upperAng);
    const armCol = sleeveless ? skinTone : labCoat ? '#DCE4F0' : suitColor;
    drawTaperedLimb(c, 29, 11.5 * build, 10.5 * build, 8.6 * build, armCol, rimColor, flash, isBack);
    c.translate(0, 28);
    c.rotate(foreAng);
    drawTaperedLimb(c, 26, 8.6 * build, 8.2 * build, 6.4 * build, armCol, rimColor, flash, isBack);
    c.translate(0, 25);
    if (holdProp) {
      drawHeldProp(c, mode, weaponId, t);
    }
    drawHand(c, skinTone, isBack, flash);
    c.restore();
  };

  // --- Z-LAYER 1: BACK ARM ---
  c.save();
  c.rotate(pose.torsoLean);
  drawArmChain(-8 * build, -44, pose.lUpper, pose.lFore, true, mode === 'TRAINING');
  c.restore();

  // --- Z-LAYER 2: BACK LEG ---
  drawLegChain(-5 * build, pose.lThigh, pose.lShin, true);

  // --- Z-LAYER 3: FRONT LEG ---
  drawLegChain(5 * build, pose.rThigh, pose.rShin, false);

  // --- Z-LAYER 4: SCULPTED TORSO + PELVIS + CLOTHING + ARMOR ---
  c.save();
  c.rotate(pose.torsoLean);

  // Pelvis / Hips
  const hipGrad = c.createLinearGradient(-14, 0, 14, 0);
  hipGrad.addColorStop(0, flash ? '#FFFFFF' : adjustHex(legColor, -28));
  hipGrad.addColorStop(0.6, flash ? '#FFFFFF' : legColor);
  hipGrad.addColorStop(1, flash ? '#FFFFFF' : adjustHex(legColor, 18));
  c.fillStyle = hipGrad;
  c.strokeStyle = '#140E24';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-13 * build, -6);
  c.lineTo(13 * build, -6);
  c.quadraticCurveTo(15 * build, 5, 11 * build, 12);
  c.lineTo(-11 * build, 12);
  c.quadraticCurveTo(-15 * build, 5, -13 * build, -6);
  c.closePath();
  c.fill();
  c.stroke();

  // Sculpted Upper Torso (Anatomical Tapered Chest -> Waist)
  const torsoCol = labCoat ? '#E2E8F2' : suitColor;
  const torsoGrad = c.createLinearGradient(-16 * build, -48, 17 * build, -4);
  if (flash) {
    torsoGrad.addColorStop(0, '#FFFFFF');
    torsoGrad.addColorStop(1, '#FFF5F8');
  } else {
    torsoGrad.addColorStop(0, adjustHex(torsoCol, -36));
    torsoGrad.addColorStop(0.52, torsoCol);
    torsoGrad.addColorStop(1, adjustHex(torsoCol, 28));
  }

  c.beginPath();
  c.moveTo(-12.5 * build, -5);
  c.bezierCurveTo(-14.5 * build, -22, -17.5 * build, -36, -15 * build, -50);
  c.quadraticCurveTo(0, -54, 15.5 * build, -50);
  c.bezierCurveTo(18 * build, -36, 15 * build, -20, 12.5 * build, -5);
  c.closePath();
  c.fillStyle = torsoGrad;
  c.fill();

  // Subtle rim light on lit chest edge
  if (!flash) {
    c.save();
    c.strokeStyle = rimColor;
    c.lineWidth = 1.7;
    c.beginPath();
    c.moveTo(14.5 * build, -48);
    c.bezierCurveTo(16.8 * build, -36, 14.2 * build, -20, 11.8 * build, -6);
    c.stroke();
    c.restore();
  }
  c.strokeStyle = '#140E24';
  c.lineWidth = 1.7;
  c.stroke();

  // Jumpsuit / Lab Coat Tailoring Details
  if (!flash) {
    if (labCoat) {
      // Inner teal clinical shirt V-neck + coat lapel
      c.fillStyle = '#0F766E';
      c.beginPath();
      c.moveTo(-4, -52);
      c.lineTo(7, -52);
      c.lineTo(4, -26);
      c.closePath();
      c.fill();
      // Open coat hem
      c.strokeStyle = '#94A3B8';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(4, -26);
      c.lineTo(4, 16);
      c.stroke();
    } else {
      // Center seam zipper & chest stripe
      c.strokeStyle = 'rgba(15, 10, 32, 0.5)';
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(4.5 * build, -51);
      c.lineTo(3.5 * build, -5);
      c.stroke();

      // Subtle reflective chest stripe & inmate stencil
      c.fillStyle = 'rgba(255, 255, 255, 0.2)';
      c.fillRect(-12 * build, -37, 25 * build, 4.5);

      // Pectoral / fabric fold shadow
      c.strokeStyle = 'rgba(12, 8, 28, 0.28)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(-9 * build, -30);
      c.quadraticCurveTo(1, -27, 11 * build, -31);
      c.stroke();
    }

    // Utility Waist Belt & Metallic Buckle
    c.fillStyle = '#1E1B2E';
    c.strokeStyle = '#0E0B1A';
    c.lineWidth = 1.3;
    c.beginPath();
    c.roundRect(-13.5 * build, -9.5, 27 * build, 6.5, 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#94A3B8';
    c.fillRect(1 * build, -8.5, 7, 4.5);
  }

  // Sculpted Armor Overlays
  if (armorId && !flash) {
    if (armorId === 'padded_vest') {
      const g = c.createLinearGradient(-15, -48, 15, -14);
      g.addColorStop(0, '#5A3A24');
      g.addColorStop(0.6, '#8A5C38');
      g.addColorStop(1, '#A6754B');
      c.fillStyle = g;
      c.strokeStyle = '#160F24';
      c.lineWidth = 1.5;
      c.beginPath();
      c.roundRect(-14.5 * build, -48, 29 * build, 34, 5);
      c.fill();
      c.stroke();
      // Quilted stitching
      c.strokeStyle = 'rgba(20,12,24,0.35)';
      c.lineWidth = 1;
      for (let ry = -40; ry <= -22; ry += 7) {
        c.beginPath();
        c.moveTo(-13 * build, ry);
        c.lineTo(13 * build, ry);
        c.stroke();
      }
    } else if (armorId === 'riot_plate') {
      const g = c.createLinearGradient(-16, -50, 16, -14);
      g.addColorStop(0, '#2B3548');
      g.addColorStop(0.55, '#52627A');
      g.addColorStop(1, '#8496B0');
      c.fillStyle = g;
      c.strokeStyle = '#110D20';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(-15.5 * build, -49);
      c.lineTo(16 * build, -49);
      c.lineTo(14 * build, -22);
      c.lineTo(2, -13);
      c.lineTo(-13.5 * build, -22);
      c.closePath();
      c.fill();
      c.stroke();
      // Sternum armor ridge + highlight
      c.fillStyle = '#CBD5E1';
      c.fillRect(0, -44, 7, 14);
    } else if (armorId === 'aegis_suit') {
      const g = c.createLinearGradient(-16, -50, 17, -12);
      g.addColorStop(0, '#1E3A5F');
      g.addColorStop(0.5, '#38BDF8');
      g.addColorStop(1, '#E0F2FE');
      c.fillStyle = g;
      c.strokeStyle = '#0E172A';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(-16 * build, -50);
      c.lineTo(16.5 * build, -50);
      c.lineTo(14.5 * build, -19);
      c.lineTo(2, -11);
      c.lineTo(-13.5 * build, -19);
      c.closePath();
      c.fill();
      c.stroke();
      // Glowing cyan chest core
      c.save();
      c.shadowColor = '#38BDF8';
      c.shadowBlur = 10;
      c.fillStyle = '#E0F2FE';
      c.beginPath();
      c.moveTo(4, -40);
      c.lineTo(10, -33);
      c.lineTo(4, -26);
      c.lineTo(-2, -33);
      c.closePath();
      c.fill();
      c.restore();
    }
  }

  // --- Z-LAYER 5: NECK, COLLAR, SCULPTED HEAD, ILLUSTRATED FACE & HAIR ---
  c.save();
  c.translate(1, -52);
  c.rotate(pose.headTilt);

  // Sculpted Neck with collarbone shadow
  const neckGrad = c.createLinearGradient(-5, -10, 6, 3);
  neckGrad.addColorStop(0, flash ? '#FFFFFF' : adjustHex(skinTone, -32));
  neckGrad.addColorStop(1, flash ? '#FFFFFF' : skinTone);
  c.fillStyle = neckGrad;
  c.strokeStyle = '#140E24';
  c.lineWidth = 1.5;
  c.beginPath();
  c.roundRect(-5.2, -11, 10.4, 14, 3);
  c.fill();
  c.stroke();

  // Iconic Sci-Fi Security Transponder Collar (SFW BDCC homage)
  if (collar && !flash) {
    c.fillStyle = '#2B2542';
    c.strokeStyle = '#100C1F';
    c.lineWidth = 1.4;
    c.beginPath();
    c.roundRect(-7.5, -5.5, 15, 6, 2.5);
    c.fill();
    c.stroke();
    // Subtle status LED on collar
    c.fillStyle = mode === 'FIGHTING' ? '#FF4D6D' : '#38BDF8';
    c.fillRect(2, -3.5, 3.8, 2);
  }

  // Back hair layer behind head/neck (for ponytail, bob, or hood)
  if (!flash) {
    if (hairStyle === 'ponytail') {
      const sway = Math.sin(t * 3.2) * 2.5;
      c.fillStyle = adjustHex(hairColor, -18);
      c.strokeStyle = '#120D22';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-10, -24);
      c.quadraticCurveTo(-22, -14, -18 + sway, 4);
      c.quadraticCurveTo(-11, -4, -9, -15);
      c.closePath();
      c.fill();
      c.stroke();
    } else if (hairStyle === 'bob') {
      c.fillStyle = adjustHex(hairColor, -20);
      c.strokeStyle = '#120D22';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-13, -24);
      c.quadraticCurveTo(-15, -10, -11, -3);
      c.lineTo(2, -4);
      c.lineTo(-4, -24);
      c.closePath();
      c.fill();
      c.stroke();
    } else if (hairStyle === 'hood') {
      c.fillStyle = '#241B40';
      c.strokeStyle = '#100B1E';
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(-1, -22, 17, Math.PI * 0.55, Math.PI * 2.15);
      c.lineTo(13, -7);
      c.lineTo(-14, -5);
      c.closePath();
      c.fill();
      c.stroke();
    }
  }

  // Sculpted Head & Jawline (3/4 realistic anime-comic silhouette)
  const headGrad = c.createLinearGradient(-12, -32, 13, -10);
  if (flash) {
    headGrad.addColorStop(0, '#FFFFFF');
    headGrad.addColorStop(1, '#FFF5F8');
  } else {
    headGrad.addColorStop(0, adjustHex(skinTone, -26));
    headGrad.addColorStop(0.55, skinTone);
    headGrad.addColorStop(1, adjustHex(skinTone, 16));
  }

  c.beginPath();
  c.moveTo(-11.5, -24);
  c.bezierCurveTo(-12.5, -36, 11.5, -37.5, 12.2, -23.5);
  c.bezierCurveTo(12.6, -15, 9.8, -10, 4.5, -7.2);
  c.quadraticCurveTo(-2, -6.8, -7.5, -11.5);
  c.quadraticCurveTo(-11.8, -16, -11.5, -24);
  c.closePath();
  c.fillStyle = headGrad;
  c.fill();

  // Cheek rim-light
  if (!flash) {
    c.save();
    c.strokeStyle = rimColor;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(11.6, -24);
    c.bezierCurveTo(11.8, -16, 9.2, -11, 4.5, -8);
    c.stroke();
    c.restore();
  }
  c.strokeStyle = '#140E24';
  c.lineWidth = 1.6;
  c.stroke();

  // Sculpted Ear
  if (!flash && hairStyle !== 'riot_helmet') {
    c.fillStyle = adjustHex(skinTone, -14);
    c.beginPath();
    c.ellipse(-8.5, -19, 2.6, 4.2, -0.15, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  // Expressive Semi-Realistic Facial Features
  if (!flash && hairStyle !== 'riot_helmet') {
    // Periodic realistic blink (~140ms every 3.5s)
    const blinkCycle = (t + (facing === -1 ? 1.7 : 0)) % 3.5;
    const isBlinking = expression === 'sleeping' || blinkCycle > 3.36;

    const drawEye = (ex: number, ey: number, ew: number) => {
      if (isBlinking) {
        c.strokeStyle = '#1A122B';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(ex - ew, ey + 0.5);
        c.quadraticCurveTo(ex, ey + 2.4, ex + ew, ey + 0.4);
        c.stroke();
        return;
      }
      // Sclera
      c.fillStyle = '#F8FAFC';
      c.beginPath();
      c.ellipse(ex, ey, ew, 2.6, 0, 0, Math.PI * 2);
      c.fill();
      // Shaded Iris
      c.fillStyle = eyeColor;
      c.beginPath();
      c.ellipse(ex + 0.4, ey + 0.1, ew * 0.56, 2.2, 0, 0, Math.PI * 2);
      c.fill();
      // Pupil
      c.fillStyle = '#0D0A1A';
      c.beginPath();
      c.arc(ex + 0.5, ey + 0.1, 1.15, 0, Math.PI * 2);
      c.fill();
      // Specular Catchlight Glint
      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.arc(ex + 1.1, ey - 0.8, 0.75, 0, Math.PI * 2);
      c.fill();
      // Crisp Upper Lash Line
      c.strokeStyle = '#150F26';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(ex - ew - 0.5, ey - 0.5);
      c.quadraticCurveTo(ex, ey - 3.2, ex + ew + 0.4, ey - 0.4);
      c.stroke();
    };

    // 3/4 view eye pair
    drawEye(1.5, -20.5, 2.7);
    drawEye(8.6, -20.5, 2.3);

    // Expressive Eyebrows
    c.strokeStyle = adjustHex(hairColor, -15);
    c.lineWidth = 1.45;
    const browSlope =
      expression === 'focused' ? 1.5 : expression === 'hurt' ? -1.4 : expression === 'talking' ? -0.6 : 0.2;
    c.beginPath();
    c.moveTo(-1.2, -24.8 - browSlope * 0.6);
    c.lineTo(4.2, -24.4 + browSlope);
    c.moveTo(6.4, -24.4 + browSlope);
    c.lineTo(10.8, -24.8 - browSlope * 0.5);
    c.stroke();

    // Glasses (Dr. Chen)
    if (glasses) {
      c.strokeStyle = '#CBD5E1';
      c.lineWidth = 1.1;
      c.strokeRect(-1.5, -23.2, 6, 4.8);
      c.strokeRect(6, -23.2, 5.2, 4.8);
      c.beginPath();
      c.moveTo(4.5, -20.8);
      c.lineTo(6, -20.8);
      c.stroke();
    }

    // Subtle Nose Bridge & Shadow
    c.strokeStyle = adjustHex(skinTone, -42);
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(6.2, -19.5);
    c.lineTo(7.4, -15.6);
    c.lineTo(5.6, -15.2);
    c.stroke();

    // Scar detail (Yard Bruiser)
    if (scar) {
      c.strokeStyle = 'rgba(136, 38, 56, 0.7)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(-2, -25);
      c.lineTo(2, -16);
      c.stroke();
    }

    // Expressive Animated Mouth
    c.strokeStyle = '#4A2535';
    c.lineWidth = 1.3;
    if (expression === 'talking') {
      const talkOpen = Math.abs(Math.sin(t * 11)) * 2.4;
      c.fillStyle = '#521E32';
      c.beginPath();
      c.ellipse(5.3, -11.8, 2.6, 0.8 + talkOpen, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else if (expression === 'eating') {
      const chew = Math.abs(Math.sin(t * 7)) * 1.4;
      c.fillStyle = '#521E32';
      c.beginPath();
      c.ellipse(5.3, -11.8, 2.2, 0.6 + chew, 0, 0, Math.PI * 2);
      c.fill();
    } else if (expression === 'focused' || expression === 'hurt') {
      c.beginPath();
      c.moveTo(2.6, -11.4);
      c.quadraticCurveTo(5.2, -12.6, 7.6, -11.3);
      c.stroke();
    } else {
      // Calm subtle smile
      c.beginPath();
      c.moveTo(2.8, -12);
      c.quadraticCurveTo(5.2, -10.8, 7.6, -12.2);
      c.stroke();
    }
  }

  // Front Hair / Headgear / Riot Helmet
  if (!flash) {
    if (hairStyle === 'riot_helmet') {
      // Full Armored Security Commander Helmet (Warden Krag)
      const hg = c.createLinearGradient(-13, -36, 13, -10);
      hg.addColorStop(0, '#1E293B');
      hg.addColorStop(0.55, '#475569');
      hg.addColorStop(1, '#64748B');
      c.fillStyle = hg;
      c.strokeStyle = '#0F172A';
      c.lineWidth = 1.7;
      c.beginPath();
      c.arc(0, -22, 14.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Glowing Crimson Tactical Visor
      c.save();
      c.shadowColor = '#FF3358';
      c.shadowBlur = 10;
      c.fillStyle = '#FF3358';
      c.beginPath();
      c.roundRect(1, -24, 13.5, 6.2, 2.5);
      c.fill();
      c.restore();
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.fillRect(3, -23, 9, 1.5);
    } else if (hairStyle === 'visor') {
      // Swept base hair + Sleek Reflective Cyber Visor
      c.fillStyle = hairColor;
      c.strokeStyle = '#120D22';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-12.5, -21);
      c.bezierCurveTo(-13.5, -36, 12, -37, 13, -24);
      c.lineTo(4, -27);
      c.lineTo(-4, -25);
      c.lineTo(-9, -18);
      c.closePath();
      c.fill();
      c.stroke();
      // Glowing translucent cyan visor wrap
      c.save();
      c.shadowColor = '#38BDF8';
      c.shadowBlur = 8;
      const vg = c.createLinearGradient(-4, -23, 13, -18);
      vg.addColorStop(0, '#0284C7');
      vg.addColorStop(0.6, '#38BDF8');
      vg.addColorStop(1, '#BAE6FD');
      c.fillStyle = vg;
      c.beginPath();
      c.roundRect(-2, -23.5, 15.5, 6.4, 3);
      c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = '#0C1F38';
      c.lineWidth = 1.3;
      c.stroke();
      // Specular gleam bar
      c.fillStyle = 'rgba(255,255,255,0.65)';
      c.fillRect(1, -22.2, 10, 1.6);
      c.restore();
    } else if (hairStyle === 'hood') {
      // Draped Hood Brim with Shadow & Fabric Folds
      const hdg = c.createLinearGradient(-15, -36, 14, -12);
      hdg.addColorStop(0, '#1D1536');
      hdg.addColorStop(0.6, '#392B63');
      hdg.addColorStop(1, '#523E8A');
      c.fillStyle = hdg;
      c.strokeStyle = '#100B1E';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(-13, -7);
      c.bezierCurveTo(-17, -25, -10, -40, 6, -37);
      c.quadraticCurveTo(15, -33, 13.5, -23);
      c.quadraticCurveTo(3, -31, -4, -25);
      c.quadraticCurveTo(-8, -16, -7, -7);
      c.closePath();
      c.fill();
      c.stroke();
    } else if (hairStyle === 'spiky') {
      c.fillStyle = hairColor;
      c.strokeStyle = '#120D22';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-11, -18);
      c.lineTo(-15, -28);
      c.lineTo(-9, -31);
      c.lineTo(-10, -40);
      c.lineTo(-1, -35);
      c.lineTo(5, -42);
      c.lineTo(9, -33);
      c.lineTo(15, -31);
      c.lineTo(11, -24);
      c.lineTo(5, -27);
      c.lineTo(-1, -23);
      c.lineTo(-7, -26);
      c.closePath();
      c.fill();
      c.stroke();
      // Glossy hair highlight streak
      c.strokeStyle = 'rgba(255,255,255,0.22)';
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(-6, -32);
      c.quadraticCurveTo(1, -34, 7, -30);
      c.stroke();
    } else if (hairStyle === 'buzz') {
      c.fillStyle = hairColor;
      c.strokeStyle = '#120D22';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(-11.5, -21);
      c.bezierCurveTo(-12, -35, 10, -36, 11.5, -26);
      c.quadraticCurveTo(2, -29, -8, -23);
      c.closePath();
      c.fill();
      c.stroke();
    } else {
      // Layered Swept Hair (short / ponytail front / bob front)
      c.fillStyle = hairColor;
      c.strokeStyle = '#120D22';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-11.5, -17);
      c.bezierCurveTo(-14.5, -30, -6, -38.5, 6, -36);
      c.bezierCurveTo(13, -34.5, 14.5, -27, 13, -22.5);
      c.quadraticCurveTo(8, -27, 4, -24);
      c.quadraticCurveTo(0, -28, -4.5, -23.5);
      c.quadraticCurveTo(-7.5, -22, -8, -16);
      c.closePath();
      c.fill();
      c.stroke();
      // Anime-style Hair Gloss Ribbon
      c.strokeStyle = 'rgba(255,255,255,0.25)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-6, -31);
      c.quadraticCurveTo(2, -33.5, 8.5, -29);
      c.stroke();
    }
  }
  c.restore(); // End Head

  // --- Z-LAYER 6: FRONT ARM + HELD WEAPON/TOOL ---
  drawArmChain(9 * build, -44, pose.rUpper, pose.rFore, false, true);

  // Armor front pauldron cap over front shoulder
  if ((armorId === 'riot_plate' || armorId === 'aegis_suit') && !flash) {
    c.fillStyle = armorId === 'aegis_suit' ? '#38BDF8' : '#64748B';
    c.strokeStyle = '#110D20';
    c.lineWidth = 1.4;
    c.beginPath();
    c.ellipse(10 * build, -45, 7.5 * build, 6.2, -0.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  c.restore(); // End Torso
  c.restore(); // End Character
}

export const LiveCharacterStage: React.FC<LiveCharacterStageProps> = ({
  roomId,
  activity,
  activityLabel,
  appearance,
  weaponId,
  armorId,
  combat,
  fxEvent,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const playerPoseRef = useRef<RigPose>({ ...DEFAULT_POSE });
  const npcPoseRef = useRef<RigPose>({ ...DEFAULT_POSE });
  const fxStateRef = useRef({
    playerLunge: 0,
    enemyLunge: 0,
    playerRecoil: 0,
    enemyRecoil: 0,
    playerFlash: 0,
    enemyFlash: 0,
    guardShield: 0,
    empArc: 0,
    shake: 0,
    slashTimer: 0,
    slashColor: '#FFD27D',
  });

  // Trigger combat & action VFX bursts
  useEffect(() => {
    if (!fxEvent) return;
    const fx = fxStateRef.current;
    const ps = particlesRef.current;

    if (fxEvent.kind === 'PLAYER_STRIKE' || fxEvent.kind === 'PLAYER_POWER') {
      fx.playerLunge = 1;
      fx.enemyRecoil = 1;
      fx.enemyFlash = 1;
      fx.slashTimer = 1;
      fx.slashColor = fxEvent.kind === 'PLAYER_POWER' ? '#FF5E8A' : '#FFD27D';
      fx.shake = fxEvent.kind === 'PLAYER_POWER' ? 8 : 4;
      for (let i = 0; i < 14; i++) {
        ps.push({
          x: 196 + (Math.random() - 0.5) * 24,
          y: 155 + (Math.random() - 0.5) * 34,
          vx: (Math.random() - 0.25) * 3.8,
          vy: (Math.random() - 0.7) * 3.4,
          life: 1,
          maxLife: 0.45 + Math.random() * 0.28,
          size: 2.2 + Math.random() * 2.8,
          color: fx.slashColor,
        });
      }
      if (fxEvent.label) {
        ps.push({
          x: 192,
          y: 102,
          vx: 0,
          vy: -0.95,
          life: 1,
          maxLife: 1.05,
          size: 16,
          color: fxEvent.color ?? '#FFE08A',
          text: fxEvent.label,
        });
      }
    } else if (fxEvent.kind === 'PLAYER_GUARD') {
      fx.guardShield = 1;
      if (fxEvent.label) {
        ps.push({
          x: 82,
          y: 100,
          vx: 0,
          vy: -0.75,
          life: 1,
          maxLife: 1.05,
          size: 14,
          color: '#7CFFB2',
          text: fxEvent.label,
        });
      }
    } else if (fxEvent.kind === 'PLAYER_EMP') {
      fx.empArc = 1;
      fx.enemyRecoil = 1;
      fx.enemyFlash = 1;
      fx.shake = 7;
      for (let i = 0; i < 18; i++) {
        ps.push({
          x: 196 + (Math.random() - 0.5) * 36,
          y: 150 + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 4.2,
          vy: (Math.random() - 0.5) * 4.2,
          life: 1,
          maxLife: 0.55,
          size: 2.6,
          color: i % 2 === 0 ? '#7DD3FC' : '#E0F2FE',
        });
      }
      if (fxEvent.label) {
        ps.push({
          x: 186,
          y: 96,
          vx: 0,
          vy: -0.85,
          life: 1,
          maxLife: 1.1,
          size: 14,
          color: '#7DD3FC',
          text: fxEvent.label,
        });
      }
    } else if (fxEvent.kind === 'ENEMY_HIT') {
      fx.enemyLunge = 1;
      fx.playerRecoil = 1;
      fx.playerFlash = 1;
      fx.shake = 5.5;
      if (fxEvent.label) {
        ps.push({
          x: 84,
          y: 100,
          vx: 0,
          vy: -0.9,
          life: 1,
          maxLife: 1.05,
          size: 15,
          color: '#FF8DA8',
          text: fxEvent.label,
        });
      }
    } else if (fxEvent.kind === 'HEAL') {
      for (let i = 0; i < 12; i++) {
        ps.push({
          x: 140 + (Math.random() - 0.5) * 58,
          y: 225 - Math.random() * 65,
          vx: (Math.random() - 0.5) * 0.45,
          vy: -1.1 - Math.random() * 0.85,
          life: 1,
          maxLife: 0.95,
          size: 12,
          color: '#7CFFB2',
          text: '+',
        });
      }
      if (fxEvent.label) {
        ps.push({
          x: 126,
          y: 95,
          vx: 0,
          vy: -0.7,
          life: 1,
          maxLife: 1.1,
          size: 14,
          color: '#7CFFB2',
          text: fxEvent.label,
        });
      }
    } else if (fxEvent.kind === 'SPARK') {
      for (let i = 0; i < 16; i++) {
        ps.push({
          x: 200 + (Math.random() - 0.5) * 20,
          y: 185 + (Math.random() - 0.5) * 24,
          vx: (Math.random() - 0.5) * 3.8,
          vy: -1.4 - Math.random() * 2.5,
          life: 1,
          maxLife: 0.65,
          size: 2.6,
          color: i % 2 === 0 ? '#FFD27D' : '#FF9E44',
        });
      }
      if (fxEvent.label) {
        ps.push({
          x: 135,
          y: 95,
          vx: 0,
          vy: -0.85,
          life: 1,
          maxLife: 1.15,
          size: 15,
          color: fxEvent.color ?? '#FFD27D',
          text: fxEvent.label,
        });
      }
    }
  }, [fxEvent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 280;
    const H = compact ? 204 : 292;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let ambientTimer = 0;

    const lighting = ROOM_LIGHTING[roomId];
    const roomArtSrc = ART_ASSETS[ROOMS[roomId].artKey];

    const drawPaintedBackdrop = (c: CanvasRenderingContext2D, t: number) => {
      const img = getBackdropImage(roomArtSrc);
      const floorY = H - 30;

      if (img) {
        // Cover-crop with smooth parallax pan while WALKING or gentle idle breathing camera drift
        const zoom = activity === 'WALKING' ? 1.18 : 1.07;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = W / H;
        let drawW = W * zoom;
        let drawH = H * zoom;
        if (imgAspect > canvasAspect) {
          drawW = drawH * imgAspect;
        } else {
          drawH = drawW / imgAspect;
        }
        const maxPanX = Math.max(0, (drawW - W) * 0.5);
        const panX =
          activity === 'WALKING'
            ? -((t * 34) % (maxPanX * 2 + 1)) + maxPanX
            : Math.sin(t * 0.45) * Math.min(8, maxPanX);
        const panY = activity === 'WALKING' ? Math.abs(Math.sin(t * 7.8)) * 2.2 : 0;

        const dx = (W - drawW) * 0.5 + panX;
        const dy = (H - drawH) * 0.5 + panY;
        c.drawImage(img, dx, dy, drawW, drawH);
      } else {
        const bg = c.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, lighting.fallbackTop);
        bg.addColorStop(1, lighting.fallbackBot);
        c.fillStyle = bg;
        c.fillRect(0, 0, W, H);
      }

      // Atmospheric color grade & depth vignette so characters pop cleanly
      c.fillStyle = lighting.tint;
      c.fillRect(0, 0, W, H);

      const vig = c.createRadialGradient(W * 0.5, H * 0.48, W * 0.25, W * 0.5, H * 0.5, W * 0.82);
      vig.addColorStop(0, 'rgba(10, 6, 24, 0)');
      vig.addColorStop(1, 'rgba(10, 6, 24, 0.58)');
      c.fillStyle = vig;
      c.fillRect(0, 0, W, H);

      // Subtle grounded reflective deck plane at bottom
      const floorGrad = c.createLinearGradient(0, floorY - 14, 0, H);
      floorGrad.addColorStop(0, 'rgba(12, 9, 28, 0)');
      floorGrad.addColorStop(0.45, 'rgba(12, 9, 28, 0.52)');
      floorGrad.addColorStop(1, 'rgba(10, 7, 22, 0.85)');
      c.fillStyle = floorGrad;
      c.fillRect(0, floorY - 14, W, H - floorY + 14);

      // Subtle horizontal rim glow on floor
      const glow = c.createRadialGradient(W * 0.5, floorY + 4, 10, W * 0.5, floorY + 4, W * 0.55);
      glow.addColorStop(0, lighting.floorGlow);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = glow;
      c.fillRect(0, floorY - 22, W, 44);
    };

    const drawActivityPropsBack = (c: CanvasRenderingContext2D, floorY: number, t: number) => {
      if (activity === 'SLEEPING') {
        // Shaded Steel Station Bunk Frame & Mattress
        const bx = 42;
        const by = floorY - 46;
        c.save();
        // Legs
        c.fillStyle = '#1E1A36';
        c.fillRect(bx + 6, by + 16, 8, 30);
        c.fillRect(bx + 180, by + 16, 8, 30);
        // Steel frame
        const fg = c.createLinearGradient(bx, by, bx, by + 20);
        fg.addColorStop(0, '#4B4473');
        fg.addColorStop(1, '#262045');
        c.fillStyle = fg;
        c.strokeStyle = '#100C1F';
        c.lineWidth = 1.6;
        c.beginPath();
        c.roundRect(bx, by + 8, 196, 12, 3);
        c.fill();
        c.stroke();
        // Padded mattress
        c.fillStyle = '#534A82';
        c.beginPath();
        c.roundRect(bx + 4, by - 4, 188, 14, 4);
        c.fill();
        c.stroke();
        // Soft Pillow on left (where head rests)
        c.fillStyle = '#D6D9F2';
        c.beginPath();
        c.ellipse(bx + 26, by - 9, 23, 8, -0.08, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.restore();
      } else if (activity === 'EATING') {
        // Canteen Bench & Brushed Steel Table
        c.save();
        c.strokeStyle = '#100C1F';
        c.lineWidth = 1.6;
        // Bench seat aligned with seated thighs
        c.fillStyle = '#332C54';
        c.fillRect(62, floorY - 43, 74, 8);
        c.strokeRect(62, floorY - 43, 74, 8);
        c.fillStyle = '#1F1A38';
        c.fillRect(72, floorY - 35, 7, 35);
        c.fillRect(118, floorY - 35, 7, 35);
        // Mess Table on right
        c.fillStyle = '#47426B';
        c.fillRect(142, floorY - 62, 96, 8);
        c.strokeRect(142, floorY - 62, 96, 8);
        c.fillStyle = '#252142';
        c.fillRect(184, floorY - 54, 10, 54);
        // Compartment Ration Tray + Glowing Warm Bowl
        c.fillStyle = '#94A3B8';
        c.fillRect(154, floorY - 66, 48, 4.5);
        c.fillStyle = '#F59E0B';
        c.beginPath();
        c.arc(170, floorY - 66, 8, Math.PI, 0);
        c.fill();
        c.restore();
      } else if (activity === 'MINING') {
        // Rich Faceted Basalt & Glowing Amber Crystal Asteroid Vein
        c.save();
        const rx = 204;
        c.fillStyle = '#2B2133';
        c.strokeStyle = '#120C1C';
        c.lineWidth = 1.8;
        c.beginPath();
        c.moveTo(rx - 32, floorY + 2);
        c.lineTo(rx - 18, floorY - 72);
        c.lineTo(rx + 26, floorY - 96);
        c.lineTo(W + 6, floorY - 82);
        c.lineTo(W + 6, floorY + 2);
        c.closePath();
        c.fill();
        c.stroke();

        // Pulsing Amber Crystal Cluster + Volumetric Glow
        const pulse = 0.78 + Math.sin(t * 4.5) * 0.22;
        const cg = c.createRadialGradient(rx + 4, floorY - 48, 4, rx + 4, floorY - 48, 68);
        cg.addColorStop(0, `rgba(255, 196, 78, ${0.42 * pulse})`);
        cg.addColorStop(1, 'rgba(255, 160, 40, 0)');
        c.fillStyle = cg;
        c.fillRect(rx - 64, floorY - 116, 130, 120);

        const drawCrystal = (cx: number, cy: number, w: number, h: number, tilt: number) => {
          c.save();
          c.translate(cx, cy);
          c.rotate(tilt);
          const g = c.createLinearGradient(-w, -h, w, 0);
          g.addColorStop(0, '#FEF08A');
          g.addColorStop(0.5, '#F59E0B');
          g.addColorStop(1, '#B45309');
          c.fillStyle = g;
          c.strokeStyle = '#3B1D0A';
          c.lineWidth = 1.3;
          c.beginPath();
          c.moveTo(-w * 0.5, 0);
          c.lineTo(-w * 0.35, -h * 0.72);
          c.lineTo(0, -h);
          c.lineTo(w * 0.45, -h * 0.65);
          c.lineTo(w * 0.5, 0);
          c.closePath();
          c.fill();
          c.stroke();
          c.restore();
        };
        drawCrystal(rx - 2, floorY - 26, 16, 46, -0.22);
        drawCrystal(rx + 18, floorY - 38, 14, 38, 0.18);
        drawCrystal(rx + 8, floorY - 14, 12, 28, -0.05);
        c.restore();
      } else if (activity === 'HEALING') {
        // Holographic Medbay Regeneration Cylinder Back Glow
        const beam = c.createLinearGradient(0, 18, 0, floorY);
        beam.addColorStop(0, 'rgba(52, 211, 153, 0.04)');
        beam.addColorStop(0.5, 'rgba(52, 211, 153, 0.16)');
        beam.addColorStop(1, 'rgba(52, 211, 153, 0.34)');
        c.fillStyle = beam;
        c.fillRect(W * 0.5 - 48, 18, 96, floorY - 18);
      }
    };

    const drawActivityPropsFront = (c: CanvasRenderingContext2D, floorY: number, t: number) => {
      if (activity === 'SLEEPING') {
        // Folded blanket draped over torso & legs on top of bunk mattress
        const bx = 94;
        const by = floorY - 76;
        const bg = c.createLinearGradient(bx, by, bx, by + 28);
        bg.addColorStop(0, '#4E3B82');
        bg.addColorStop(1, '#2B204D');
        c.fillStyle = bg;
        c.strokeStyle = '#120D24';
        c.lineWidth = 1.5;
        c.beginPath();
        c.roundRect(bx, by, 134, 28, 6);
        c.fill();
        c.stroke();
        // Blanket cuff edge
        c.fillStyle = '#7361AD';
        c.fillRect(bx, by, 10, 28);
      } else if (activity === 'HEALING') {
        // Sweeping Holographic Biometric Scan Ring across character
        const scanY = floorY - 18 - ((Math.sin(t * 2.4) + 1) * 0.5) * (compact ? 120 : 175);
        c.save();
        c.strokeStyle = 'rgba(124, 255, 198, 0.85)';
        c.shadowColor = '#34D399';
        c.shadowBlur = 12;
        c.lineWidth = 2.4;
        c.beginPath();
        c.ellipse(W * 0.5, scanY, 48, 8, 0, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
    };

    const drawEnemy = (c: CanvasRenderingContext2D, exBase: number, floorY: number, t: number, scale: number) => {
      if (!combat) return;
      const fx = fxStateRef.current;
      const flash = fx.enemyFlash > 0.25;
      const stunWobble = combat.enemyStunned ? Math.sin(t * 26) * 4 : 0;
      const ex = exBase - fx.enemyLunge * 30 + fx.enemyRecoil * 14 + stunWobble;

      if (combat.enemyId === 'ore_drone') {
        // High-detail Layered Hovering Security Ore Drone
        const hover = Math.sin(t * 4.2) * 8;
        const cy = floorY - 96 * scale + hover;
        c.save();
        // Shadow
        c.fillStyle = 'rgba(6, 4, 18, 0.45)';
        c.beginPath();
        c.ellipse(ex, floorY + 2, 26 * scale, 6.5 * scale, 0, 0, Math.PI * 2);
        c.fill();

        c.translate(ex, cy);
        c.scale(scale, scale);

        // Volumetric Red Scanner Cone
        if (!combat.enemyStunned) {
          const cone = c.createLinearGradient(-16, 0, -110, 48);
          cone.addColorStop(0, 'rgba(244, 63, 94, 0.36)');
          cone.addColorStop(1, 'rgba(244, 63, 94, 0)');
          c.fillStyle = cone;
          c.beginPath();
          c.moveTo(-16, -2);
          c.lineTo(-108, 34);
          c.lineTo(-96, 62);
          c.closePath();
          c.fill();
        }

        // Twin Plasma Thruster Exhausts
        const flameH = 14 + Math.sin(t * 28) * 5;
        c.fillStyle = '#F59E0B';
        c.beginPath();
        c.moveTo(-14, 24);
        c.lineTo(-9, 24 + flameH);
        c.lineTo(-4, 24);
        c.moveTo(4, 24);
        c.lineTo(9, 24 + flameH);
        c.lineTo(14, 24);
        c.fill();

        // Main Armored Metallic Sphere Chassis
        const dg = c.createRadialGradient(-10, -12, 4, 0, 0, 32);
        dg.addColorStop(0, flash ? '#FFFFFF' : '#94A3B8');
        dg.addColorStop(0.55, flash ? '#FFFFFF' : '#475569');
        dg.addColorStop(1, flash ? '#FFFFFF' : '#1E293B');
        c.fillStyle = dg;
        c.strokeStyle = '#0F172A';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(0, 0, 28, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        // Split Armor Collar Ring
        c.strokeStyle = '#1E293B';
        c.lineWidth = 3;
        c.beginPath();
        c.ellipse(0, 0, 31, 9, -0.15, 0, Math.PI * 2);
        c.stroke();

        // Glowing Optic Lens Assembly
        c.fillStyle = '#0F172A';
        c.beginPath();
        c.arc(-12, -2, 10, 0, Math.PI * 2);
        c.fill();
        c.save();
        const eyeCol = combat.enemyStunned ? '#38BDF8' : '#F43F5E';
        c.shadowColor = eyeCol;
        c.shadowBlur = 12;
        c.fillStyle = eyeCol;
        c.beginPath();
        c.arc(-13, -2, 6, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#FFF1F2';
        c.beginPath();
        c.arc(-15, -4, 2, 0, Math.PI * 2);
        c.fill();
        c.restore();

        // Stabilizer Antenna Fin
        c.strokeStyle = '#94A3B8';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(10, -24);
        c.lineTo(22, -40);
        c.stroke();
        c.restore();
      } else if (combat.enemyId === 'aegis_mech') {
        // Towering Articulated Bipedal Aegis-IX Boss War-Mech
        const stomp = Math.sin(t * 2.8) * 2.5;
        c.save();
        c.fillStyle = 'rgba(6, 4, 18, 0.58)';
        c.beginPath();
        c.ellipse(ex, floorY + 3, 44 * scale, 9.5 * scale, 0, 0, Math.PI * 2);
        c.fill();

        c.translate(ex, floorY);
        c.scale(scale * 1.08, scale * 1.08);
        c.strokeStyle = '#0D1021';
        c.lineWidth = 2;

        // Articulated Hydraulic Bipedal Legs
        const drawMechLeg = (lx: number, dark: boolean) => {
          c.fillStyle = flash ? '#FFFFFF' : dark ? '#1E293B' : '#334155';
          // Upper piston thigh
          c.beginPath();
          c.roundRect(lx - 9, -74 + stomp, 18, 36, 4);
          c.fill();
          c.stroke();
          // Hydraulic silver strut
          c.fillStyle = '#94A3B8';
          c.fillRect(lx - 2, -46 + stomp, 4, 18);
          // Lower armored shin + heavy foot
          c.fillStyle = flash ? '#FFFFFF' : dark ? '#26334A' : '#475569';
          c.beginPath();
          c.roundRect(lx - 11, -38, 22, 30, 4);
          c.fill();
          c.stroke();
          c.fillStyle = '#1E293B';
          c.beginPath();
          c.roundRect(lx - 16, -11, 28, 12, 3);
          c.fill();
          c.stroke();
        };
        drawMechLeg(-16, true);
        drawMechLeg(15, false);

        // Twin Shoulder Missile Pods
        c.fillStyle = flash ? '#FFFFFF' : '#334155';
        c.beginPath();
        c.roundRect(-36, -148 + stomp, 20, 26, 4);
        c.roundRect(18, -146 + stomp, 18, 24, 4);
        c.fill();
        c.stroke();

        // Main Heavily Armored Mech Torso Chassis
        const cg = c.createLinearGradient(-34, -142 + stomp, 34, -68 + stomp);
        cg.addColorStop(0, flash ? '#FFFFFF' : '#64748B');
        cg.addColorStop(0.55, flash ? '#FFFFFF' : '#334155');
        cg.addColorStop(1, flash ? '#FFFFFF' : '#1E293B');
        c.fillStyle = cg;
        c.beginPath();
        c.moveTo(-34, -138 + stomp);
        c.lineTo(34, -138 + stomp);
        c.lineTo(28, -72 + stomp);
        c.lineTo(-26, -72 + stomp);
        c.closePath();
        c.fill();
        c.stroke();

        // Glowing Chest Reactor Core
        c.save();
        const coreCol = combat.enemyStunned ? '#38BDF8' : '#F43F5E';
        c.shadowColor = coreCol;
        c.shadowBlur = 14;
        c.fillStyle = coreCol;
        c.beginPath();
        c.arc(-4, -98 + stomp, 9.5, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#FFFFFF';
        c.beginPath();
        c.arc(-4, -98 + stomp, 4, 0, Math.PI * 2);
        c.fill();
        c.restore();

        // Armored Head Turret & Crimson Optic Slit
        c.fillStyle = flash ? '#FFFFFF' : '#475569';
        c.beginPath();
        c.roundRect(-24, -156 + stomp, 42, 22, 6);
        c.fill();
        c.stroke();
        c.save();
        c.shadowColor = coreCol;
        c.shadowBlur = 10;
        c.fillStyle = coreCol;
        c.fillRect(-20, -148 + stomp, 26, 6);
        c.restore();

        // Heavy Rotary Plasma Cannon Arm
        c.fillStyle = flash ? '#FFFFFF' : '#1E293B';
        c.beginPath();
        c.roundRect(-56, -116 + stomp, 36, 16, 4);
        c.fill();
        c.stroke();
        c.fillStyle = '#94A3B8';
        c.fillRect(-62, -114 + stomp, 10, 4);
        c.fillRect(-62, -106 + stomp, 10, 4);

        c.restore();
      } else {
        // Realistic Semi-Realistic Humanoid Enemy (Yard Bruiser or Warden Krag)
        const isKrag = combat.enemyId === 'krag';
        const enemyPose = computeTargetPose(
          'FIGHTING',
          t + 0.9,
          fx.enemyLunge,
          fx.enemyRecoil,
          isKrag
        );
        drawRealisticCharacter(c, ex, floorY, {
          facing: -1,
          suitColor: isKrag ? '#3B2C4A' : '#3F4656',
          pantsColor: isKrag ? '#1E1B2E' : '#262A36',
          skinTone: isKrag ? '#C68B59' : '#D49A74',
          hairColor: '#1E1929',
          eyeColor: '#F59E0B',
          hairStyle: isKrag ? 'riot_helmet' : 'buzz',
          armorId: isKrag ? 'riot_plate' : null,
          weaponId: isKrag ? 'shock_baton' : null,
          sleeveless: !isKrag,
          scar: !isKrag,
          collar: !isKrag,
          build: isKrag ? 1.18 : 1.12,
          scale: scale * (isKrag ? 1.07 : 1.02),
          expression: fx.enemyRecoil > 0.25 ? 'hurt' : 'focused',
          rimColor: lighting.rim,
          flash,
          t: t + 0.9,
          mode: 'FIGHTING',
          pose: enemyPose,
        });
      }

      if (combat.enemyStunned) {
        c.save();
        c.font = '700 12px "Titillium Web", sans-serif';
        c.fillStyle = '#000000';
        c.fillText('STUNNED', ex - 24 + 1, floorY - 178 * scale + 1);
        c.fillStyle = '#7DD3FC';
        c.fillText('STUNNED', ex - 24, floorY - 178 * scale);
        c.restore();
      }
    };

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += dt;
      ambientTimer += dt;

      const fx = fxStateRef.current;
      fx.playerLunge = Math.max(0, fx.playerLunge - dt * 4.2);
      fx.enemyLunge = Math.max(0, fx.enemyLunge - dt * 4.2);
      fx.playerRecoil = Math.max(0, fx.playerRecoil - dt * 4.2);
      fx.enemyRecoil = Math.max(0, fx.enemyRecoil - dt * 4.2);
      fx.playerFlash = Math.max(0, fx.playerFlash - dt * 4);
      fx.enemyFlash = Math.max(0, fx.enemyFlash - dt * 4);
      fx.guardShield = Math.max(0, fx.guardShield - dt * 1.4);
      fx.empArc = Math.max(0, fx.empArc - dt * 2.5);
      fx.slashTimer = Math.max(0, fx.slashTimer - dt * 4.2);
      fx.shake = Math.max(0, fx.shake - dt * 24);

      // Smoothly interpolate skeletal poses at 60fps
      const smooth = 1 - Math.exp(-dt * 11);
      const targetPlayer = computeTargetPose(
        activity,
        elapsed,
        fx.playerLunge,
        fx.playerRecoil,
        Boolean(weaponId)
      );
      const curP = playerPoseRef.current;
      (Object.keys(curP) as (keyof RigPose)[]).forEach((k) => {
        curP[k] = lerp(curP[k], targetPlayer[k], smooth);
      });

      const targetNpc = computeTargetPose('TALKING', elapsed + 1.4, 0, 0, false);
      const curN = npcPoseRef.current;
      (Object.keys(curN) as (keyof RigPose)[]).forEach((k) => {
        curN[k] = lerp(curN[k], targetNpc[k], smooth);
      });

      // Ambient particles
      if (ambientTimer > 0.42) {
        ambientTimer = 0;
        const floorY = H - 30;
        if (activity === 'SLEEPING') {
          particlesRef.current.push({
            x: 78,
            y: floorY - 82,
            vx: 0.35,
            vy: -0.65,
            life: 1,
            maxLife: 1.5,
            size: 13,
            color: '#C7D2FE',
            text: 'Z',
          });
        } else if (activity === 'EATING') {
          particlesRef.current.push({
            x: 168 + (Math.random() - 0.5) * 14,
            y: floorY - 72,
            vx: (Math.random() - 0.5) * 0.2,
            vy: -0.65,
            life: 1,
            maxLife: 1.2,
            size: 3.4,
            color: 'rgba(255,255,255,0.45)',
          });
        } else if (activity === 'MINING') {
          particlesRef.current.push({
            x: 194,
            y: floorY - 68,
            vx: -1.4 - Math.random() * 2.2,
            vy: -1.6 - Math.random() * 1.8,
            life: 1,
            maxLife: 0.52,
            size: 2.5,
            color: '#FFD27D',
          });
        } else if (activity === 'HEALING') {
          particlesRef.current.push({
            x: W * 0.5 + (Math.random() - 0.5) * 64,
            y: floorY - 12,
            vx: 0,
            vy: -1.1,
            life: 1,
            maxLife: 1.15,
            size: 11,
            color: '#7CFFB2',
            text: '+',
          });
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      if (fx.shake > 0.2) {
        ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
      }

      drawPaintedBackdrop(ctx, elapsed);

      const floorY = H - 30;
      const isDual = activity === 'FIGHTING' || activity === 'TALKING';
      const baseScale = compact ? (isDual ? 0.72 : 0.84) : isDual ? 0.88 : 1.06;

      drawActivityPropsBack(ctx, floorY, elapsed);

      // Player Screen Position
      const playerX =
        activity === 'FIGHTING'
          ? 76 + fx.playerLunge * 36 - fx.playerRecoil * 14
          : activity === 'TALKING'
          ? 84
          : activity === 'SLEEPING'
          ? 142
          : activity === 'MINING'
          ? 112
          : activity === 'EATING'
          ? 100
          : W * 0.5;
      const playerY = floorY;

      const playerExpression: DollConfig['expression'] =
        fx.playerRecoil > 0.25
          ? 'hurt'
          : activity === 'SLEEPING'
          ? 'sleeping'
          : activity === 'TALKING'
          ? 'talking'
          : activity === 'EATING'
          ? 'eating'
          : activity === 'FIGHTING' || activity === 'MINING' || activity === 'TRAINING'
          ? 'focused'
          : 'neutral';

      drawRealisticCharacter(ctx, playerX, playerY, {
        facing: 1,
        suitColor: appearance.suitColor,
        skinTone: appearance.skinTone,
        hairColor: '#231D36',
        eyeColor: '#38BDF8',
        hairStyle: appearance.hairStyle,
        armorId,
        weaponId,
        collar: true,
        scale: baseScale,
        expression: playerExpression,
        rimColor: lighting.rim,
        flash: fx.playerFlash > 0.25,
        t: elapsed,
        mode: activity,
        pose: curP,
      });

      drawActivityPropsFront(ctx, floorY, elapsed);

      // Guard Hard-Light Shield FX
      if (fx.guardShield > 0.05) {
        ctx.save();
        ctx.strokeStyle = `rgba(124, 255, 178, ${fx.guardShield})`;
        ctx.fillStyle = `rgba(124, 255, 178, ${fx.guardShield * 0.22})`;
        ctx.shadowColor = '#34D399';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(playerX + 24, floorY - 82 * baseScale, 46 * baseScale, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
        ctx.fill();
        ctx.restore();
      }

      // Face-to-Face Illustrated NPC during TALKING
      if (activity === 'TALKING' && !combat) {
        const isChen = roomId === 'medbay';
        const isRaze = roomId === 'market';
        drawRealisticCharacter(ctx, 198, floorY, {
          facing: -1,
          suitColor: isChen ? '#0F766E' : isRaze ? '#4C1D57' : '#C25E1A',
          pantsColor: isChen ? '#1E293B' : isRaze ? '#1F1630' : '#2E2A42',
          skinTone: isChen ? '#ECC2A2' : isRaze ? '#C99672' : '#E3AE88',
          hairColor: isChen ? '#1A1826' : isRaze ? '#2E2347' : '#6B2F22',
          eyeColor: isChen ? '#14B8A6' : isRaze ? '#D946EF' : '#F59E0B',
          hairStyle: isChen ? 'bob' : isRaze ? 'hood' : 'ponytail',
          armorId: null,
          weaponId: null,
          labCoat: isChen,
          glasses: isChen,
          collar: !isChen,
          scale: baseScale * 0.98,
          expression: 'talking',
          rimColor: lighting.rim,
          t: elapsed + 1.4,
          mode: 'TALKING',
          pose: curN,
        });

        // Subtle animated speech bubble indicator above NPC
        const bY = floorY - 196 * baseScale + Math.sin(elapsed * 4) * 2.5;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = '#140E24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(176, bY, 44, 20, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#35225D';
        const dots = Math.floor(elapsed * 3.2) % 3;
        for (let d = 0; d < 3; d++) {
          ctx.beginPath();
          ctx.arc(188 + d * 10, bY + 10, d <= dots ? 2.6 : 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 1v1 Live Combat Enemy & Slash/EMP VFX
      if (activity === 'FIGHTING' && combat) {
        drawEnemy(ctx, 204, floorY, elapsed, baseScale);

        if (fx.slashTimer > 0.05) {
          ctx.save();
          ctx.strokeStyle = fx.slashColor;
          ctx.shadowColor = fx.slashColor;
          ctx.shadowBlur = 14;
          ctx.globalAlpha = fx.slashTimer;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(178, floorY - 88 * baseScale, 48 * baseScale, -0.95, 0.95);
          ctx.stroke();
          ctx.restore();
        }

        if (fx.empArc > 0.05) {
          ctx.save();
          ctx.strokeStyle = '#7DD3FC';
          ctx.shadowColor = '#38BDF8';
          ctx.shadowBlur = 12;
          ctx.globalAlpha = fx.empArc;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(playerX + 20, floorY - 96 * baseScale);
          ctx.lineTo(126, floorY - 122 * baseScale + (Math.random() - 0.5) * 18);
          ctx.lineTo(162, floorY - 72 * baseScale + (Math.random() - 0.5) * 18);
          ctx.lineTo(202, floorY - 96 * baseScale);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Particles & Floating Damage Numbers
      const nextParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life -= dt / p.maxLife;
        if (p.life <= 0) continue;
        p.x += p.vx;
        p.y += p.vy;
        ctx.save();
        ctx.globalAlpha = clamp(p.life, 0, 1);
        if (p.text) {
          ctx.font = `700 ${p.size}px "Titillium Web", sans-serif`;
          ctx.fillStyle = '#090614';
          ctx.fillText(p.text, p.x - 10 + 1.5, p.y + 1.5);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x - 10, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        nextParticles.push(p);
      }
      particlesRef.current = nextParticles;

      ctx.restore();
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [roomId, activity, appearance, weaponId, armorId, combat, compact]);

  return (
    <div className="relative w-full rounded-[4px] overflow-hidden border-2 border-black/50 bg-[#140F2B] select-none shadow-inner">
      <canvas
        ref={canvasRef}
        className={`w-full block ${compact ? 'h-[196px]' : 'h-[282px]'}`}
        aria-label={`Live scene: ${activityLabel}`}
      />
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2.5 py-1.5 flex items-center justify-between text-[12px] text-white/95">
        <span className="font-semibold truncate">{activityLabel}</span>
        <span className="font-mono-tabular text-[10.5px] text-white/75">{ROOMS[roomId].shortName}</span>
      </div>
    </div>
  );
};
