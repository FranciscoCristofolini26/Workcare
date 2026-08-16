import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import {
  COM_PLANO,
  RedeStore,
  SEM_PLANO,
  TODAS_ESPECIALIDADES,
  TODOS_MUNICIPIOS,
  TODOS_PLANOS,
} from './rede.store';
import { RedeDataService } from './rede-data.service';
import { Atendimento, RedeSnapshot, Unidade } from '../models/rede.model';
import { PerfilPaciente, PerfilService } from './perfil.service';

function atendimento(especialidade: string, parcial: Partial<Atendimento> = {}): Atendimento {
  return {
    especialidade,
    esperaMinutos: 20,
    esperaComPlanoMinutos: null,
    esperaSemPlanoMinutos: 20,
    pacientesAguardando: 10,
    agendamentosHoje: 100,
    faltasHoje: 10,
    faltasEvitadas: 8,
    vagasSalvas: 5,
    ...parcial,
  };
}

function unidade(
  parcial: Partial<Unidade> & Pick<Unidade, 'id' | 'nome' | 'municipio' | 'atendimentos'>,
): Unidade {
  return {
    tipo: 'UBS',
    bairro: 'Centro',
    posicao: { lat: -26.92, lng: -49.07 },
    imagem: 'unidades/ubs.svg',
    planos: [],
    atendeSemPlano: true,
    online: true,
    ocupacaoPercentual: 50,
    contato: {
      telefone: '(47) 3000-0001',
      whatsapp: '(47) 99000-0001',
      email: 'unidade@exemplo.sc.gov.br',
      horario: 'Segunda a sexta, das 7h às 17h',
    },
    ...parcial,
  };
}

const SNAPSHOT: RedeSnapshot = {
  atualizadoEm: new Date('2026-08-15T14:05:00'),
  unidades: [
    unidade({
      id: 'a',
      nome: 'UBS Velha',
      municipio: 'Blumenau',
      atendimentos: [
        atendimento('Clínica Geral', { esperaMinutos: 20 }),
        atendimento('Pediatria', { esperaMinutos: 20 }),
      ],
    }),
    unidade({
      id: 'b',
      nome: 'Pronto Atendimento Água Verde',
      municipio: 'Blumenau',
      planos: ['Unimed'],
      atendimentos: [
        atendimento('Clínica Geral', {
          esperaMinutos: 35,
          esperaComPlanoMinutos: 25,
          esperaSemPlanoMinutos: 45,
        }),
      ],
    }),
    unidade({
      id: 'c',
      nome: 'Hospital Oase',
      municipio: 'Timbó',
      planos: ['Unimed'],
      atendeSemPlano: false,
      atendimentos: [
        atendimento('Clínica Geral', {
          esperaMinutos: 95,
          esperaComPlanoMinutos: 95,
          esperaSemPlanoMinutos: null,
        }),
        atendimento('Cardiologia', {
          esperaMinutos: 95,
          esperaComPlanoMinutos: 95,
          esperaSemPlanoMinutos: null,
        }),
      ],
    }),
  ],
  eventos: [
    {
      id: 'e1',
      paciente: 'Maria',
      especialidade: 'Cardiologia',
      unidadeId: 'c',
      unidadeNome: 'Hospital Oase',
      municipio: 'Timbó',
      horarioConsulta: '09:15',
      tipo: 'cancelado',
      origem: 'paciente',
      registradoEm: new Date('2026-08-15T14:00:00'),
    },
    {
      id: 'e2',
      paciente: 'João',
      especialidade: 'Pediatria',
      unidadeId: 'a',
      unidadeNome: 'UBS Velha',
      municipio: 'Blumenau',
      horarioConsulta: '10:30',
      tipo: 'cancelado',
      origem: 'paciente',
      registradoEm: new Date('2026-08-15T14:02:00'),
    },
  ],
};

class RedeFake extends RedeDataService {
  readonly fonte = new BehaviorSubject<RedeSnapshot>(SNAPSHOT);
  override readonly rede$ = this.fonte.asObservable();
  readonly reatribuidos: string[] = [];

  override reatribuirVaga(eventoId: string): void {
    this.reatribuidos.push(eventoId);
  }
}

describe('RedeStore', () => {
  let store: RedeStore;
  let fake: RedeFake;

  beforeEach(() => {
    localStorage.clear();
    fake = new RedeFake();
    TestBed.configureTestingModule({
      providers: [{ provide: RedeDataService, useValue: fake }],
    });
    store = TestBed.inject(RedeStore);
  });

  it('lista os municípios em ordem alfabética', () => {
    expect(store.municipios()).toEqual(['Blumenau', 'Timbó']);
  });

  it('seleciona por padrão a cidade salva no cadastro', () => {
    const perfil = TestBed.inject(PerfilService);
    perfil.salvar({ cidade: 'Timbo' } as PerfilPaciente);
    TestBed.flushEffects();

    expect(store.municipio()).toBe('Timbó');
    expect(store.unidades().map((item) => item.id)).toEqual(['c']);
  });

  it('lista as especialidades disponíveis na rede sem repetição', () => {
    expect(store.especialidades()).toEqual(['Cardiologia', 'Clínica Geral', 'Pediatria']);
  });

  it('lista os planos disponíveis na rede sem repetição', () => {
    expect(store.planos()).toEqual(['Unimed']);
  });

  it('filtra as unidades pelo plano selecionado', () => {
    store.definirPlano('Unimed');

    expect(store.unidades().map((item) => item.id)).toEqual(['b', 'c']);
    expect(store.indicadores().unidadesTotal).toBe(2);
  });

  it('distingue unidades com plano e atendimento sem plano', () => {
    store.definirPlano(COM_PLANO);
    expect(store.unidades().map((item) => item.id)).toEqual(['b', 'c']);

    store.definirPlano(SEM_PLANO);
    expect(store.unidades().map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('usa o tempo de espera correspondente à modalidade filtrada', () => {
    store.definirPlano(COM_PLANO);
    expect(store.unidades().map((item) => [item.id, item.esperaMinutos])).toEqual([
      ['b', 25],
      ['c', 95],
    ]);

    store.definirPlano(SEM_PLANO);
    expect(store.unidades().map((item) => [item.id, item.esperaMinutos])).toEqual([
      ['a', 20],
      ['b', 45],
    ]);
  });

  it('combina os filtros de plano e município', () => {
    store.definirPlano('Unimed');
    store.definirMunicipio('Blumenau');

    expect(store.unidades().map((item) => item.id)).toEqual(['b']);
  });

  it('volta a exibir todos os planos ao limpar o filtro', () => {
    store.definirPlano('Unimed');
    store.definirPlano(TODOS_PLANOS);

    expect(store.unidades().length).toBe(3);
  });

  it('filtra os eventos pelas unidades que aceitam o plano', () => {
    store.definirPlano('Unimed');

    expect(store.eventos().map((evento) => evento.id)).toEqual(['e1']);
  });

  it('filtra as unidades pelo município selecionado', () => {
    store.definirMunicipio('Timbó');

    expect(store.unidades().map((item) => item.id)).toEqual(['c']);
    expect(store.municipio()).toBe('Timbó');
  });

  it('mostra apenas as unidades que atendem a especialidade escolhida', () => {
    store.definirEspecialidade('Cardiologia');

    expect(store.unidades().map((item) => item.id)).toEqual(['c']);
    expect(store.indicadores().unidadesTotal).toBe(1);
  });

  it('recalcula os indicadores com os números da especialidade escolhida', () => {
    const geral = store.indicadores();
    expect(geral.agendamentosHoje).toBe(500);
    expect(geral.pacientesAguardando).toBe(50);

    store.definirEspecialidade('Pediatria');
    const pediatria = store.indicadores();

    expect(pediatria.unidadesTotal).toBe(1);
    expect(pediatria.agendamentosHoje).toBe(100);
    expect(pediatria.pacientesFaltantes).toBe(10);
    expect(pediatria.pacientesAguardando).toBe(10);
  });

  it('separa faltas evitadas de vagas salvas nos indicadores', () => {
    const geral = store.indicadores();

    expect(geral.faltasEvitadas).toBe(40);
    expect(geral.vagasSalvas).toBe(25);
    expect(geral.taxaConfirmacao).toBeCloseTo(8);
  });

  it('combina o filtro de especialidade com o de município', () => {
    store.definirEspecialidade('Clínica Geral');
    store.definirMunicipio('Blumenau');

    expect(store.unidades().map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('filtra os eventos do WhatsApp pela especialidade escolhida', () => {
    expect(store.eventos().length).toBe(2);

    store.definirEspecialidade('Cardiologia');

    expect(store.eventos().map((evento) => evento.id)).toEqual(['e1']);
    expect(store.cancelamentosAbertos()).toBe(1);
  });

  it('limpa a unidade selecionada ao trocar de especialidade', () => {
    store.selecionarUnidade('a');
    expect(store.unidadeSelecionada()?.nome).toBe('UBS Velha');

    store.definirEspecialidade('Cardiologia');
    expect(store.unidadeSelecionadaId()).toBeNull();
  });

  it('volta a exibir toda a rede ao limpar o filtro de especialidade', () => {
    store.definirEspecialidade('Cardiologia');
    store.definirEspecialidade(TODAS_ESPECIALIDADES);

    expect(store.unidades().length).toBe(3);
  });

  it('filtra as unidades pelo nível de espera', () => {
    store.definirNivel('alta');

    expect(store.unidades().map((item) => item.id)).toEqual(['c']);
  });

  it('filtra as unidades pelo termo de busca sem diferenciar maiúsculas', () => {
    store.definirBusca('ÁGUA VER');

    expect(store.unidades().map((item) => item.id)).toEqual(['b']);
  });

  it('calcula os indicadores apenas do município selecionado', () => {
    store.definirMunicipio('Blumenau');
    const indicadores = store.indicadores();

    expect(indicadores.unidadesTotal).toBe(2);
    expect(indicadores.pacientesFaltantes).toBe(30);
    expect(indicadores.agendamentosHoje).toBe(300);
    expect(indicadores.taxaAbsenteismo).toBeCloseTo(10);
    expect(indicadores.esperaMediaMinutos).toBe(28);
  });

  it('mantém os indicadores da rede inteira quando não há filtros', () => {
    expect(store.municipio()).toBe(TODOS_MUNICIPIOS);
    expect(store.especialidade()).toBe(TODAS_ESPECIALIDADES);
    expect(store.indicadores().unidadesTotal).toBe(3);
  });

  it('agrupa as unidades por nível de espera', () => {
    expect(store.distribuicaoPorNivel()).toEqual({ baixa: 1, media: 1, alta: 1 });
  });

  it('delega a reatribuição de vaga para a fonte de dados', () => {
    store.reatribuirVaga('e1');

    expect(fake.reatribuidos).toEqual(['e1']);
  });

  it('reflete novas emissões da fonte de dados', () => {
    fake.fonte.next({ ...SNAPSHOT, unidades: SNAPSHOT.unidades.slice(0, 1) });

    expect(store.unidades().length).toBe(1);
  });
});
