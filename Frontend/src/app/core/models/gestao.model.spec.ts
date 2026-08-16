import {
  FluxoHora,
  SerieOperacional,
  agregarDemanda,
  agregarFluxoHorario,
  alertasOperacionais,
  desempenhoPorUnidade,
  formatarFaixaHoraria,
  maioresPicos,
  resumirOperacao,
} from './gestao.model';

function fluxo(valores: Partial<FluxoHora>[]): readonly FluxoHora[] {
  return Array.from({ length: 24 }, (_, hora) => ({
    hora,
    entradas: 0,
    saidas: 0,
    emAtendimento: 0,
    esperaMinutos: 0,
    ...(valores.find((valor) => valor.hora === hora) ?? {}),
  }));
}

function serie(
  unidadeId: string,
  dias: { diaSemana: number; fluxo: readonly FluxoHora[] }[],
  capacidade = 20,
): SerieOperacional {
  return {
    perfil: {
      unidadeId,
      nome: `Unidade ${unidadeId}`,
      municipio: 'Blumenau',
      tipo: 'Pronto Atendimento',
      especialidades: 3,
      permanenciaMediaMinutos: 90,
      capacidadeSimultanea: capacidade,
    },
    dias: dias.map((dia, indice) => ({
      data: new Date(2026, 7, 10 + indice),
      diaSemana: dia.diaSemana,
      fluxo: dia.fluxo,
    })),
  };
}

describe('agregarFluxoHorario', () => {
  it('soma as unidades e tira a média entre os dias da janela', () => {
    const primeira = serie('a', [
      { diaSemana: 1, fluxo: fluxo([{ hora: 9, entradas: 10, saidas: 4, emAtendimento: 6 }]) },
      { diaSemana: 2, fluxo: fluxo([{ hora: 9, entradas: 20, saidas: 8, emAtendimento: 12 }]) },
    ]);
    const segunda = serie('b', [
      { diaSemana: 1, fluxo: fluxo([{ hora: 9, entradas: 6, saidas: 2, emAtendimento: 4 }]) },
      { diaSemana: 2, fluxo: fluxo([{ hora: 9, entradas: 4, saidas: 2, emAtendimento: 2 }]) },
    ]);

    const resultado = agregarFluxoHorario([primeira, segunda]);

    expect(resultado[9].entradas).toBe(20);
    expect(resultado[9].saidas).toBe(8);
    expect(resultado[9].emAtendimento).toBe(12);
    expect(resultado[8].entradas).toBe(0);
  });

  it('devolve 24 horas zeradas quando não há unidades', () => {
    const resultado = agregarFluxoHorario([]);

    expect(resultado).toHaveLength(24);
    expect(resultado.every((hora) => hora.entradas === 0)).toBe(true);
  });
});

describe('resumirOperacao', () => {
  const unica = serie(
    'a',
    [
      {
        diaSemana: 1,
        fluxo: fluxo([
          { hora: 8, entradas: 4, saidas: 1, emAtendimento: 3, esperaMinutos: 20 },
          { hora: 9, entradas: 12, saidas: 6, emAtendimento: 9, esperaMinutos: 70 },
          { hora: 10, entradas: 8, saidas: 10, emAtendimento: 7, esperaMinutos: 45 },
        ]),
      },
    ],
    12,
  );

  it('identifica pico, vale e ocupação sobre a capacidade', () => {
    const resumo = resumirOperacao([unica], 9);

    expect(resumo.horaPico).toBe(9);
    expect(resumo.horaVale).toBe(8);
    expect(resumo.emAtendimentoAgora).toBe(9);
    expect(resumo.picoSimultaneo).toBe(9);
    expect(resumo.ocupacaoPicoPercentual).toBe(75);
    expect(resumo.entradasPorDia).toBe(24);
    expect(resumo.saidasPorDia).toBe(17);
  });

  it('ignora horas sem movimento ao calcular a espera média', () => {
    const resumo = resumirOperacao([unica], 9);

    expect(resumo.esperaMediaMinutos).toBe(45);
  });
});

describe('desempenhoPorUnidade e alertas', () => {
  it('mede o percentual de entradas dentro da meta de espera', () => {
    const unidade = serie(
      'a',
      [
        {
          diaSemana: 1,
          fluxo: fluxo([
            { hora: 8, entradas: 30, saidas: 10, emAtendimento: 20, esperaMinutos: 40 },
            { hora: 9, entradas: 10, saidas: 10, emAtendimento: 20, esperaMinutos: 90 },
          ]),
        },
      ],
      20,
    );

    const [resultado] = desempenhoPorUnidade([unidade]);

    expect(resultado.entradasPorDia).toBe(40);
    expect(resultado.dentroDaMetaPercentual).toBe(75);
    expect(resultado.ocupacaoPicoPercentual).toBe(100);
  });

  it('aponta lotação crítica e meta descumprida', () => {
    const alertas = alertasOperacionais([
      {
        unidadeId: 'a',
        nome: 'Pronto Atendimento Centro',
        municipio: 'Blumenau',
        tipo: 'Pronto Atendimento',
        entradasPorDia: 40,
        saidasPorDia: 38,
        saldo: 2,
        permanenciaMediaMinutos: 90,
        esperaMediaMinutos: 95,
        ocupacaoPicoPercentual: 98,
        dentroDaMetaPercentual: 40,
        horaPico: 19,
      },
    ]);

    expect(alertas).toHaveLength(2);
    expect(alertas[0].severidade).toBe('critico');
    expect(alertas.some((alerta) => alerta.mensagem.includes('98%'))).toBe(true);
  });
});

describe('demanda por faixa de horário', () => {
  it('calcula a média por dia da semana e sugere a equipe do pico', () => {
    const unidade = serie('a', [
      { diaSemana: 1, fluxo: fluxo([{ hora: 19, entradas: 16 }]) },
      { diaSemana: 1, fluxo: fluxo([{ hora: 19, entradas: 8 }]) },
      { diaSemana: 2, fluxo: fluxo([{ hora: 10, entradas: 4 }]) },
    ]);

    const celulas = agregarDemanda([unidade]);
    const segundaAsSete = celulas.find((celula) => celula.diaSemana === 1 && celula.hora === 19);

    expect(segundaAsSete?.atendimentos).toBe(12);

    const [pico] = maioresPicos(celulas, 3);
    expect(pico.hora).toBe(19);
    expect(pico.equipeSugerida).toBe(3);
  });
});

describe('formatarFaixaHoraria', () => {
  it('descreve a hora cheia e vira o dia à meia-noite', () => {
    expect(formatarFaixaHoraria(7)).toBe('07h–08h');
    expect(formatarFaixaHoraria(23)).toBe('23h–00h');
  });
});
