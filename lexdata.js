// ==========================================================
// LEXDATA.JS - Banco de dados central do LexControl
// Todos os modulos importam este arquivo
// ==========================================================

const LexData = (() => {

// -- KEYS -------------------------------------------------
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

// -- HELPERS ----------------------------------------------
const get  = key => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch(e){ return []; } };
const getObj = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch(e){ return {}; } };
const set  = (key, val) => { localStorage.setItem(key, JSON.stringify(val)); broadcast(key); };
const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const today = () => new Date().toISOString().slice(0,10);

// -- BROADCAST (sync between modules) --------------------
const broadcast = (key) => {
  try { window.dispatchEvent(new StorageEvent('storage', { key })); } catch(e){}
};

// -- TEMA -------------------------------------------------
const getTema = () => localStorage.getItem(K.tema) || 'light';
const setTema = (v) => { localStorage.setItem(K.tema, v); applyTema(v); broadcast(K.tema); };
const applyTema = (v) => {
  document.documentElement && document.documentElement.setAttribute('data-theme', v || getTema());
  if(window.parent && window.parent !== window){
    try { window.parent.postMessage({type:'lex-tema', tema: v||getTema()}, '*'); } catch(e){}
  }
};
const initTema = () => applyTema(getTema());

// -- USER -------------------------------------------------
const getUser = () => ({
  name: localStorage.getItem(K.username) || '',
  role: localStorage.getItem(K.userrole) || '',
});
const setUser = (name, role) => {
  localStorage.setItem(K.username, name || '');
  localStorage.setItem(K.userrole, role || '');
};

// -- PROCESSOS --------------------------------------------
const getProcessos = () => get(K.processos);
const saveProcesso = (proc) => {
  const list = get(K.processos);
  if(!proc.id) proc.id = uid();
  if(!proc.criadoEm) proc.criadoEm = today();
  const idx = list.findIndex(p => String(p.id) === String(proc.id));
  if(idx >= 0) list[idx] = proc;
  else list.unshift(proc);
  set(K.processos, list);
  if(proc.cliente) _ensureCliente(proc.cliente, '', '');
  return proc;
};
const deleteProcesso = (id) => {
  const list = get(K.processos).filter(p => String(p.id) !== String(id));
  set(K.processos, list);
};

// -- CLIENTES ---------------------------------------------
const getClientes = () => get(K.clientes);
const saveCliente = (cli) => {
  const list = get(K.clientes);
  if(!cli.id) cli.id = uid();
  if(!cli.criadoEm) cli.criadoEm = today();
  const idx = list.findIndex(c => String(c.id) === String(cli.id));
  if(idx >= 0) list[idx] = cli;
  else list.unshift(cli);
  set(K.clientes, list);
  return cli;
};
const deleteCliente = (id) => {
  const list = get(K.clientes).filter(c => String(c.id) !== String(id));
  set(K.clientes, list);
};
const _ensureCliente = (nome, email, tel) => {
  if(!nome) return;
  const list = get(K.clientes);
  if(!list.some(c => c.nome === nome)){
    list.push({ id: uid(), nome, email, tel, criadoEm: today() });
    set(K.clientes, list);
  }
};

// -- EVENTOS ----------------------------------------------
const getEventos = () => get(K.eventos);
const saveEvento = (ev) => {
  const list = get(K.eventos);
  if(!ev.id) ev.id = uid();
  if(!ev.criadoEm) ev.criadoEm = today();
  const idx = list.findIndex(e => String(e.id) === String(ev.id));
  if(idx >= 0) list[idx] = ev;
  else list.unshift(ev);
  set(K.eventos, list);
  return ev;
};
const deleteEvento = (id) => {
  const list = get(K.eventos).filter(e => String(e.id) !== String(id));
  set(K.eventos, list);
};

// -- HONORARIOS -------------------------------------------
const getHonorarios = () => get(K.honorarios);
const saveHonorario = (hon) => {
  const list = get(K.honorarios);
  if(!hon.id) hon.id = uid();
  if(!hon.criadoEm) hon.criadoEm = today();
  const idx = list.findIndex(h => String(h.id) === String(hon.id));
  if(idx >= 0) list[idx] = hon;
  else list.unshift(hon);
  set(K.honorarios, list);
  return hon;
};
const deleteHonorario = (id) => {
  const list = get(K.honorarios).filter(h => String(h.id) !== String(id));
  set(K.honorarios, list);
};
const marcarParcela = (contractId, parcelaId, pago) => {
  const list = get(K.honorarios);
  const h = list.find(h => String(h.id) === String(contractId));
  if(h && h.parcelas){
    const p = h.parcelas.find(x => String(x.id) === String(parcelaId));
    if(p) p.pago = pago;
    set(K.honorarios, list);
  }
};

// -- FINANCEIRO -------------------------------------------
const getFinanceiro = () => get(K.financeiro);
const saveLancamento = (lanc) => {
  const list = get(K.financeiro);
  if(!lanc.id) lanc.id = uid();
  if(!lanc.criadoEm) lanc.criadoEm = today();
  const idx = list.findIndex(l => String(l.id) === String(lanc.id));
  if(idx >= 0) list[idx] = lanc;
  else list.unshift(lanc);
  set(K.financeiro, list);
  return lanc;
};
const deleteLancamento = (id) => {
  const list = get(K.financeiro).filter(l => String(l.id) !== String(id));
  set(K.financeiro, list);
};

// -- SEED (dados de exemplo na primeira carga) -----------
const seed = () => {
  if(get(K.processos).length) return;
  const procs = [
    { id: uid(), num: '0012345-67', area: 'Civil', cliente: 'Maria das Gracas', vara: '1a Vara Civil', comarca: 'Goiania', parte: 'Autora', status: 'Ativo', data: today(), prazoRaw: '2026-05-15', valor: '50000', obs: 'Indenizacao por danos morais', movs: [{data: today(), desc: 'Peticao inicial protocolada'}], criadoEm: today() },
    { id: uid(), num: '0023456-78', area: 'Trabalhista', cliente: 'Joao Pereira', vara: '2a Vara do Trabalho', comarca: 'Goiania', parte: 'Reclamante', status: 'Pendente', data: today(), prazoRaw: '2026-05-20', valor: '120000', obs: 'Rescisao indireta', movs: [{data: today(), desc: 'Reclamacao trabalhista distribuida'}], criadoEm: today() },
    { id: uid(), num: '0034567-89', area: 'Empresarial', cliente: 'Empresa XYZ Ltda', vara: '3a Vara Civel', comarca: 'Goiania', parte: 'Reu', status: 'Ativo', data: today(), prazoRaw: '2026-06-01', valor: '250000', obs: 'Contrato comercial', movs: [{data: today(), desc: 'Contestacao apresentada'}], criadoEm: today() },
    { id: uid(), num: '0045678-90', area: 'Familia', cliente: 'Ana Rodrigues', vara: '1a Vara de Familia', comarca: 'Goiania', parte: 'Autora', status: 'Ativo', data: today(), prazoRaw: '2026-05-10', valor: '80000', obs: 'Divorcio litigioso', movs: [{data: today(), desc: 'Acao de divorcio protocolada'}], criadoEm: today() },
  ];
  procs.forEach(p => saveProcesso(p));
  const clis = [
    { id: uid(), nome: 'Maria das Gracas', email: 'maria@email.com', tel: '(62) 99999-1111', criadoEm: today() },
    { id: uid(), nome: 'Joao Pereira', email: 'joao@email.com', tel: '(62) 99999-2222', criadoEm: today() },
    { id: uid(), nome: 'Empresa XYZ Ltda', email: 'contato@xyz.com.br', tel: '(62) 3333-4444', criadoEm: today() },
    { id: uid(), nome: 'Ana Rodrigues', email: 'ana@email.com', tel: '(62) 99999-5555', criadoEm: today() },
  ];
  localStorage.setItem(K.clientes, JSON.stringify(clis));
  const evs = [
    { id: uid(), titulo: 'Audiencia - Maria das Gracas', data: today(), hora: '09:00', tipo: 'Audiencia', desc: 'Audiencia de conciliacao', criadoEm: today() },
    { id: uid(), titulo: 'Prazo - Contestacao XYZ', data: today(), hora: '14:00', tipo: 'Prazo', desc: 'Entrega de contestacao', criadoEm: today() },
    { id: uid(), titulo: 'Reuniao - Ana Rodrigues', data: today(), hora: '16:00', tipo: 'Reuniao', desc: 'Reuniao sobre divorcio', criadoEm: today() },
  ];
  localStorage.setItem(K.eventos, JSON.stringify(evs));
  const hons = [
    { id: uid(), cliente: 'Empresa XYZ Ltda', valor: '15000', parcelas: [{id: uid(), n: 1, valor: 5000, vencimento: '2026-04-28', pago: true}, {id: uid(), n: 2, valor: 5000, vencimento: '2026-05-28', pago: false}, {id: uid(), n: 3, valor: 5000, vencimento: '2026-06-28', pago: false}], criadoEm: today() },
    { id: uid(), cliente: 'Maria das Gracas', valor: '8000', parcelas: [{id: uid(), n: 1, valor: 8000, vencimento: '2026-04-30', pago: false}], criadoEm: today() },
  ];
  hons.forEach(h => saveHonorario(h));
  const fins = [
    { id: uid(), tipo: 'receita', categoria: 'Honorarios', descricao: 'Honorarios XYZ - 1a parcela', valor: 5000, data: today(), criadoEm: today() },
    { id: uid(), tipo: 'receita', categoria: 'Honorarios', descricao: 'Honorarios Maria - pagamento unico', valor: 8000, data: today(), criadoEm: today() },
    { id: uid(), tipo: 'despesa', categoria: 'Aluguel', descricao: 'Aluguel escritorio', valor: -2500, data: today(), criadoEm: today() },
    { id: uid(), tipo: 'despesa', categoria: 'Pro-labore', descricao: 'Pro-labore socio', valor: -3300, data: today(), criadoEm: today() },
  ];
  fins.forEach(l => saveLancamento(l));
};

// -- Auto-init --------------------------------------------
(function(){
  const t = localStorage.getItem('lex_tema') || 'light';
  document.documentElement && document.documentElement.setAttribute('data-theme', t);
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => { LexData.seed(); });
  } else {
    LexData.seed();
  }
})();

return {
  // keys
  K,
  // helpers
  get, getObj, set, uid, today,
  // broadcast
  broadcast,
  // tema
  getTema, setTema, applyTema, initTema,
  // user
  getUser, setUser,
  // processos
  getProcessos, saveProcesso, deleteProcesso,
  // clientes
  getClientes, saveCliente, deleteCliente,
  // eventos
  getEventos, saveEvento, deleteEvento,
  // honorarios
  getHonorarios, saveHonorario, deleteHonorario, marcarParcela,
  // financeiro
  getFinanceiro, saveLancamento, deleteLancamento,
  // seed
  seed,
};
})();
