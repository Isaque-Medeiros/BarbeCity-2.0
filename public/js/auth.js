import { api } from './api.js';
import { definirUsuario } from './core.js';
import { definirCarregando, lerQuery, toast } from './ui.js';

const ERROS = {
  google_indisponivel: 'O login com Google ainda não está configurado. Use e-mail e senha ou o código por e-mail.',
  google_cancelado: 'O login com Google foi cancelado.',
  google_estado: 'A sessão do Google expirou. Tente novamente.',
  google_email: 'Não foi possível obter um e-mail válido do Google.',
  google_falhou: 'Não foi possível concluir o login com Google. Tente novamente.',
  conta_inativa: 'Esta conta está desativada. Fale com a barbearia.',
};

function proximoDestino() {
  const next = lerQuery('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/usuario.html';
}

function marcarErro(form, mensagem) {
  toast(mensagem, 'erro', 6000);
  form?.querySelectorAll('input').forEach((input) => input.setAttribute('aria-invalid', 'false'));
}

function concluir(dados) {
  if (dados?.usuario) definirUsuario(dados.usuario);
  toast(`Bem-vindo${dados?.usuario?.nome ? `, ${dados.usuario.nome.split(' ')[0]}` : ''}!`, 'sucesso');
  setTimeout(() => {
    window.location.href = proximoDestino();
  }, 500);
}

function ligarLogin() {
  const form = document.getElementById('form-login');
  if (form) {
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      if (!form.reportValidity()) return;
      const botao = form.querySelector('button[type="submit"]');
      definirCarregando(botao, true, 'Entrando...');
      try {
        const dados = await api.post('/auth/login', {
          email: form.email.value,
          senha: form.senha.value,
        });
        concluir(dados);
      } catch (erro) {
        definirCarregando(botao, false);
        if (erro.codigo === 'sem_senha') {
          toast('Esta conta usa Google ou código por e-mail. Use uma dessas opções.', 'aviso', 6000);
          document.getElementById('painel-codigo')?.removeAttribute('hidden');
        } else {
          marcarErro(form, erro.message);
        }
      }
    });
  }

  const formSolicitar = document.getElementById('form-solicitar-codigo');
  if (formSolicitar) {
    formSolicitar.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      if (!formSolicitar.reportValidity()) return;
      const botao = formSolicitar.querySelector('button[type="submit"]');
      definirCarregando(botao, true, 'Enviando...');
      try {
        const dados = await api.post('/auth/solicitar-token', { email: formSolicitar.email.value });
        const formCodigo = document.getElementById('form-codigo');
        const emailCodigo = document.getElementById('codigo-email');
        if (emailCodigo) emailCodigo.value = formSolicitar.email.value;
        formCodigo?.removeAttribute('hidden');
        toast(dados.mensagem || 'Código enviado.', 'sucesso', 6000);
        if (dados.codigoDev) {
          toast(`Ambiente de teste — código: ${dados.codigoDev}`, 'info', 12000);
          const campo = document.getElementById('codigo');
          if (campo) campo.value = dados.codigoDev;
        }
      } catch (erro) {
        toast(erro.message, 'erro', 6000);
      } finally {
        definirCarregando(botao, false);
      }
    });
  }

  const formCodigo = document.getElementById('form-codigo');
  if (formCodigo) {
    formCodigo.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      if (!formCodigo.reportValidity()) return;
      const botao = formCodigo.querySelector('button[type="submit"]');
      definirCarregando(botao, true, 'Validando...');
      try {
        const dados = await api.post('/auth/validar-token', {
          email: document.getElementById('codigo-email')?.value || formCodigo.email.value,
          codigo: formCodigo.codigo.value,
        });
        concluir(dados);
      } catch (erro) {
        definirCarregando(botao, false);
        marcarErro(formCodigo, erro.message);
      }
    });
  }
}


function ligarCadastro() {
  const form = document.getElementById('form-cadastro');
  if (!form) return;
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!form.reportValidity()) return;
    if (form.senha.value !== form.confirmarSenha.value) {
      marcarErro(form, 'As senhas não conferem.');
      form.confirmarSenha.focus();
      return;
    }
    const botao = form.querySelector('button[type="submit"]');
    definirCarregando(botao, true, 'Criando conta...');
    try {
      const dados = await api.post('/auth/cadastro', {
        nome: form.nome.value,
        email: form.email.value,
        telefone: form.telefone.value || undefined,
        senha: form.senha.value,
        aceitePrivacidade: form.aceitePrivacidade.checked,
      });
      concluir(dados);
    } catch (erro) {
      definirCarregando(botao, false);
      if (erro.codigo === 'email_em_uso' || erro.codigo === 'email_google') {
        toast(erro.message, 'aviso', 7000);
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1800);
      } else {
        marcarErro(form, erro.message);
      }
    }
  });
}

function ligarRecuperacao() {
  const painel = document.getElementById('painel-esqueci');
  const link = document.getElementById('abrir-esqueci');
  link?.addEventListener('click', (evento) => {
    evento.preventDefault();
    painel?.removeAttribute('hidden');
    painel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  const formEsqueci = document.getElementById('form-esqueci');
  formEsqueci?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!formEsqueci.reportValidity()) return;
    const botao = formEsqueci.querySelector('button[type="submit"]');
    definirCarregando(botao, true, 'Enviando...');
    try {
      const dados = await api.post('/auth/esqueci-senha', { email: formEsqueci.email.value });
      const formRedefinir = document.getElementById('form-redefinir');
      if (formRedefinir) {
        formRedefinir.removeAttribute('hidden');
        const campoEmail = document.getElementById('redefinir-email');
        if (campoEmail) campoEmail.value = formEsqueci.email.value;
      }
      toast(dados.mensagem || 'Instruções enviadas.', 'sucesso', 6000);
    } catch (erro) {
      toast(erro.message, 'erro', 6000);
    } finally {
      definirCarregando(botao, false);
    }
  });

  const formRedefinir = document.getElementById('form-redefinir');
  formRedefinir?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!formRedefinir.reportValidity()) return;
    const botao = formRedefinir.querySelector('button[type="submit"]');
    definirCarregando(botao, true, 'Salvando...');
    try {
      const dados = await api.post('/auth/redefinir-senha', {
        email: document.getElementById('redefinir-email')?.value || formRedefinir.email.value,
        codigo: formRedefinir.codigo.value,
        novaSenha: formRedefinir.novaSenha.value,
      });
      concluir(dados);
    } catch (erro) {
      definirCarregando(botao, false);
      toast(erro.message, 'erro', 6000);
    }
  });
}

function ligarSenhas() {
  document.querySelectorAll('[data-senha-toggle]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const campo = document.getElementById(botao.dataset.senhaToggle);
      if (!campo) return;
      const visivel = campo.type === 'text';
      campo.type = visivel ? 'password' : 'text';
      botao.setAttribute('aria-pressed', String(!visivel));
      botao.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
      const uso = botao.querySelector('use');
      if (uso) uso.setAttribute('href', visivel ? '#i-eye' : '#i-eye-off');
    });
  });
}

function iniciar() {
  const erro = lerQuery('erro');
  if (erro && ERROS[erro]) toast(ERROS[erro], 'aviso', 7000);

  const email = lerQuery('email');
  if (email) {
    const loginEmail = document.querySelector('#form-login input[name="email"]');
    if (loginEmail) loginEmail.value = email;
    const solicitarEmail = document.querySelector('#form-solicitar-codigo input[name="email"]');
    if (solicitarEmail) solicitarEmail.value = email;
    const codigoEmail = document.getElementById('codigo-email');
    if (codigoEmail) codigoEmail.value = email;
    document.getElementById('painel-codigo')?.removeAttribute('hidden');
    document.getElementById('form-codigo')?.removeAttribute('hidden');
  }

  if (lerQuery('redefinir') === '1') {
    document.getElementById('painel-esqueci')?.removeAttribute('hidden');
    document.getElementById('form-redefinir')?.removeAttribute('hidden');
    const campoEmail = document.getElementById('redefinir-email');
    if (campoEmail && email) campoEmail.value = email;
  }

  ligarLogin();
  ligarCadastro();
  ligarRecuperacao();
  ligarSenhas();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
