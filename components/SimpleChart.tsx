"use client"

import React, { useMemo, useState } from 'react'

import { ChartDataPoint } from '../types'

interface SimpleChartProps {
  data: ChartDataPoint[]
  color: string
  height?: number
  unit?: string
  label: string
}

const SimpleChart: React.FC<SimpleChartProps> = ({
  data,
  color = '#6366f1',
  height = 200,
  unit = '',
  label
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const { points, polygonPoints, maxValue } = useMemo(() => {
    if (data.length === 0) return { points: '', polygonPoints: '', maxValue: 0 }

    const max = Math.max(...data.map(d => d.value)) * 1.2 // Add 20% headroom
    const width = 100 // Use percentage for width coordinates
    const stepX = width / (data.length - 1)

    const pts = data.map((d, i) => {
      const x = i * stepX
      const y = 100 - (d.value / max) * 100 // Invert Y because SVG coords go down
      return `${x},${y}`
    })

    const pointsStr = pts.join(' ')
    // Close the polygon for the gradient fill (bottom-right -> bottom-left -> first point)
    const polygonStr = `${pointsStr} 100,100 0,100`

    return { points: pointsStr, polygonPoints: polygonStr, maxValue: max }
  }, [data])

  return (
    <div className="w-full relative select-none">
      <div className="flex justify-between items-end mb-4 px-2">
        <div>
          <h3 className="text-sm font-medium text-zinc-400">{label}</h3>
          {hoverIndex !== null ? (
            <div className="text-2xl font-bold text-white transition-all">
              {unit}{data[hoverIndex].value}
            </div>
          ) : (
            <div className="text-2xl font-bold text-white">
              {unit}{data.reduce((acc, cur) => acc + cur.value, 0)} <span className="text-xs font-normal text-zinc-500">Total</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full" style={{ height: `${height}px` }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {/* Defs for Gradient */}
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines (Simple horizontal) */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />

          {/* Area Fill */}
          <polygon
            points={polygonPoints}
            fill={`url(#gradient-${label})`}
          />

          {/* Line Stroke */}
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Interactive Overlay */}
          {data.map((_, i) => (
            <rect
              key={i}
              x={i * (100 / (data.length - 1)) - (100 / (data.length - 1) / 2)}
              y="0"
              width={100 / (data.length - 1)}
              height="100"
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-crosshair"
            />
          ))}

          {/* Active Point Highlight */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={hoverIndex * (100 / (data.length - 1))}
                y1="0"
                x2={hoverIndex * (100 / (data.length - 1))}
                y2="100"
                stroke="#52525b"
                strokeWidth="1"
                strokeDasharray="2 2"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={hoverIndex * (100 / (data.length - 1))}
                cy={100 - (data[hoverIndex].value / maxValue) * 100}
                r="4"
                fill={color}
                stroke="#18181b"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>

        {/* X Axis Labels */}
        <div className="absolute bottom-[-24px] left-0 w-full flex justify-between px-0">
          {data.map((d, i) => (
            <span
              key={i}
              className={`text-[10px] text-zinc-500 transition-colors ${i === hoverIndex ? 'text-white font-bold' : ''}`}
              style={{ width: `${100 / data.length}%`, textAlign: 'center' }}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SimpleChart