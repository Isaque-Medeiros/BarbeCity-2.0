import bcrypt from 'bcryptjs';

const CUSTO = 12;

export async function gerarHashSenha(senha) {
  return bcrypt.hash(String(senha), CUSTO);
}

export async function conferirSenha(senha, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(senha), hash);
}

export function precisaRehash(hash) {
  try {
    return bcrypt.getRounds(hash) < CUSTO;
  } catch {
    return true;
  }
}
