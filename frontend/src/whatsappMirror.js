// Cópia local de formatarNumero/formatarMensagem para testar sem importar do backend.
// Mantém sincronizada com backend/src/services/whatsapp.js.
export function formatarNumero(whatsapp) {
  const limpo = String(whatsapp || '').replace(/\D/g, '');
  return limpo.startsWith('55') ? limpo : `55${limpo}`;
}

export function formatarMensagem(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars) ? String(vars[k]) : m);
}
