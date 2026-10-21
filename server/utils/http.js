export class HttpError extends Error {
  constructor(status, mensagem, codigo = 'erro', detalhes = undefined) {
    super(mensagem);
    this.name = 'HttpError';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

export function asyncHandler(fn) {
  return function handler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function naoEncontrado(mensagem = 'Recurso não encontrado.') {
  return new HttpError(404, mensagem, 'nao_encontrado');
}

export function naoAutorizado(mensagem = 'Você precisa entrar para continuar.') {
  return new HttpError(401, mensagem, 'nao_autenticado');
}

export function proibido(mensagem = 'Você não tem permissão para esta ação.') {
  return new HttpError(403, mensagem, 'sem_permissao');
}

export function conflito(mensagem, codigo = 'conflito', detalhes) {
  return new HttpError(409, mensagem, codigo, detalhes);
}

export function invalido(mensagem, detalhes) {
  return new HttpError(400, mensagem, 'dados_invalidos', detalhes);
}
