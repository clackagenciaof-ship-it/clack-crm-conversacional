import type { Lead, LeadTemperature } from '@/types/crm';
import { LEAD_SOURCES } from '@/lib/crm/constants';

type DashboardChartsProps = {
  leads: Lead[];
};

export function DashboardCharts({ leads }: DashboardChartsProps) {
  const weeklyLine = [2, 3, 5, 4, 7, 8, leads.length];
  const maxLine = Math.max(...weeklyLine);
  const linePoints = weeklyLine
    .map((value, index) => `${34 + index * 47},${122 - (value / maxLine) * 82}`)
    .join(' ');

  const sourceCounts = LEAD_SOURCES.map((source) => ({
    name: source,
    count: leads.filter((lead) => lead.source === source).length
  }));
  const maxSource = Math.max(...sourceCounts.map((source) => source.count), 1);

  const tempCounts = (['Quente', 'Morno', 'Frio'] as LeadTemperature[]).map((temp) => ({
    name: temp,
    count: leads.filter((lead) => lead.temperature === temp).length
  }));
  const totalTemps = Math.max(tempCounts.reduce((sum, item) => sum + item.count, 0), 1);
  const pieColors: Record<LeadTemperature, string> = {
    Quente: '#e86b42',
    Morno: '#d5a51c',
    Frio: '#36a7bd'
  };

  let current = 0;
  const pieGradient = tempCounts
    .map((item) => {
      const start = current;
      const end = current + (item.count / totalTemps) * 100;
      current = end;
      return `${pieColors[item.name]} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginTop: 16 }}>
      <div className="card pad">
        <div className="section-title">
          <h2>Gráfico de linhas</h2>
          <span>Evolução de leads</span>
        </div>
        <svg viewBox="0 0 330 150" width="100%" height="160" role="img" aria-label="Evolução semanal de leads">
          <path d="M34 124 H318" stroke="#c9dfdd" strokeWidth="2" />
          <path d="M34 84 H318" stroke="#d9ebe9" strokeWidth="1" />
          <path d="M34 44 H318" stroke="#d9ebe9" strokeWidth="1" />
          <polyline points={linePoints} fill="none" stroke="#005954" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          {weeklyLine.map((value, index) => (
            <circle key={index} cx={34 + index * 47} cy={122 - (value / maxLine) * 82} r="5" fill="#5dc1b9" stroke="#005954" strokeWidth="2" />
          ))}
        </svg>
      </div>

      <div className="card pad">
        <div className="section-title">
          <h2>Gráfico de barras</h2>
          <span>Leads por origem</span>
        </div>
        <div className="report-bars">
          {sourceCounts.map((item) => (
            <div className="bar" key={item.name}>
              <span>
                <b>{item.name}</b>
                <b>{item.count}</b>
              </span>
              <i style={{ width: `${Math.max(7, (item.count / maxSource) * 100)}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="card pad">
        <div className="section-title">
          <h2>Gráfico de pizza</h2>
          <span>Temperatura</span>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', gap: 12 }}>
          <div style={{ width: 142, height: 142, borderRadius: '50%', background: `conic-gradient(${pieGradient})`, boxShadow: '0 18px 40px rgba(0,89,84,.14)' }} />
          <div style={{ display: 'grid', gap: 8, width: '100%' }}>
            {tempCounts.map((item) => (
              <span key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <b>
                  <i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 99, background: pieColors[item.name], marginRight: 6 }} />
                  {item.name}
                </b>
                <b>{item.count}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
