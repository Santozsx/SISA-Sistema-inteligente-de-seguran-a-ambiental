// Comunicação com o back end (backend/). Em desenvolvimento, "/api" passa pelo proxy do Vite.
// Para apontar para outro servidor, defina VITE_API_URL (ex.: https://sisa.exemplo.org/api/v1).

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";
const CHAVE_TOKEN = "sisa.token";

// ------------------------------------------------------------------ tipos

export type StatusInstituto = "ativo" | "em-rota" | "inativo";
export type StatusChamado = "aberto" | "em-analise" | "resolvido";

export interface InstitutoResumo {
  id: number;
  nome: string;
  iniciais: string;
}

export interface Instituto extends InstitutoResumo {
  email: string;
  tipo: string;
  status: StatusInstituto;
  status_label: string;
  verificado: boolean;
  latitude: number | null;
  longitude: number | null;
  distancia_km: number | null;
}

export interface Notificacoes {
  chamados: boolean;
  mensagens: boolean;
  email: boolean;
}

export interface Perfil extends Instituto {
  notificacoes: Notificacoes;
  criado_em: string;
}

export interface Anexo {
  id: number;
  nome_arquivo: string;
  tipo_mime: string;
  tamanho_bytes: number;
  hash_sha256: string;
  url: string;
  criado_em: string;
}

export interface Chamado {
  id: number;
  categoria: string;
  categoria_label: string;
  status: StatusChamado;
  status_label: string;
  instituto: InstitutoResumo;
  descricao: string;
  local: string | null;
  latitude: number | null;
  longitude: number | null;
  valor_numerico: number | null;
  unidade: string | null;
  anexos: Anexo[];
  criado_em: string;
  atualizado_em: string;
}

export interface NovoChamado {
  categoria: string;
  descricao: string;
  local?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  valor_numerico?: number | null;
  unidade?: string | null;
}

export interface Opcao {
  valor: string;
  label: string;
}

export interface Noticia {
  id: number;
  tag: "urgente" | "em-analise" | "resolvido";
  titulo: string;
  resumo: string;
  fonte: string;
  imagens: Anexo[];
  criado_em: string;
}

export interface Mensagem {
  id: number;
  remetente_id: number;
  destinatario_id: number;
  enviada_por_mim: boolean;
  texto: string;
  lida: boolean;
  criado_em: string;
  cifrado_base64: string | null;
}

export interface Conversa {
  instituto: InstitutoResumo;
  ultima_mensagem: string | null;
  ultima_em: string | null;
  nao_lidas: number;
}

export interface AtualizarPerfil {
  nome?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  notificacoes?: Partial<Notificacoes>;
  senha_atual?: string;
  nova_senha?: string;
}

// ------------------------------------------------------------------ token

export function obterToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

function salvarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // navegador sem armazenamento: a sessão dura só enquanto a página estiver aberta
  }
}

export function estaLogado(): boolean {
  return obterToken() !== null;
}

// ------------------------------------------------------------- requisições

export class ErroApi extends Error {
  status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

// Converte o "detail" do FastAPI (texto ou lista de erros de validação) em uma frase.
function mensagemDeErro(corpo: unknown, status: number): string {
  const detalhe = (corpo as { detail?: unknown } | null)?.detail;
  if (typeof detalhe === "string") return detalhe;
  if (Array.isArray(detalhe) && detalhe.length > 0) {
    const primeiro = detalhe[0] as { loc?: unknown[]; msg?: string };
    const campo = primeiro.loc?.[primeiro.loc.length - 1];
    return campo ? `Campo "${String(campo)}": ${primeiro.msg}` : (primeiro.msg ?? "Dados inválidos.");
  }
  return `Erro ${status} ao falar com o servidor.`;
}

async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const cabecalhos = new Headers(opcoes.headers);
  const token = obterToken();
  if (token) cabecalhos.set("Authorization", `Bearer ${token}`);
  if (opcoes.body && !(opcoes.body instanceof FormData)) cabecalhos.set("Content-Type", "application/json");

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}${caminho}`, { ...opcoes, headers: cabecalhos });
  } catch {
    throw new ErroApi(0, "Não foi possível conectar ao servidor. O back end está rodando?");
  }

  if (resposta.status === 401 && token) {
    // Sessão expirou: limpa o token e volta para o login.
    salvarToken(null);
    window.location.assign("/login");
  }

  if (resposta.status === 204) return undefined as T;
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new ErroApi(resposta.status, mensagemDeErro(corpo, resposta.status));
  return corpo as T;
}

const json = (dados: unknown) => JSON.stringify(dados);

// ------------------------------------------------------------- endpoints

export async function login(email: string, senha: string): Promise<Perfil> {
  const resposta = await requisitar<{ access_token: string; instituto: Perfil }>("/auth/login", {
    method: "POST",
    body: json({ email, senha }),
  });
  salvarToken(resposta.access_token);
  return resposta.instituto;
}

export function logout() {
  salvarToken(null);
}

export const cadastrar = (dados: { nome: string; email: string; tipo: string; senha: string }) =>
  requisitar<Perfil>("/auth/cadastro", { method: "POST", body: json(dados) });

export const meuPerfil = () => requisitar<Perfil>("/institutos/eu");

export const atualizarPerfil = (dados: AtualizarPerfil) =>
  requisitar<Perfil>("/institutos/eu", { method: "PATCH", body: json(dados) });

export const listarInstitutos = () => requisitar<Instituto[]>("/institutos");

export const obterInstituto = (id: number) => requisitar<Instituto>(`/institutos/${id}`);

export const listarCategorias = () => requisitar<Opcao[]>("/chamados/categorias");

export function listarChamados(status?: StatusChamado) {
  const consulta = status ? `?status=${status}` : "";
  return requisitar<Chamado[]>(`/chamados${consulta}`);
}

export const criarChamado = (dados: NovoChamado) =>
  requisitar<Chamado>("/chamados", { method: "POST", body: json(dados) });

export function enviarAnexo(chamadoId: number, arquivo: File) {
  const formulario = new FormData();
  formulario.append("arquivo", arquivo);
  return requisitar<Anexo>(`/chamados/${chamadoId}/anexos`, { method: "POST", body: formulario });
}

export const listarMural = () => requisitar<Noticia[]>("/mural");

// A url do anexo exige o token no cabeçalho, então <img src> não serve direto:
// baixamos a imagem (já decifrada pelo servidor) e criamos uma URL temporária (blob:).
// Quem chamar deve liberar a URL com URL.revokeObjectURL quando não precisar mais dela.
export async function urlImagemAnexo(anexo: Anexo): Promise<string> {
  const cabecalhos = new Headers();
  const token = obterToken();
  if (token) cabecalhos.set("Authorization", `Bearer ${token}`);
  const caminho = anexo.url.startsWith("/api/v1") ? anexo.url.slice("/api/v1".length) : anexo.url;
  const resposta = await fetch(`${BASE_URL}${caminho}`, { headers: cabecalhos });
  if (!resposta.ok) throw new ErroApi(resposta.status, "Não foi possível carregar a imagem.");
  return URL.createObjectURL(await resposta.blob());
}

export const listarConversas = () => requisitar<Conversa[]>("/mensagens/conversas");

export const listarMensagens = (institutoId: number, mostrarCifrado = false) =>
  requisitar<Mensagem[]>(`/mensagens/${institutoId}?mostrar_cifrado=${mostrarCifrado}`);

export const enviarMensagem = (institutoId: number, texto: string) =>
  requisitar<Mensagem>(`/mensagens/${institutoId}`, { method: "POST", body: json({ texto }) });

// ------------------------------------------------------------------- cofre

export interface ItemCofre {
  id: number;
  remetente: InstitutoResumo;
  destinatario: InstitutoResumo;
  enviado_por_mim: boolean;
  tipo_mime: string;
  algoritmo: string;
  algoritmo_nome: string;
  tamanho_bytes: number;
  tamanho_cifrado: number;
  entropia_original: number;
  entropia_cifrado: number;
  hash_sha256: string;
  amostra_hex: string;
  visualizado: boolean;
  criado_em: string;
}

export interface ConteudoCofre {
  id: number;
  nome_arquivo: string;
  legenda: string | null;
  tipo_mime: string;
  imagem_base64: string;
}

export type CaixaCofre = "todos" | "recebidos" | "enviados";

export const listarCofre = (caixa: CaixaCofre = "todos") => requisitar<ItemCofre[]>(`/cofre?caixa=${caixa}`);

export function enviarAoCofre(arquivo: File, destinatarioId: number | null, legenda: string) {
  const formulario = new FormData();
  formulario.append("arquivo", arquivo);
  if (destinatarioId !== null) formulario.append("destinatario_id", String(destinatarioId));
  if (legenda.trim()) formulario.append("legenda", legenda.trim());
  return requisitar<ItemCofre>("/cofre", { method: "POST", body: formulario });
}

// Confirma a senha; o token devolvido fica só na memória da página (nunca no localStorage).
export const desbloquearCofre = (senha: string) =>
  requisitar<{ token_cofre: string; expira_em_segundos: number }>("/cofre/desbloquear", {
    method: "POST",
    body: json({ senha }),
  });

export const revelarDoCofre = (id: number, tokenCofre: string) =>
  requisitar<ConteudoCofre>(`/cofre/${id}/conteudo`, {
    headers: { "X-Token-Cofre": tokenCofre },
    cache: "no-store",
  });

export const excluirDoCofre = (id: number) => requisitar<void>(`/cofre/${id}`, { method: "DELETE" });

// Bytes do arquivo como está guardado no disco (só o começo, para desenhar a prévia).
export async function bytesCifrados(id: number, limite: number): Promise<Uint8Array> {
  const cabecalhos = new Headers();
  const token = obterToken();
  if (token) cabecalhos.set("Authorization", `Bearer ${token}`);
  const resposta = await fetch(`${BASE_URL}/cofre/${id}/cifrado?limite_bytes=${limite}`, {
    headers: cabecalhos,
    cache: "no-store",
  });
  if (!resposta.ok) throw new ErroApi(resposta.status, "Não foi possível ler o arquivo cifrado.");
  return new Uint8Array(await resposta.arrayBuffer());
}
