// ============================================================
// LEXDATA.JS — Banco de dados central do LexControl
// Todos os módulos importam este arquivo
// ============================================================

const LexData = (() => {

  // ── KEYS ──────────────────────────────────────────────────
  const K = {
    processos:  'lex_processos',
    clientes:   'lex_clientes',
    eventos:    'lex_eventos',
    honorarios: 'lex_honorarios',
    financeiro: 'lex_financeiro',
    tema:       'lex_tema',
    username:   'lex_username',
    userrole:   'lex_userrole',
  };

  // ── HELPERS ───────────────────────────────────────────────
  const get = key => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch(e){ return []; } };
  const getObj = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch(e){ return {}; } };
  const set = (key, val) => { localStorage.setItem(key, JSON.stringify(val)); broadcast(key); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const today = () => new Date().toISOString().slice(0,10);

  // ── BROADCAST (sync between modules) ─────────────────────
  const broadcast = (key) => {
    try { window.dispatchEvent(new StorageEvent('storage', { key })); } catch(e){}
  };

  // ── TEMA ──────────────────────────────────────────────────
  const getTema = () => localStorage.getItem(K.tema) || 'light';
  const setTema = (v) => { localStorage.setItem(K.tema, v); applyTema(v); broadcast(K.tema); };
  const applyTema = (v) => {
    document.documentElement.setAttribute('data-theme', v || getTema());
    // notify parent if in iframe
    if(window.parent && window.parent !== window){
      try { window.parent.postMessage({type:'lex-tema', tema: v||getTema()}, '*'); } catch(e){}
    }
  };
  const initTema = () => applyTema(getTema());

  // ── USER ──────────────────────────────────────────────────
  const getUser = () => ({
    name: localStorage.getItem(K.username) || 'Dr. Advogado',
    role: localStorage.getItem(K.userrole) || 'Sócio Titular',
  });
  const setUser = (name, role) => {
    localStorage.setItem(K.username, name);
    localStorage.setItem(K.userrole, role);
    broadcast(K.username);
  };

  // ── PROCESSOS ─────────────────────────────────────────────
  const getProcessos = () => get(K.processos);
  const saveProcesso = (proc) => {
    const list = get(K.processos);
    if(!proc.id) proc.id = uid();
    if(!proc.criadoEm) proc.criadoEm = today();
    const idx = list.findIndex(p => p.id === proc.id);
    if(idx >= 0) list[idx] = proc; else list.unshift(proc);
    set(K.processos, list);
    // auto-create cliente if not exists
    if(proc.clienteNome) _ensureCliente(proc.clienteNome, proc.clienteEmail||'', proc.clienteTel||'');
    return proc;
  };
  const deleteProcesso = (id) => set(K.processos, get(K.processos).filter(p=>p.id!==id));

  // ── CLIENTES ──────────────────────────────────────────────
  const getClientes = () => get(K.clientes);
  const saveCliente = (cli) => {
    const list = get(K.clientes);
    if(!cli.id) cli.id = uid();
    if(!cli.criadoEm) cli.criadoEm = today();
    const idx = list.findIndex(c => c.id === cli.id);
    if(idx >= 0) list[idx] = cli; else list.unshift(cli);
    set(K.clientes, list);
    return cli;
  };
  const deleteCliente = (id) => set(K.clientes, get(K.clientes).filter(c=>c.id!==id));
  const _ensureCliente = (nome, email, tel) => {
    const list = get(K.clientes);
    const exists = list.find(c => c.nome.toLowerCase() === nome.toLowerCase());
    if(!exists) saveCliente({ nome, email, tel, tipo: 'Pessoa Física', status: 'Ativo' });
  };

  // ── EVENTOS (AGENDA) ──────────────────────────────────────
  const getEventos = () => get(K.eventos);
  const saveEvento = (ev) => {
    const list = get(K.eventos);
    if(!ev.id) ev.id = uid();
    const idx = list.findIndex(e => e.id === ev.id);
    if(idx >= 0) list[idx] = ev; else list.unshift(ev);
    set(K.eventos, list);
    return ev;
  };
  const deleteEvento = (id) => set(K.eventos, get(K.eventos).filter(e=>e.id!==id));

  // ── HONORÁRIOS ────────────────────────────────────────────
  const getHonorarios = () => get(K.honorarios);
  const saveHonorario = (hon) => {
    const list = get(K.honorarios);
    if(!hon.id) hon.id = uid();
    if(!hon.criadoEm) hon.criadoEm = today();
    // generate parcelas if not present
    if(!hon.parcelas || !hon.parcelas.length) hon.parcelas = _gerarParcelas(hon);
    const idx = list.findIndex(h => h.id === hon.id);
    if(idx >= 0) list[idx] = hon; else list.unshift(hon);
    set(K.honorarios, list);
    return hon;
  };
  const deleteHonorario = (id) => set(K.honorarios, get(K.honorarios).filter(h=>h.id!==id));
  const _gerarParcelas = (hon) => {
    const total = parseFloat(hon.valor)||0;
    const n = parseInt(hon.parcelas_num)||1;
    const valorParcela = total/n;
    const inicio = hon.dataInicio || today();
    return Array.from({length:n},(_,i)=>{
      const d = new Date(inicio);
      d.setMonth(d.getMonth()+i);
      return { id:uid(), num:i+1, valor:valorParcela, vencimento:d.toISOString().slice(0,10), status:'Pendente' };
    });
  };
  const marcarParcela = (honId, parcelaId, status) => {
    const list = get(K.honorarios);
    const hon = list.find(h=>h.id===honId);
    if(hon){ const p=hon.parcelas.find(p=>p.id===parcelaId); if(p) p.status=status; }
    set(K.honorarios, list);
  };

  // ── FINANCEIRO ────────────────────────────────────────────
  const getLancamentos = () => get(K.financeiro);
  const saveLancamento = (lan) => {
    const list = get(K.financeiro);
    if(!lan.id) lan.id = uid();
    if(!lan.data) lan.data = today();
    const idx = list.findIndex(l=>l.id===lan.id);
    if(idx>=0) list[idx]=lan; else list.unshift(lan);
    set(K.financeiro, list);
    return lan;
  };
  const deleteLancamento = (id) => set(K.financeiro, get(K.financeiro).filter(l=>l.id!==id));

  // ── SEED (dados de exemplo na primeira carga) ─────────────
  const seed = () => {
    if(get(K.processos).length) return; // already seeded

    const procs = [
      {id:uid(),numero:'0012345-67.2024.8.09.0051',clienteNome:'Maria das Graças Oliveira',clienteTel:'(62) 99999-1111',area:'Consumidor',status:'Ativo',vara:'3ª Vara Cível',cidade:'Goiânia',proximoPrazo:'2026-04-25',descricao:'Ação indenizatória por dano moral',criadoEm:'2024-03-10'},
      {id:uid(),numero:'0009821-33.2023.8.09.0051',clienteNome:'João Pereira da Silva',clienteTel:'(62) 98888-2222',area:'Trabalhista',status:'Pendente',vara:'2ª VT Goiânia',cidade:'Goiânia',proximoPrazo:'2026-04-28',descricao:'Reclamação trabalhista — verbas rescisórias',criadoEm:'2023-08-15'},
      {id:uid(),numero:'0031122-44.2025.8.09.0051',clienteNome:'Empresa XYZ Ltda',clienteTel:'(62) 3333-4444',area:'Cível',status:'Ativo',vara:'1ª Vara Cível',cidade:'Goiânia',proximoPrazo:'2026-05-02',descricao:'Cobrança contratual',criadoEm:'2025-01-20'},
      {id:uid(),numero:'0044567-12.2022.8.09.0051',clienteNome:'Ana Rodrigues Faria',clienteTel:'(62) 97777-3333',area:'Família',status:'Ativo',vara:'1ª Vara de Família',cidade:'Goiânia',proximoPrazo:'2026-05-05',descricao:'Divórcio litigioso',criadoEm:'2022-11-05'},
    ];
    procs.forEach(p=>saveProcesso(p));

    const clis = [
      {id:uid(),nome:'Maria das Graças Oliveira',email:'maria@email.com',tel:'(62) 99999-1111',tipo:'Pessoa Física',status:'Ativo',criadoEm:'2024-03-10'},
      {id:uid(),nome:'João Pereira da Silva',email:'joao@email.com',tel:'(62) 98888-2222',tipo:'Pessoa Física',status:'Ativo',criadoEm:'2023-08-15'},
      {id:uid(),nome:'Empresa XYZ Ltda',email:'contato@xyz.com.br',tel:'(62) 3333-4444',tipo:'Pessoa Jurídica',status:'Ativo',criadoEm:'2025-01-20'},
      {id:uid(),nome:'Ana Rodrigues Faria',email:'ana@email.com',tel:'(62) 97777-3333',tipo:'Pessoa Física',status:'Ativo',criadoEm:'2022-11-05'},
    ];
    // save without triggering _ensureCliente again
    localStorage.setItem(K.clientes, JSON.stringify(clis));

    const evs = [
      {id:uid(),titulo:'Audiência — Maria Graças',tipo:'Audiência',data:'2026-04-25',hora:'14:00',local:'3ª Vara Cível',processo:'0012345-67.2024.8.09.0051',status:'Confirmado'},
      {id:uid(),titulo:'Prazo — Contestação XYZ',tipo:'Prazo',data:'2026-05-02',hora:'23:59',local:'',processo:'0031122-44.2025.8.09.0051',status:'Pendente'},
      {id:uid(),titulo:'Reunião Ana Rodrigues',tipo:'Reunião',data:today(),hora:'10:00',local:'Escritório',processo:'',status:'Confirmado'},
    ];
    localStorage.setItem(K.eventos, JSON.stringify(evs));

    const hons = [
      {id:uid(),cliente:'Empresa XYZ Ltda',tipo:'Fixo',valor:15000,parcelas_num:3,dataInicio:'2026-01-01',descricao:'Cobrança contratual',status:'Ativo'},
      {id:uid(),cliente:'Maria das Graças Oliveira',tipo:'Êxito',valor:8000,parcelas_num:1,dataInicio:'2026-04-01',descricao:'Indenização',status:'Ativo'},
    ];
    hons.forEach(h=>saveHonorario(h));

    const fins = [
      {id:uid(),tipo:'Receita',categoria:'Honorários',descricao:'Pagamento parcela 1 — XYZ',valor:5000,data:'2026-01-15'},
      {id:uid(),tipo:'Despesa',categoria:'Escritório',descricao:'Aluguel escritório',valor:3500,data:'2026-01-05'},
      {id:uid(),tipo:'Receita',categoria:'Honorários',descricao:'Pagamento parcela 2 — XYZ',valor:5000,data:'2026-02-15'},
      {id:uid(),tipo:'Despesa',categoria:'Pessoal',descricao:'Pró-labore',valor:8000,data:'2026-02-01'},
    ];
    fins.forEach(l=>saveLancamento(l));
  };

  // ── PUBLIC API ────────────────────────────────────────────
  return {
    // tema
    getTema, setTema, initTema,
    // user
    getUser, setUser,
    // processos
    getProcessos, saveProcesso, deleteProcesso,
    // clientes
    getClientes, saveCliente, deleteCliente,
    // eventos
    getEventos, saveEvento, deleteEvento,
    // honorários
    getHonorarios, saveHonorario, deleteHonorario, marcarParcela,
    // financeiro
    getLancamentos, saveLancamento, deleteLancamento,
    // seed
    seed, today, uid,
  };
})();

// Auto-init tema ao carregar
document.addEventListener('DOMContentLoaded', () => {
  LexData.initTema();
  LexData.seed();
});
