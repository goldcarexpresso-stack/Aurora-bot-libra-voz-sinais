const CHAVE = 'aurora_prefs'
const PADRAO = { contraste: false, reduzirMovimento: false, dicas: true }

export function lerPrefs() {
  try {
    return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }
  } catch {
    return { ...PADRAO }
  }
}

export function aplicarPrefs(p) {
  const classes = document.documentElement.classList
  classes.toggle('contraste-alto', !!p.contraste)
  classes.toggle('reduzir-movimento', !!p.reduzirMovimento)
}

export function salvarPrefs(p) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p))
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
  aplicarPrefs(p)
}
