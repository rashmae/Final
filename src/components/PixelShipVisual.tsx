import React, { useMemo } from 'react';
import { motion } from 'motion/react';

interface Pixel {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  targetX: number;
  targetY: number;
  initOffsetX: number;
  initOffsetY: number;
  category: 'hull' | 'container' | 'bridge' | 'mast' | 'water' | 'accent';
}

export function PixelShipVisual({
  className = '',
  opacity = 0.85,
  isFormed = true
}: {
  className?: string;
  opacity?: number;
  isFormed?: boolean;
}) {
  // Generate pixel ship grid
  const { pixels, wavePixels } = useMemo(() => {
    const list: Pixel[] = [];
    const pixelSize = 10;
    const gap = 2;
    const stride = pixelSize + gap; // 12px per cell
    const originX = 140; // horizontal start
    const originY = 120; // vertical start

    const addPixel = (
      col: number,
      row: number,
      color: string,
      category: Pixel['category']
    ) => {
      const targetX = originX + col * stride;
      const targetY = originY + row * stride;
      // Scatter offsets for the forming animation: pixels fly in from ambient space
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 160;
      const initOffsetX = Math.cos(angle) * distance;
      const initOffsetY = Math.sin(angle) * distance;
      // Stagger delay based on distance & category (hull forms first, then containers, then bridge)
      const baseDelay =
        category === 'water' ? 0.1 :
        category === 'hull' ? 0.3 + col * 0.02 :
        category === 'container' ? 0.7 + Math.random() * 0.4 :
        1.1 + Math.random() * 0.3;

      list.push({
        id: `px-${col}-${row}-${category}`,
        x: targetX,
        y: targetY,
        targetX,
        targetY,
        initOffsetX,
        initOffsetY,
        size: pixelSize,
        color,
        delay: baseDelay,
        category
      });
    };

    // ─────────────────────────────────────────────────────────────
    // 1. CARGO CONTAINERS (Stacked on deck, cols 12 to 44, rows 2 to 9)
    // ─────────────────────────────────────────────────────────────
    const containerColors = [
      '#38BDF8', // Cyan (Maersk / Ocean)
      '#F2A541', // Amber Gold (POLA / Industrial)
      '#10B981', // Emerald (Evergreen)
      '#3B82F6', // Blue (CMA CGM)
      '#F43F5E', // Coral Red (K-Line / ONE)
      '#6366F1', // Indigo
      '#14B8A6'  // Teal
    ];

    // Tier 1 Containers (Deck level: rows 7 - 9, cols 12 to 42)
    for (let r = 7; r <= 9; r++) {
      for (let c = 13; c <= 42; c++) {
        // Block clusters of 3-4 columns per container unit
        const colorIdx = (Math.floor(c / 3) + r * 2) % containerColors.length;
        addPixel(c, r, containerColors[colorIdx], 'container');
      }
    }

    // Tier 2 Containers (Mid level: rows 4 - 6, cols 14 to 39)
    for (let r = 4; r <= 6; r++) {
      for (let c = 14; c <= 39; c++) {
        const colorIdx = (Math.floor(c / 3) + r * 3 + 1) % containerColors.length;
        addPixel(c, r, containerColors[colorIdx], 'container');
      }
    }

    // Tier 3 Containers (Top stacks: rows 2 - 3, cols 17 to 34)
    for (let r = 2; r <= 3; r++) {
      for (let c = 17; c <= 34; c++) {
        const colorIdx = (Math.floor(c / 3) + r * 4 + 2) % containerColors.length;
        addPixel(c, r, containerColors[colorIdx], 'container');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. BRIDGE / SUPERSTRUCTURE & WHEELHOUSE (Stern / Aft: cols 7 to 11, rows 0 to 9)
    // ─────────────────────────────────────────────────────────────
    for (let r = 2; r <= 9; r++) {
      for (let c = 8; c <= 11; c++) {
        // Windows on row 3
        const isWindow = r === 3 && (c === 9 || c === 10);
        addPixel(c, r, isWindow ? '#38BDF8' : '#CBD5E1', 'bridge');
      }
    }
    // Bridge roof & wings
    for (let c = 7; c <= 12; c++) {
      addPixel(c, 1, '#94A3B8', 'bridge');
    }
    // Radar / Navigation Mast (row 0 to -2)
    addPixel(9, 0, '#64748B', 'mast');
    addPixel(10, 0, '#64748B', 'mast');
    addPixel(10, -1, '#38BDF8', 'mast'); // Radar antenna
    addPixel(9, -2, '#EF4444', 'accent'); // Blinking navigation beacon
    addPixel(11, -2, '#10B981', 'accent'); // Starboard green beacon

    // ─────────────────────────────────────────────────────────────
    // 3. SHIP HULL & BULBOUS BOW (Rows 10 to 16, cols 5 to 50)
    // ─────────────────────────────────────────────────────────────
    // Main Hull Upper Plating (row 10 to 11, dark oceanic blue)
    for (let c = 6; c <= 45; c++) {
      addPixel(c, 10, '#1E3A8A', 'hull');
    }
    for (let c = 6; c <= 46; c++) {
      addPixel(c, 11, '#1E40AF', 'hull');
    }

    // Waterline stripe (White/Cyan stripe row 12)
    for (let c = 7; c <= 47; c++) {
      addPixel(c, 12, c % 2 === 0 ? '#38BDF8' : '#0284C7', 'hull');
    }

    // Lower Hull & Keel tapering down to bow
    // Row 13: cols 8 to 48
    for (let c = 8; c <= 48; c++) {
      addPixel(c, 13, '#0F172A', 'hull');
    }
    // Row 14: cols 9 to 47
    for (let c = 9; c <= 47; c++) {
      addPixel(c, 14, '#0B2545', 'hull');
    }
    // Row 15: cols 11 to 45
    for (let c = 11; c <= 45; c++) {
      addPixel(c, 15, '#071A2F', 'hull');
    }
    // Row 16 (Keel bottom): cols 14 to 41
    for (let c = 14; c <= 41; c++) {
      addPixel(c, 16, '#060B14', 'hull');
    }
    // Bulbous Bow extension at right (row 14-15, col 48-50)
    addPixel(48, 14, '#1E3A8A', 'hull');
    addPixel(49, 14, '#38BDF8', 'accent');
    addPixel(48, 15, '#0B2545', 'hull');

    // Stern / Rudder extension at left (row 14-15, col 7)
    addPixel(7, 14, '#0F172A', 'hull');
    addPixel(8, 15, '#0F172A', 'hull');

    // ─────────────────────────────────────────────────────────────
    // 4. WATER WAKE & OCEAN WAVES (Rows 17 to 20, undulating pixels)
    // ─────────────────────────────────────────────────────────────
    const waves: Pixel[] = [];
    for (let r = 17; r <= 20; r++) {
      for (let c = 2; c <= 56; c += (r % 2 === 0 ? 2 : 3)) {
        const targetX = originX + c * stride;
        const targetY = originY + r * stride;
        waves.push({
          id: `wave-${c}-${r}`,
          x: targetX,
          y: targetY,
          targetX,
          targetY,
          initOffsetX: (Math.random() - 0.5) * 80,
          initOffsetY: 30 + Math.random() * 40,
          size: pixelSize * 0.85,
          color: r === 17 ? '#38BDF8' : r === 18 ? '#0284C7' : '#0369A1',
          delay: 0.1 + c * 0.02,
          category: 'water'
        });
      }
    }

    return { pixels: list, wavePixels: waves };
  }, []);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center pointer-events-none select-none overflow-hidden ${className}`}
      style={{ opacity }}
    >
      {/* Background ambient radial glow matching POLA harbor night */}
      <div className="absolute inset-0 bg-radial from-sky-900/20 via-transparent to-transparent pointer-events-none" />

      {/* Ship SVG Canvas */}
      <motion.svg
        viewBox="0 0 920 440"
        className="w-full max-w-5xl h-auto"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <defs>
          <filter id="glow-pixel" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="hullWaterFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Floating Ship Wrapper with Gentle Oceanic Bobbing */}
        <motion.g
          animate={{
            y: [0, -5, 0],
            rotate: [0, 0.35, 0]
          }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{ transformOrigin: '450px 240px' }}
        >
          {/* Ship Particles forming into the vessel */}
          {pixels.map((p) => {
            return (
              <motion.rect
                key={p.id}
                width={p.size}
                height={p.size}
                rx={1.5}
                fill={p.color}
                initial={{
                  x: p.targetX + p.initOffsetX,
                  y: p.targetY + p.initOffsetY,
                  opacity: 0,
                  scale: 0.2
                }}
                animate={
                  isFormed
                    ? {
                        x: p.targetX,
                        y: p.targetY,
                        opacity: 1,
                        scale: 1
                      }
                    : {
                        x: p.targetX + p.initOffsetX,
                        y: p.targetY + p.initOffsetY,
                        opacity: 0.25,
                        scale: 0.4
                      }
                }
                transition={{
                  duration: 1.4,
                  delay: p.delay,
                  ease: [0.16, 1, 0.3, 1]
                }}
                filter={p.category === 'accent' ? 'url(#glow-pixel)' : undefined}
                className="transition-colors"
              />
            );
          })}

          {/* Radar Blinking Beacon Beacon Effect */}
          <motion.circle
            cx={250}
            cy={96}
            r={5}
            fill="#EF4444"
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.4, 0.8]
            }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            filter="url(#glow-pixel)"
          />

          {/* Animated Fun Smoke Puffs from Funnel */}
          {[0, 1, 2].map((idx) => (
            <motion.rect
              key={`smoke-${idx}`}
              width={8}
              height={8}
              rx={2}
              fill="#94A3B8"
              animate={{
                y: [-10, -45 - idx * 12],
                x: [248 + idx * 4, 235 - idx * 8],
                opacity: [0, 0.75, 0],
                scale: [0.6, 1.4, 2.0]
              }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                delay: idx * 0.85,
                ease: 'easeOut'
              }}
            />
          ))}
        </motion.g>

        {/* Ambient Water Reflection Glow under hull */}
        <motion.ellipse
          cx={470}
          cy={330}
          rx={280}
          ry={16}
          fill="url(#hullWaterFade)"
          opacity={0.65}
          animate={{
            scaleX: [0.95, 1.05, 0.95],
            opacity: [0.45, 0.75, 0.45]
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Undulating Sea Wave Pixels */}
        <g>
          {wavePixels.map((w, i) => (
            <motion.rect
              key={w.id}
              width={w.size * 1.4}
              height={w.size * 0.6}
              rx={1}
              fill={w.color}
              initial={{
                x: w.targetX + w.initOffsetX,
                y: w.targetY + w.initOffsetY,
                opacity: 0
              }}
              animate={{
                x: [w.targetX - 8, w.targetX + 8, w.targetX - 8],
                y: w.targetY,
                opacity: [0.25, 0.65, 0.25]
              }}
              transition={{
                duration: 3 + (i % 4) * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: w.delay
              }}
            />
          ))}
        </g>

        {/* Ambient Data Grid Lines around the ship */}
        <path
          d="M 120 315 L 800 315"
          stroke="#1B6CA8"
          strokeWidth="1"
          strokeDasharray="4 6"
          opacity="0.35"
        />
        <path
          d="M 160 335 L 760 335"
          stroke="#38BDF8"
          strokeWidth="1"
          strokeDasharray="6 8"
          opacity="0.25"
        />
      </motion.svg>

      {/* Subtle Bottom Vignette */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#060B14] to-transparent pointer-events-none" />
    </div>
  );
}
