import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PerfilPaciente, PerfilService } from './perfil.service';

const PERFIL: PerfilPaciente = {
  nome: 'Maria Silveira',
  cpf: '123.456.789-09',
  email: 'maria@exemplo.com',
  telefone: '',
  cep: '89010-000',
  estado: 'SC',
  cidade: 'Blumenau',
  bairro: 'Centro',
  rua: 'Rua XV de Novembro',
  numero: '100',
  complemento: '',
};

function criarServico(): PerfilService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.inject(PerfilService);
}

describe('PerfilService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mantém o cadastro entre recargas', () => {
    criarServico().salvar(PERFIL);

    expect(criarServico().perfil()?.cidade).toBe('Blumenau');
  });

  it('limpa o cadastro ao encerrar a sessão', () => {
    const servico = criarServico();
    servico.salvar(PERFIL);

    servico.limpar();

    expect(servico.perfil()).toBeNull();
    expect(criarServico().perfil()).toBeNull();
  });
});
