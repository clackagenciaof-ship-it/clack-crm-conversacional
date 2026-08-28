"use client";

import { useEffect, useMemo, useState } from "react";
import { createPublicContact, createPublicNotice, createPublicTerritory, loadPublicEngagement, type PublicContact, type PublicNotice, type PublicTerritory } from "@/lib/public/public-engagement";

const emptyTerritory = { state: "PI", city: "", territory_name: "", population_total: "", source_name: "" };
const emptyContact = { name: "", phone: "", email: "", city: "", state: "PI", neighborhood: "", consent_status: false, consent_channel: "WhatsApp" };
const emptyNotice = { title: "", body: "", purpose: "informacao_publica" as const, city: "", state: "PI" };

export function PublicEngagementPage() {
  const [territories, setTerritories] = useState<PublicTerritory[]>([]);
  const [contacts, setContacts] = useState<PublicContact[]>([]);
  const [notices, setNotices] = useState<PublicNotice[]>([]);
  const [territoryForm, setTerritoryForm] = useState(emptyTerritory);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [noticeForm, setNoticeForm] = useState(emptyNotice);
  const [notice, setNotice] = useState("Carregando dados...");
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      const data = await loadPublicEngagement();
      setTerritories(data.territories);
      setContacts(data.contacts);
      setNotices(data.notices);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível carregar a área.");
    }
  }

  useEffect(() => { reload(); }, []);

  const totalPopulation = useMemo(() => territories.reduce((sum, item) => sum + Number(item.population_total || 0), 0), [territories]);
  const optedIn = contacts.filter((contact) => contact.consent_status).length;

  async function saveTerritory() {
    if (!territoryForm.city.trim()) return alert("Informe a cidade.");
    setBusy(true);
    try {
      await createPublicTerritory({
        ...territoryForm,
        population_total: territoryForm.population_total ? Number(territoryForm.population_total) : undefined
      });
      setTerritoryForm(emptyTerritory);
      await reload();
    } finally { setBusy(false); }
  }

  async function saveContact() {
    if (!contactForm.name.trim() || !contactForm.city.trim()) return alert("Nome e cidade são obrigatórios.");
    setBusy(true);
    try {
      await createPublicContact(contactForm);
      setContactForm(emptyContact);
      await reload();
    } finally { setBusy(false); }
  }

  async function saveNotice() {
    if (!noticeForm.title.trim() || !noticeForm.body.trim()) return alert("Título e mensagem são obrigatórios.");
    setBusy(true);
    try {
      await createPublicNotice(noticeForm);
      setNoticeForm(emptyNotice);
      await reload();
    } finally { setBusy(false); }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card pad">
        <div className="section-title">
          <div><h2>CLACK Público 360 · Relacionamento e atendimento</h2><span>Mapear → Ouvir → Priorizar → Resolver → Informar → Medir</span></div>
        </div>
        <p className="notice">Área para relacionamento público, demandas, eventos, consentimento e estatísticas territoriais agregadas. Não registra preferências políticas individuais nem realiza segmentação persuasiva.</p>
      </div>

      <section className="grid metrics">
        <div className="card metric"><span>Territórios</span><strong>{territories.length}</strong><small>municípios/áreas</small></div>
        <div className="card metric"><span>População agregada</span><strong>{totalPopulation.toLocaleString("pt-BR")}</strong><small>dados públicos informados</small></div>
        <div className="card metric"><span>Contatos públicos</span><strong>{contacts.length}</strong><small>relacionamento registrado</small></div>
        <div className="card metric"><span>Consentimento ativo</span><strong>{optedIn}</strong><small>comunicação permitida</small></div>
        <div className="card metric"><span>Avisos</span><strong>{notices.length}</strong><small>rascunhos informativos</small></div>
        <div className="card metric"><span>Método</span><strong>360°</strong><small>território + atendimento</small></div>
      </section>

      {notice && <div className="card pad"><p className="notice">{notice}</p></div>}

      <section className="grid two-col">
        <div className="card pad">
          <div className="section-title"><div><h2>Território agregado</h2><span>Organização por estado, cidade e fonte pública</span></div></div>
          <div className="form-grid">
            <label>UF<input className="input" value={territoryForm.state} onChange={e => setTerritoryForm({ ...territoryForm, state: e.target.value })} /></label>
            <label>Cidade<input className="input" value={territoryForm.city} onChange={e => setTerritoryForm({ ...territoryForm, city: e.target.value })} /></label>
            <label>Território / região<input className="input" value={territoryForm.territory_name} onChange={e => setTerritoryForm({ ...territoryForm, territory_name: e.target.value })} /></label>
            <label>População total (agregada)<input className="input" inputMode="numeric" value={territoryForm.population_total} onChange={e => setTerritoryForm({ ...territoryForm, population_total: e.target.value })} /></label>
            <label className="full">Fonte pública<input className="input" placeholder="Ex.: IBGE / dado oficial" value={territoryForm.source_name} onChange={e => setTerritoryForm({ ...territoryForm, source_name: e.target.value })} /></label>
          </div>
          <button className="btn primary" style={{ marginTop: 12 }} disabled={busy} onClick={saveTerritory}>Salvar território</button>
        </div>

        <div className="card pad">
          <div className="section-title"><div><h2>Relacionamento público</h2><span>Cadastro para atendimento e retorno</span></div></div>
          <div className="form-grid">
            <label>Nome<input className="input" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} /></label>
            <label>WhatsApp<input className="input" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} /></label>
            <label>E-mail<input className="input" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} /></label>
            <label>Bairro<input className="input" value={contactForm.neighborhood} onChange={e => setContactForm({ ...contactForm, neighborhood: e.target.value })} /></label>
            <label>Cidade<input className="input" value={contactForm.city} onChange={e => setContactForm({ ...contactForm, city: e.target.value })} /></label>
            <label>UF<input className="input" value={contactForm.state} onChange={e => setContactForm({ ...contactForm, state: e.target.value })} /></label>
            <label className="full" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={contactForm.consent_status} onChange={e => setContactForm({ ...contactForm, consent_status: e.target.checked })} />
              Contato autorizou comunicações informativas
            </label>
          </div>
          <button className="btn primary" style={{ marginTop: 12 }} disabled={busy} onClick={saveContact}>Salvar contato</button>
        </div>
      </section>

      <section className="card pad">
        <div className="section-title"><div><h2>Comunicação informativa com consentimento</h2><span>Serviço, evento ou informação pública</span></div></div>
        <div className="form-grid">
          <label>Título<input className="input" value={noticeForm.title} onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })} /></label>
          <label>Finalidade<select className="select" value={noticeForm.purpose} onChange={e => setNoticeForm({ ...noticeForm, purpose: e.target.value as typeof noticeForm.purpose })}>
            <option value="informacao_publica">Informação pública</option><option value="evento">Evento</option><option value="servico">Serviço / atendimento</option>
          </select></label>
          <label>Cidade (opcional)<input className="input" value={noticeForm.city} onChange={e => setNoticeForm({ ...noticeForm, city: e.target.value })} /></label>
          <label>UF<input className="input" value={noticeForm.state} onChange={e => setNoticeForm({ ...noticeForm, state: e.target.value })} /></label>
          <label className="full">Mensagem<textarea className="textarea" value={noticeForm.body} onChange={e => setNoticeForm({ ...noticeForm, body: e.target.value })} /></label>
        </div>
        <button className="btn primary" style={{ marginTop: 12 }} disabled={busy} onClick={saveNotice}>Criar rascunho informativo</button>
      </section>

      <section className="grid two-col">
        <div className="card pad">
          <div className="section-title"><div><h2>Ranking territorial</h2><span>Estatísticas agregadas para capacidade de atendimento</span></div></div>
          <div className="table-wrap"><table><thead><tr><th>Cidade</th><th>UF</th><th>População</th><th>Fonte</th></tr></thead><tbody>
            {territories.map(item => <tr key={item.id}><td>{item.city}</td><td>{item.state}</td><td>{Number(item.population_total || 0).toLocaleString("pt-BR")}</td><td>{item.source_name || "—"}</td></tr>)}
          </tbody></table></div>
        </div>
        <div className="card pad">
          <div className="section-title"><div><h2>Avisos recentes</h2><span>Comunicações informativas</span></div></div>
          <div className="timeline">
            {notices.slice(0, 8).map(item => <div className="timeline-item" key={item.id}><strong>{item.title}</strong><p>{item.body}</p><span className="badge status">{item.purpose.replaceAll("_", " ")}</span></div>)}
          </div>
        </div>
      </section>
    </div>
  );
}
