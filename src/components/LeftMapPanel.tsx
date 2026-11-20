import React from 'react';
import { ROOMS } from '../game/data/world';
import { RoomId } from '../game/types';

interface LeftMapPanelProps {
  currentRoomId: RoomId;
  day: number;
  hour: number;
  disabled: boolean;
  onTravel: (roomId: RoomId) => void;
}

// Clean spatial layout inside BDCC's MapAndTimePanel viewport
const NODE_POS: Record<RoomId, { x: number; y: number; short: string }> = {
  command: { x: 118, y: 26, short: 'Escape' },
  mineshaft: { x: 42, y: 78, short: 'Mines' },
  hub: { x: 118, y: 78, short: 'Hub' },
  yard: { x: 194, y: 78, short: 'Yard' },
  market: { x: 42, y: 132, short: 'Market' },
  cell: { x: 118, y: 132, short: 'Cell' },
  medbay: { x: 194, y: 132, short: 'Medbay' },
};

const EDGES: [RoomId, RoomId][] = [
  ['hub', 'command'],
  ['hub', 'mineshaft'],
  ['hub', 'yard'],
  ['hub', 'cell'],
  ['hub', 'market'],
  ['hub', 'medbay'],
  ['mineshaft', 'market'],
  ['yard', 'medbay'],
];

export const LeftMapPanel: React.FC<LeftMapPanelProps> = ({
  currentRoomId,
  day,
  hour,
  disabled,
  onTravel,
}) => {
  const room = ROOMS[currentRoomId];
  const timeStr = `${String(hour).padStart(2, '0')}:00, day ${day}`;

  return (
    <div className="space-y-1.5">
      <div className="text-[12px] text-white/65 truncate">Station Deck · Click room to travel</div>

      {/* Embedded Godot Map Viewport */}
      <div
        className="w-full rounded-[3px] border border-black/45 overflow-hidden"
        style={{ backgroundColor: '#1E1638' }}
      >
        <svg
          viewBox="0 0 236 160"
          className="w-full h-auto block select-none"
          role="img"
          aria-label="Titan-9 Interactive Station Map"
        >
          {/* Subtle floor grid */}
          <defs>
            <pattern id="bdccGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="236" height="160" fill="url(#bdccGrid)" />

          {/* Corridor links */}
          {EDGES.map(([a, b]) => {
            const p1 = NODE_POS[a];
            const p2 = NODE_POS[b];
            const activeEdge = a === currentRoomId || b === currentRoomId;
            return (
              <line
                key={`${a}-${b}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={activeEdge ? '#7C6FC4' : '#443978'}
                strokeWidth={activeEdge ? 2.5 : 1.8}
              />
            );
          })}

          {/* Room squares */}
          {(Object.keys(NODE_POS) as RoomId[]).map((id) => {
            const pos = NODE_POS[id];
            const isCurrent = id === currentRoomId;
            const clickable = !disabled && !isCurrent;
            return (
              <g
                key={id}
                onClick={() => clickable && onTravel(id)}
                className={clickable ? 'cursor-pointer' : ''}
              >
                <rect
                  x={pos.x - 28}
                  y={pos.y - 14}
                  width={56}
                  height={28}
                  rx={3}
                  fill={isCurrent ? '#8B2C50' : '#2C588B'}
                  stroke={isCurrent ? '#FFFFFF' : '#7FA9D9'}
                  strokeWidth={isCurrent ? 2 : 1.2}
                  opacity={disabled && !isCurrent ? 0.45 : 1}
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight={700}
                  fill="#FFFFFF"
                >
                  {pos.short}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Authentic MapAndTimePanel LocationLabel + timeLabel */}
      <div className="pt-0.5 leading-tight">
        <div className="text-[14px] font-semibold text-white truncate">{room.name}</div>
        <div className="text-[13px] text-white/80 font-mono-tabular">{timeStr}</div>
      </div>
    </div>
  );
};
