import { TestBed } from '@angular/core/testing';
import { RedeMockService } from './rede-mock.service';
import { INTERVALO_ATUALIZACAO, RedeDataService, SEMENTE_SIMULACAO } from './rede-data.service';
import { RedeSnapshot } from '../models/rede.model';

describe('RedeMockService', () => {
  let servico: RedeDataService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        { provide: RedeDataService, useClass: RedeMockService },
        { provide: INTERVALO_ATUALIZACAO, useValue: 1000 },
        { provide: SEMENTE_SIMULACAO, useValue: 42 },
      ],
    });
    servico = TestBed.inject(RedeDataService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function assinar(): { atual: () => RedeSnapshot; encerrar: () => void } {
    let snapshot!: RedeSnapshot;
    const assinatura = servico.rede$.subscribe((valor) => (snapshot = valor));
    return { atual: () => snapshot, encerrar: () => assinatura.unsubscribe() };
  }

  function esperas(snapshot: RedeSnapshot): number[] {
    return snapshot.unidades.flatMap((unidade) =>
      unidade.atendimentos.map((atendimento) => atendimento.esperaMinutos),
    );
  }

  it('emite o estado inicial de forma síncrona', () => {
    const { atual, encerrar } = assinar();

    expect(atual().unidades.length).toBe(14);
    expect(atual().eventos.length).toBe(12);
    encerrar();
  });

  it('dá a cada unidade ao menos uma especialidade atendida', () => {
    const { atual, encerrar } = assinar();

    expect(atual().unidades.every((unidade) => unidade.atendimentos.length > 0)).toBe(true);
    encerrar();
  });

  it('só gera eventos para especialidades atendidas pela unidade', () => {
    const { atual, encerrar } = assinar();

    vi.advanceTimersByTime(30000);

    const coerentes = atual().eventos.every((evento) => {
      const unidade = atual().unidades.find((item) => item.id === evento.unidadeId);
      return unidade?.atendimentos.some(
        (atendimento) => atendimento.especialidade === evento.especialidade,
      );
    });

    expect(coerentes).toBe(true);
    encerrar();
  });

  it('atualiza os tempos de espera a cada intervalo', () => {
    const { atual, encerrar } = assinar();
    const inicial = esperas(atual());

    vi.advanceTimersByTime(3000);

    const agora = esperas(atual());
    expect(agora).not.toEqual(inicial);
    expect(agora.every((minutos) => minutos >= 6 && minutos <= 180)).toBe(true);
    encerrar();
  });

  it('credita confirmações em faltas evitadas e reatribuições em vagas salvas', () => {
    const { atual, encerrar } = assinar();
    const totais = (snapshot: RedeSnapshot) =>
      snapshot.unidades
        .flatMap((unidade) => unidade.atendimentos)
        .reduce(
          (acumulado, atendimento) => ({
            evitadas: acumulado.evitadas + atendimento.faltasEvitadas,
            vagas: acumulado.vagas + atendimento.vagasSalvas,
            faltas: acumulado.faltas + atendimento.faltasHoje,
          }),
          { evitadas: 0, vagas: 0, faltas: 0 },
        );

    const antes = totais(atual());
    const conhecidos = new Set(atual().eventos.map((evento) => evento.id));

    vi.advanceTimersByTime(20000);

    const novos = atual().eventos.filter((evento) => !conhecidos.has(evento.id));
    const porTipo = (tipo: string) => novos.filter((evento) => evento.tipo === tipo).length;
    const depois = totais(atual());

    expect(novos.length).toBeGreaterThan(0);
    expect(depois.evitadas - antes.evitadas).toBe(porTipo('confirmado'));
    expect(depois.vagas - antes.vagas).toBe(porTipo('reatribuido'));
    expect(depois.faltas - antes.faltas).toBe(porTipo('cancelado'));
    encerrar();
  });

  it('mantém no máximo quarenta eventos na fila', () => {
    const { atual, encerrar } = assinar();

    vi.advanceTimersByTime(60000);

    expect(atual().eventos.length).toBeLessThanOrEqual(40);
    encerrar();
  });

  it('não emite novos estados quando não há assinantes', () => {
    const { atual, encerrar } = assinar();
    const primeiro = atual().atualizadoEm;
    encerrar();

    vi.advanceTimersByTime(10000);

    const { atual: depois, encerrar: fechar } = assinar();
    expect(depois().atualizadoEm).toEqual(primeiro);
    fechar();
  });

  it('converte um cancelamento em vaga reatribuída na especialidade correta', () => {
    const { atual, encerrar } = assinar();
    const cancelado = atual().eventos.find((evento) => evento.tipo === 'cancelado')!;
    const vagasAntes = atual()
      .unidades.find((item) => item.id === cancelado.unidadeId)!
      .atendimentos.find((item) => item.especialidade === cancelado.especialidade)!.vagasSalvas;

    servico.reatribuirVaga(cancelado.id);

    const evento = atual().eventos.find((item) => item.id === cancelado.id)!;
    const vagasDepois = atual()
      .unidades.find((item) => item.id === cancelado.unidadeId)!
      .atendimentos.find((item) => item.especialidade === cancelado.especialidade)!.vagasSalvas;

    expect(evento.tipo).toBe('reatribuido');
    expect(evento.origem).toBe('automatico');
    expect(vagasDepois).toBe(vagasAntes + 1);
    encerrar();
  });

  it('ignora a reatribuição de eventos que não são cancelamentos', () => {
    const { atual, encerrar } = assinar();
    const confirmado = atual().eventos.find((evento) => evento.tipo !== 'cancelado')!;
    const antes = atual();

    servico.reatribuirVaga(confirmado.id);

    expect(atual()).toBe(antes);
    encerrar();
  });
});
