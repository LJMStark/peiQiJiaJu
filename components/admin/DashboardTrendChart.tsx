import { formatBeijingDateTime } from '@/lib/beijing-time';

export type TrendPoint = {
  day: string;
  registrations: number;
  generations: number;
};

type Series = {
  key: 'registrations' | 'generations';
  label: string;
  color: string;
};

const SERIES: readonly Series[] = [
  { key: 'generations', label: '生成数', color: '#f97316' },
  { key: 'registrations', label: '注册数', color: '#6366f1' },
] as const;

const WIDTH = 720;
const HEIGHT = 200;
const PADDING_X = 32;
const PADDING_Y = 24;

function buildPath(values: number[], maxValue: number): string {
  if (values.length === 0) {
    return '';
  }

  const innerWidth = WIDTH - PADDING_X * 2;
  const innerHeight = HEIGHT - PADDING_Y * 2;
  const stepX = values.length > 1 ? innerWidth / (values.length - 1) : 0;
  const safeMax = maxValue > 0 ? maxValue : 1;

  return values
    .map((value, index) => {
      const x = PADDING_X + stepX * index;
      const y = PADDING_Y + innerHeight - (value / safeMax) * innerHeight;
      const command = index === 0 ? 'M' : 'L';
      return `${command}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function formatShortDate(day: string): string {
  if (!day) return '';
  const parts = day.split('-');
  if (parts.length !== 3) return day;
  return `${parts[1]}/${parts[2]}`;
}

export function DashboardTrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-gray-500">
        暂无趋势数据。
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    ...points.map((p) => Math.max(p.registrations, p.generations))
  );

  const tickIndices = (() => {
    if (points.length <= 1) return [0];
    if (points.length <= 6) {
      return points.map((_, i) => i);
    }
    const step = Math.floor((points.length - 1) / 5);
    const indices = [0];
    for (let i = step; i < points.length - 1; i += step) {
      indices.push(i);
    }
    indices.push(points.length - 1);
    return indices;
  })();

  const totalReg = points.reduce((sum, p) => sum + p.registrations, 0);
  const totalGen = points.reduce((sum, p) => sum + p.generations, 0);

  return (
    <div className="px-6 py-5">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {SERIES.map((series) => (
          <div key={series.key} className="flex items-center gap-2 text-xs text-gray-600">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: series.color }}
              aria-hidden
            />
            <span>{series.label}</span>
            <span className="text-gray-400">
              （{points.length} 天合计：
              {series.key === 'generations' ? totalGen : totalReg}）
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto"
          role="img"
          aria-label="最近趋势"
        >
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = PADDING_Y + (HEIGHT - PADDING_Y * 2) * (1 - ratio);
            return (
              <line
                key={ratio}
                x1={PADDING_X}
                x2={WIDTH - PADDING_X}
                y1={y}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth={1}
              />
            );
          })}

          {SERIES.map((series) => {
            const values = points.map((p) => p[series.key]);
            const d = buildPath(values, maxValue);
            return (
              <path
                key={series.key}
                d={d}
                fill="none"
                stroke={series.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}

          {tickIndices.map((index) => {
            const point = points[index];
            if (!point) return null;
            const innerWidth = WIDTH - PADDING_X * 2;
            const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;
            const x = PADDING_X + stepX * index;
            return (
              <text
                key={point.day}
                x={x}
                y={HEIGHT - 6}
                textAnchor="middle"
                fontSize={10}
                fill="#9ca3af"
              >
                {formatShortDate(point.day)}
              </text>
            );
          })}

          <text x={PADDING_X - 6} y={PADDING_Y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            {maxValue}
          </text>
          <text x={PADDING_X - 6} y={HEIGHT - PADDING_Y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            0
          </text>
        </svg>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        最近更新：{formatBeijingDateTime(new Date())}
      </p>
    </div>
  );
}
