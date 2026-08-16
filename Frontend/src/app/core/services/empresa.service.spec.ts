import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { cnpjValido, formatarCnpj } from '../models/empresa.model';
import { EmpresaService } from './empresa.service';

const CNPJ = '11.222.333/0001-81';

function criarServico(): EmpresaService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.inject(EmpresaService);
}

function dadosValidos() {
  return {
    razaoSocial: 'Rede Vale Saúde S.A.',
    nomeFantasia: 'Vale Saúde',
    cnpj: CNPJ,
    responsavel: 'Ana Prado',
    cargo: 'Diretoria clínica',
    email: 'ana@valesaude.com.br',
    telefone: '(47) 3000-0000',
    senha: 'gestao2026',
    unidadeIds: ['blu-01', 'blu-05'],
  };
}

describe('empresa.model', () => {
  it('valida o dígito verificador do CNPJ', () => {
    expect(cnpjValido(CNPJ)).toBe(true);
    expect(cnpjValido('11.222.333/0001-80')).toBe(false);
    expect(cnpjValido('11111111111111')).toBe(false);
  });

  it('formata o CNPJ enquanto o usuário digita', () => {
    expect(formatarCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatarCnpj('11222')).toBe('11.222');
  });
});

describe('EmpresaService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('cadastra a empresa e abre a sessão corporativa', () => {
    const servico = criarServico();

    expect(servico.autenticada()).toBe(false);
    expect(servico.cadastrar(dadosValidos())).toEqual({ ok: true });
    expect(servico.autenticada()).toBe(true);
    expect(servico.empresa()?.nomeFantasia).toBe('Vale Saúde');
    expect(servico.empresa()?.unidadeIds).toEqual(['blu-01', 'blu-05']);
  });

  it('recusa cadastro sem unidades, com senha curta ou CNPJ repetido', () => {
    const servico = criarServico();

    expect(servico.cadastrar({ ...dadosValidos(), unidadeIds: [] }).ok).toBe(false);
    expect(servico.cadastrar({ ...dadosValidos(), senha: '123' }).ok).toBe(false);
    expect(servico.cadastrar({ ...dadosValidos(), cnpj: '11.222.333/0001-80' }).ok).toBe(false);

    expect(servico.cadastrar(dadosValidos()).ok).toBe(true);
    expect(servico.cadastrar(dadosValidos()).ok).toBe(false);
  });

  it('não guarda a senha em texto puro', () => {
    criarServico().cadastrar(dadosValidos());

    expect(localStorage.getItem('carehub.contas-empresa')).not.toContain('gestao2026');
  });

  it('entra com CNPJ e senha e mantém a sessão entre recargas', () => {
    const servico = criarServico();
    servico.cadastrar(dadosValidos());
    servico.sair();

    expect(servico.autenticada()).toBe(false);
    expect(servico.entrar(CNPJ, 'senha-errada').ok).toBe(false);
    expect(servico.entrar(CNPJ, 'gestao2026')).toEqual({ ok: true });

    const reaberto = criarServico();
    expect(reaberto.autenticada()).toBe(true);
    expect(reaberto.empresa()?.cnpj).toBe('11222333000181');
  });

  it('atualiza as unidades administradas da sessão ativa', () => {
    const servico = criarServico();
    servico.cadastrar(dadosValidos());

    servico.definirUnidades(['tim-01']);

    expect(servico.empresa()?.unidadeIds).toEqual(['tim-01']);
    expect(criarServico().empresa()?.unidadeIds).toEqual(['tim-01']);
  });
});
