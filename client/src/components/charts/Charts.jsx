import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { TrendingUp } from 'lucide-react';

// ====== CLAY TOOLTIP ======
function ClayTooltip({ x, y, visible, children }) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: x,
        top: y - 10,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="rounded-clay-sm bg-[#f5efe6] px-3 py-2 text-xs"
        style={{
          boxShadow: '6px 6px 18px rgba(0,0,0,0.08), inset -3px -3px 10px rgba(0,0,0,0.02), inset 3px 3px 10px rgba(255,255,255,0.6)'
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ====== SVG LINE CHART ======
export function LineChart({
  data,
  width = '100%',
  height = 250,
  color = '#1a1a1a',
  gradientId = 'lineGradient',
  showDots = true,
  animate = true,
  formatter = (v) => `ETB ${v.toLocaleString()}`,
  labelFormatter = (l) => l,
}) {
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 600, h: height });

  useEffect(() => {
    if (!svgRef.current) return;
    const resize = () => {
      const rect = svgRef.current.getBoundingClientRect();
      setDimensions({ w: rect.width || 600, h: height });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [height]);

  const { w, h } = dimensions;
  const padding = { top: 20, right: 20, bottom: 30, left: 20 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  const xScale = (i) => padding.left + (i / (data.length - 1 || 1)) * chartW;
  const yScale = (v) => padding.top + chartH - (v / maxVal) * chartH;

  const linePath = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.value)}`
  ).join(' ');

  const areaPath = `${linePath} L${xScale(data.length - 1)},${padding.top + chartH} L${xScale(0)},${padding.top + chartH} Z`;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg ref={svgRef} width="100%" height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding.top + chartH * (1 - pct);
          return (
            <g key={i}>
              <line
                x1={padding.left} y1={y}
                x2={w - padding.right} y2={y}
                stroke="#dcc8ae" strokeWidth="0.5" strokeDasharray="4 4"
                opacity="0.5"
              />
              <text
                x={padding.left - 8} y={y + 3}
                textAnchor="end" className="text-[9px]"
                fill="#a6967e"
              >
                {Math.round(maxVal * pct).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Animation clip */}
        <clipPath id={`clip-${gradientId}`}>
          <motion.rect
            x={0} y={0}
            width={animate ? w : w}
            height={h}
            initial={animate ? { width: 0 } : undefined}
            animate={animate ? { width: w } : undefined}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </clipPath>

        <g clipPath={`url(#clip-${gradientId})`}>
          {/* Area fill */}
          <path d={areaPath} fill={`url(#${gradientId})`} />

          {/* Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={animate ? { pathLength: 0 } : undefined}
            animate={animate ? { pathLength: 1 } : undefined}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 6px ${color}44)`
            }}
          />

          {/* Dots */}
          {showDots && data.map((d, i) => (
            <g key={i}>
              <circle
                cx={xScale(i)} cy={yScale(d.value)}
                r={hovered === i ? 5 : 3}
                fill="#f5efe6" stroke={color} strokeWidth="2"
                className="cursor-pointer transition-all duration-200"
                style={{
                  opacity: hovered === i ? 1 : 0.6,
                }}
                onMouseEnter={(e) => {
                  setHovered(i);
                  const rect = svgRef.current.getBoundingClientRect();
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
                }}
                onMouseMove={(e) => {
                  const rect = svgRef.current.getBoundingClientRect();
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
                }}
                onMouseLeave={() => setHovered(null)}
              />
              {/* Invisible wider hit area */}
              <circle
                cx={xScale(i)} cy={yScale(d.value)} r="10"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  setHovered(i);
                  const rect = svgRef.current.getBoundingClientRect();
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
                }}
                onMouseMove={(e) => {
                  const rect = svgRef.current.getBoundingClientRect();
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
                }}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          ))}

          {/* X-axis labels */}
          {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 || i === data.length - 1).map((d, i) => {
            const idx = data.indexOf(d);
            return (
              <text
                key={i}
                x={xScale(idx)} y={h - 5}
                textAnchor="middle" className="text-[9px]"
                fill="#a6967e"
              >
                {labelFormatter(d.label)}
              </text>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      <ClayTooltip x={tooltipPos.x} y={tooltipPos.y} visible={hovered !== null}>
        {hovered !== null && (
          <>
            <p className="font-semibold text-[#433930]">{labelFormatter(data[hovered]?.label)}</p>
            <p className="text-[#1a1a1a] font-bold">{formatter(data[hovered]?.value)}</p>
          </>
        )}
      </ClayTooltip>
    </div>
  );
}

// ====== SVG BAR CHART ======
export function BarChart({
  data,
  width = '100%',
  height = 220,
  color = '#1a1a1a',
  barRadius = 4,
  animate = true,
  formatter = (v) => `ETB ${v.toLocaleString()}`,
  labelFormatter = (l) => l,
  horizontal = false,
}) {
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 600, h: height });

  useEffect(() => {
    if (!svgRef.current) return;
    const resize = () => {
      const rect = svgRef.current.getBoundingClientRect();
      setDimensions({ w: rect.width || 600, h: height });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [height]);

  const { w, h } = dimensions;
  const padding = { top: 10, right: 10, bottom: 24, left: 10 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barCount = data.length;
  const gap = horizontal ? 6 : 4;
  const barW = (chartW - gap * (barCount - 1)) / barCount;

  const getBarX = (i) => padding.left + i * (barW + gap);
  const getBarHeight = (v) => (v / maxVal) * chartH;
  const getBarY = (v) => padding.top + chartH - getBarHeight(v);

  return (
    <div className="relative w-full" style={{ height }}>
      <svg ref={svgRef} width="100%" height={height} className="overflow-visible">
        {/* Bars */}
        {data.map((d, i) => {
          const barH = getBarHeight(d.value);
          const barX = getBarX(i);
          const barY = getBarY(d.value);
          const isHovered = hovered === i;

          return (
            <g key={i}>
              {/* Background bar (subtle clay) */}
              <rect
                x={barX} y={padding.top}
                width={barW} height={chartH}
                fill="#ebe0d0" rx={barRadius}
                opacity="0.3"
              />
              {/* Animated bar */}
              <motion.rect
                x={barX}
                y={animate ? padding.top + chartH : barY}
                width={barW}
                height={animate ? 0 : barH}
                fill={color}
                rx={barRadius}
                initial={animate ? { y: padding.top + chartH, height: 0 } : undefined}
                animate={animate ? { y: barY, height: barH } : undefined}
                transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                className="cursor-pointer"
                style={{
                  filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
                  transition: 'filter 0.2s',
                }}
                onMouseEnter={(e) => {
                  setHovered(i);
                  const rect = svgRef.current.getBoundingClientRect();
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
                }}
                onMouseMove={(e) => {
                  const rect = svgRef.current.getBoundingClientRect();
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
                }}
                onMouseLeave={() => setHovered(null)}
              />
              {/* Label */}
              <text
                x={barX + barW / 2} y={h - 3}
                textAnchor="middle" className="text-[9px]"
                fill={isHovered ? '#433930' : '#a6967e'}
                fontWeight={isHovered ? 600 : 400}
              >
                {labelFormatter(d.label)}
              </text>
            </g>
          );
        })}

        {/* Y-axis reference line */}
        <line
          x1={padding.left} y1={padding.top}
          x2={padding.left} y2={padding.top + chartH}
          stroke="#dcc8ae" strokeWidth="0.5" opacity="0.3"
        />
      </svg>

      {/* Tooltip */}
      <ClayTooltip x={tooltipPos.x} y={tooltipPos.y} visible={hovered !== null}>
        {hovered !== null && (
          <>
            <p className="font-semibold text-[#433930]">{labelFormatter(data[hovered]?.label)}</p>
            <p className="text-[#1a1a1a] font-bold">{formatter(data[hovered]?.value)}</p>
          </>
        )}
      </ClayTooltip>
    </div>
  );
}

// ====== DONUT CHART ======
export function DonutChart({
  data,
  size = 200,
  innerRadius = 65,
  strokeWidth = 28,
  animate = true,
  formatter = (v) => `ETB ${v.toLocaleString()}`,
}) {
  const [hovered, setHovered] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const colors = ['#1a1a1a', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#888888'];

  let accumulatedAngle = -90;
  const arcs = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + angle;
    accumulatedAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    return {
      path: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      color: d.color || colors[i % colors.length],
      ...d,
    };
  });

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ebe0d0" strokeWidth={strokeWidth} opacity="0.4" />

        {/* Arcs */}
        {arcs.map((arc, i) => (
          <motion.path
            key={i}
            d={arc.path}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="cursor-pointer"
            initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
            animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
            transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
            style={{
              filter: hovered === i
                ? `drop-shadow(0 0 8px ${arc.color}66)`
                : 'none',
              transition: 'filter 0.2s',
              transformOrigin: 'center',
              transform: hovered === i ? 'scale(1.05)' : 'scale(1)',
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}

        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" className="text-sm font-bold" fill="#433930">
          {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="text-[9px]" fill="#a6967e">
          Total ETB
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        {data.map((d, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] transition-all cursor-pointer ${
              hovered === i ? 'bg-[#f5efe6] shadow-sm' : ''
            }`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: d.color || colors[i % colors.length] }}
            />
            <span className="text-[#75644f] font-medium">{d.label}</span>
            <span className="text-[#433930] font-semibold">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hovered !== null && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-center bg-[#f5efe6] px-3 py-2 rounded-clay-sm"
          style={{
            boxShadow: '4px 4px 12px rgba(0,0,0,0.06), inset -2px -2px 6px rgba(0,0,0,0.02), inset 2px 2px 6px rgba(255,255,255,0.6)'
          }}
        >
          <span className="font-semibold text-[#433930]">{data[hovered]?.label}:</span>{' '}
          <span className="text-[#1a1a1a] font-bold">{formatter(data[hovered]?.value)}</span>
        </motion.div>
      )}
    </div>
  );
}

// ====== ANIMATED COUNTER ======
export function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0, duration = 1.5 }) {
  const numValue = Number(value) || 0;
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {prefix}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <CountUp target={numValue} decimals={decimals} duration={duration} />
      </motion.span>
      {suffix}
    </motion.span>
  );
}

function CountUp({ target, decimals, duration }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    startRef.current = null;
    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * ease);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ====== CLAY STAT CARD ======
export function ClayStatCard({ title, value, trend, icon, color = 'from-[#1a1a1a] to-[#333333]', delay = 0, prefix = 'ETB ', isMoney = true }) {
  const isUp = trend >= 0;
  // Render icon: if it's a string with ':', treat as icon reference, otherwise render as-is (component)
  const renderIcon = icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className="card-3d p-5 group cursor-default relative overflow-hidden"
    >
      {/* Clay accent bar */}
      <div
        className="absolute top-0 left-0 w-full h-1 opacity-60"
        style={{
          background: `linear-gradient(90deg, ${color.replace('from-', '').split(' ')[0]}, ${color.replace('to-', '').split(' ')[1] || color.replace('from-', '').split(' ')[0]})`
        }}
      />

      <div className="flex items-start justify-between mb-3">
        <motion.div
          className={`w-12 h-12 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-xl shadow-lg`}
          whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          {renderIcon}
        </motion.div>
        <motion.span
          className={`flex items-center gap-1 text-sm font-semibold ${isUp ? 'text-green-600' : 'text-red-500'}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + 0.3 }}
        >
          <motion.span
            animate={{ rotate: isUp ? 0 : 180 }}
            className="inline-block"
          >
            <TrendingUp size="1em" />
          </motion.span>
          {Math.abs(trend)}%
        </motion.span>
      </div>

      <motion.p
        className="text-2xl font-bold text-[#433930] mb-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.2 }}
      >
        {isMoney ? (
          <AnimatedCounter value={value} prefix={prefix} />
        ) : (
          <AnimatedCounter value={value} />
        )}
      </motion.p>
      <p className="text-sm text-[#75644f]">{title}</p>

      {/* Trend bar */}
      <div className="mt-3 pt-3 border-t border-[#ebe0d0]">
        <div className="w-full bg-[#ebe0d0] rounded-full h-1.5 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isUp ? 'bg-[#1a1a1a]' : 'bg-[#ef4444]'}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(Math.abs(trend) * 5, 100)}%` }}
            transition={{ duration: 1, delay: delay + 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
