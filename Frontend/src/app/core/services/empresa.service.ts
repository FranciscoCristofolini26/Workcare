import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  ContaEmpresa,
  DadosEmpresa,
  PerfilEmpresa,
  ResultadoAcesso,
  apenasDigitosCnpj,
  cnpjValido,
  resumirSenha,
} from '../models/empresa.model';

const CHAVE_CONTAS = 'carehub.contas-empresa';
const CHAVE_SESSAO = 'carehub.sessao-empresa';

export interface NovaEmpresa extends DadosEmpresa {
  senha: string;
  unidadeIds: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private readonly janela = inject(DOCUMENT).defaultView;

  private readonly contas = signal<readonly ContaEmpresa[]>(this.carregarContas());
  private readonly sessaoId = signal<string | null>(this.carregarSessao());

  readonly empresa = computed<PerfilEmpresa | null>(() => {
    const id = this.sessaoId();
    return id === null ? null : (this.contas().find((conta) => conta.id === id) ?? null);
  });

  readonly autenticada = computed(() => this.empresa() !== null);

  cadastrar(nova: NovaEmpresa): ResultadoAcesso {
    const cnpj = apenasDigitosCnpj(nova.cnpj);
    if (!cnpjValido(cnpj)) {
      return { ok: false, erro: 'Informe um CNPJ válido.' };
    }
    if (nova.senha.length < 8) {
      return { ok: false, erro: 'A senha precisa ter ao menos 8 caracteres.' };
    }
    if (nova.unidadeIds.length === 0) {
      return { ok: false, erro: 'Selecione ao menos uma unidade administrada pela empresa.' };
    }
    if (this.contas().some((conta) => conta.cnpj === cnpj)) {
      return { ok: false, erro: 'Já existe uma conta com este CNPJ. Use a tela de acesso.' };
    }

    const conta: ContaEmpresa = {
      id: `emp-${cnpj}`,
      razaoSocial: nova.razaoSocial.trim(),
      nomeFantasia: (nova.nomeFantasia || nova.razaoSocial).trim(),
      cnpj,
      responsavel: nova.responsavel.trim(),
      cargo: nova.cargo.trim(),
      email: nova.email.trim(),
      telefone: nova.telefone.trim(),
      unidadeIds: [...nova.unidadeIds],
      criadoEm: new Date().toISOString(),
      resumoSenha: resumirSenha(nova.senha, cnpj),
    };

    this.gravarContas([...this.contas(), conta]);
    this.abrirSessao(conta.id);
    return { ok: true };
  }

  entrar(cnpj: string, senha: string): ResultadoAcesso {
    const documento = apenasDigitosCnpj(cnpj);
    const conta = this.contas().find((registro) => registro.cnpj === documento);
    if (!conta || conta.resumoSenha !== resumirSenha(senha, documento)) {
      return { ok: false, erro: 'CNPJ ou senha inválidos.' };
    }

    this.abrirSessao(conta.id);
    return { ok: true };
  }

  sair(): void {
    this.sessaoId.set(null);
    this.janela?.localStorage.removeItem(CHAVE_SESSAO);
  }

  definirUnidades(unidadeIds: readonly string[]): void {
    const id = this.sessaoId();
    if (id === null) {
      return;
    }

    this.gravarContas(
      this.contas().map((conta) =>
        conta.id === id ? { ...conta, unidadeIds: [...unidadeIds] } : conta,
      ),
    );
  }

  private abrirSessao(id: string): void {
    this.sessaoId.set(id);
    this.janela?.localStorage.setItem(CHAVE_SESSAO, id);
  }

  private gravarContas(contas: readonly ContaEmpresa[]): void {
    this.contas.set(contas);
    this.janela?.localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas));
  }

  private carregarContas(): readonly ContaEmpresa[] {
    try {
      const valor = this.janela?.localStorage.getItem(CHAVE_CONTAS);
      const contas = valor ? (JSON.parse(valor) as ContaEmpresa[]) : [];
      return Array.isArray(contas) ? contas : [];
    } catch {
      return [];
    }
  }

  private carregarSessao(): string | null {
    try {
      return this.janela?.localStorage.getItem(CHAVE_SESSAO) ?? null;
    } catch {
      return null;
    }
  }
}
