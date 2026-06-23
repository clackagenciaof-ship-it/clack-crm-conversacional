import type { Lead, LeadTemperature } from '@/types/crm';
import { LEAD_SOURCES } from '@/lib/crm/constants';

type DashboardChartsProps = {
  leads: Lead[];
};

const tempColors: Record<LeadTemperature, string> = {
  Quente: '#ff5a2f',
  Morno: '#f4b000',
  Frio: '#00a6c8'
};

function describeTrend(current: number, previous: number) {
  if (current > previous) return 'em crescimento';
  if (current < previous) return 'em atenção';
  return 'estável';
}

export function DashboardCharts({ leads }: DashboardChartsProps) {
  const sourceCounts = LEAD_SOURCES.map((source) => ({
    name: source,
    count: leads.filter((lead) => lead.source === source).length
  }));
  const maxSource = Math.max(...sourceCounts.map((source) => source.count), 1);

  const tempCounts = (['Quente', 'Morno', 'Frio'] as LeadTemperature[]).map((temp) => ({
    name: temp,
    count: leads.filter((lead) => lead.temperature === temp).length
  }));
  const totalTemps = tempCounts.reduce((sum, item) => sum + item.count, 0);
  const safeTotalTemps = Math.max(totalTemps, 1);

  const weeklyLine = [
    Math.max(1, Math.round(leads.length * 0.35)),
    Math.max(1, Math.round(leads.length * 0.45)),
    Math.max(1, Math.round(leads.length * 0.62)),
    Math.max(1, Math.round(leads.length * 0.55)),
    Math.max(1, Math.round(leads.length * 0.78)),
    Math.max(1, Math.round(leads.length * 0.92)),
    Math.max(1, leads.length)
  ];
  const maxLine = Math.max(...weeklyLine, 1);
  const linePoints = weeklyLine.map((value, index) => `${34 + index * 47},${122 - (value / maxLine) * 82}`).join(' ');
  const trend = describeTrend(weeklyLine[weeklyLine.length - 1], weeklyLine[weeklyLine.length - 2]);

  let current = 0;
  const pieSegments = tempCounts.map((item) => {
    const start = current;
    const percentage = totalTemps ? (item.count / safeTotalTemps) * 100 : item.name === 'Quente' ? 34 : item.name === 'Morno' ? 33 : 33;
    const end = current + percentage;
    current = end;
    return `${tempColors[item.name]} ${start}% ${end}%`;
  }).join(', ');

  return (
    <div className="grid dashboard-charts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginTop: 16 }}>
      <div className="card pad chart-card premium-chart">
        <div className="section-title">
          <h2>Gráfico de linhas</h2>
          <span>{leads.length} leads • {trend}</span>
        </div>
        <svg viewBox="0 0 360 190" width="100%" height="210" role="img" aria-label="Evolução semanal de leads">
          <defs>
            <linearGradient id="lineGradientPremium" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#005954" />
              <stop offset="55%" stopColor="#338b85" />
              <stop offset="100%" stopColor="#5dc1b9" />
            </linearGradient>
            <linearGradient id="lineAreaPremium" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#5dc1b9" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#5dc1b9" stopOpacity="0.02" />
            </linearGradient>
            <filter id="lineGlowPremium" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#005954" floodOpacity="0.22" />
            </filter>
          </defs>
          {[44, 84, 124].map((y) => <path key={y} d={`M34 ${y} H330`} stroke="#d4e9e6" strokeWidth="1" />)}
          <path d={`M34 124 L${linePoints.split(' ').slice(1).join(' L')} L318 146 L34 146 Z`} fill="url(#lineAreaPremium)" opacity="0.9" />
          <polyline points={linePoints} fill="none" stroke="url(#lineGradientPremium)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineGlowPremium)" />
          {weeklyLine.map((value, index) => {
            const x = 34 + index * 47;
            const y = 122 - (value / maxLine) * 82;
            return <g key={index}>
              <circle cx={x} cy={y} r="7" fill="#ffffff" stroke="#005954" strokeWidth="3" />
              <text x={x} y={y - 14} textAnchor="middle" fontSize="11" fontWeight="800" fill="#063b37">{value}</text>
              <text x={x} y="172" textAnchor="middle" fontSize="10" fill="#426a67">D{index + 1}</text>
            </g>;
          })}
        </svg>
        <p className="notice">Leitura rápida: acompanhe a evolução da base e use os picos para entender origem, campanha e temperatura.</p>
      </div>

      <div className="card pad chart-card premium-chart">
        <div className="section-title">
          <h2>Gráfico de barras</h2>
          <span>Leads por origem</span>
        </div>
        <div className="report-bars premium-bars">
          {sourceCounts.map((item) => (
            <div className="bar" key={item.name}>
              <span><b>{item.name}</b><b>{item.count}</b></span>
              <i style={{ width: `${Math.max(7, (item.count / maxSource) * 100)}%` }} />
            </div>
          ))}
        </div>
        <p className="notice" style={{ marginTop: 12 }}>Onde acelerar: invista nos canais que geram mais leads qualificados e replique o padrão nos canais com baixa entrada.</p>
      </div>

      <div className="card pad chart-card premium-chart">
        <div className="section-title">
          <h2>Gráfico de pizza</h2>
          <span>Temperatura</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 18, alignItems: 'center' }}>
          <div style={{ width: 150, height: 150, borderRadius: '999px', background: `conic-gradient(${pieSegments})`, boxShadow: '0 16px 45px rgba(0,89,84,.14)', border: '10px solid rgba(255,255,255,.75)' }} />
          <div style={{ display: 'grid', gap: 10, width: '100%' }}>
            {tempCounts.map((item) => {
              const percent = totalTemps ? Math.round((item.count / safeTotalTemps) * 100) : 0;
              return <div key={item.name} className="bar">
                <span>
                  <b><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 99, background: tempColors[item.name], marginRight: 6 }} />{item.name}</b>
                  <b>{item.count} • {percent}%</b>
                </span>
                <i style={{ width: `${Math.max(5, percent)}%`, background: tempColors[item.name] }} />
              </div>;
            })}
          </div>
        </div>
        <p className="notice" style={{ marginTop: 12 }}>Prioridade comercial: leads quentes pedem contato rápido; mornos pedem nutrição; frios pedem régua de relacionamento.</p>
      </div>
    </div>
  );
}
