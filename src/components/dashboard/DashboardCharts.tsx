import type { Lead, LeadTemperature } from '@/types/crm';

type DashboardChartsProps = { leads: Lead[]; };
const tempColors: Record<LeadTemperature, string> = { Quente: '#f07f5a', Morno: '#c7a64b', Frio: '#56aac0' };

export function DashboardCharts({ leads }: DashboardChartsProps) {
  const sourceMap = leads.reduce<Record<string, number>>((acc, lead) => {
    const key = lead.source || 'Não informado';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const sources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxSource = Math.max(...sources.map(([, count]) => count), 1);

  const temps = (['Quente', 'Morno', 'Frio'] as LeadTemperature[]).map((name) => ({
    name,
    count: leads.filter((lead) => lead.temperature === name).length
  }));
  const total = Math.max(leads.length, 1);

  return (
    <div className="grid two-col compact-charts">
      <section className="card pad">
        <div className="section-title"><div><h2>Origem dos contatos</h2><span>dados reais da base</span></div></div>
        <div className="report-bars">
          {sources.length ? sources.map(([source, count]) => <div className="bar" key={source}><span><b>{source}</b><small>{count}</small></span><i style={{ width: `${Math.max(8, (count / maxSource) * 100)}%` }} /></div>) : <div className="empty">Nenhum contato cadastrado ainda.</div>}
        </div>
      </section>
      <section className="card pad">
        <div className="section-title"><div><h2>Qualificação da base</h2><span>temperatura atual</span></div></div>
        <div className="qualification-grid">
          {temps.map((item) => {
            const pct = Math.round((item.count / total) * 100);
            return <div className="qualification-item" key={item.name}><span className="dot" style={{ background: tempColors[item.name] }} /><div><strong>{item.count}</strong><small>{item.name} · {pct}%</small></div></div>;
          })}
        </div>
        <p className="notice">Sem curvas inventadas: os indicadores desta tela são derivados exclusivamente do que está registrado na operação.</p>
      </section>
    </div>
  );
}
