/**
 * Rotação de chaves de API (porta enxuta do `MultiGeminiService` em C#).
 *
 * - round-robin entre as chaves válidas;
 * - chave que recebe 429 entra em cooldown (padrão 5 min);
 * - chave com 401/403 é marcada como inválida no processo;
 * - quando todas estão em cooldown, devolve `null` para o chamador responder
 *   com uma mensagem amigável em vez de insistir e piorar o rate limit.
 *
 * A classe é pura (recebe `agora`) para ser testável sem rede/relógio real.
 */
export class RotacaoChaves {
  constructor({ chaves = [], cooldownMs = 5 * 60 * 1000, agora = () => Date.now() } = {}) {
    this.chaves = [...new Set(chaves.map((chave) => String(chave ?? '').trim()).filter(Boolean))];
    this.cooldownMs = Math.max(0, Number(cooldownMs) || 0);
    this.agora = typeof agora === 'function' ? agora : () => Date.now();
    this.indice = 0;
    this.cooldowns = new Map();
    this.invalidas = new Set();
  }

  get total() {
    return this.chaves.length;
  }

  limparCooldowns() {
    for (const [chave, marcadoEm] of this.cooldowns) {
      if (this.agora() - marcadoEm >= this.cooldownMs) this.cooldowns.delete(chave);
    }
  }

  disponiveis() {
    this.limparCooldowns();
    return this.chaves.filter((chave) => !this.cooldowns.has(chave) && !this.invalidas.has(chave));
  }

  emCooldown(chave) {
    this.limparCooldowns();
    return this.cooldowns.has(chave);
  }

  proxima() {
    const total = this.chaves.length;
    if (total === 0) return null;
    this.limparCooldowns();
    for (let tentativa = 0; tentativa < total; tentativa += 1) {
      const indice = this.indice % total;
      this.indice = (indice + 1) % total;
      const chave = this.chaves[indice];
      if (!this.cooldowns.has(chave) && !this.invalidas.has(chave)) return chave;
    }
    return null;
  }

  marcarCooldown(chave) {
    if (this.chaves.includes(chave)) this.cooldowns.set(chave, this.agora());
  }

  invalidar(chave) {
    if (!this.chaves.includes(chave)) return;
    this.invalidas.add(chave);
    this.cooldowns.delete(chave);
  }

  indiceDe(chave) {
    const indice = this.chaves.indexOf(chave);
    return indice >= 0 ? indice + 1 : 0;
  }
}
