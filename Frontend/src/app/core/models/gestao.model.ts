import { TipoUnidade } from './rede.model';

export type PeriodoGestao = 'hoje' | '7dias' | '30dias';

export const TODAS_UNIDADES = 'todas';

export const DIAS_POR_PERIODO: Record<PeriodoGestao, number> = {
  hoje: 1,
  '7dias': 7,
  '30dias': 30,
};

export const ROTULO_PERIODO: Record<PeriodoGestao, string> = {
  hoje: 'Hoje',
  '7dias': 'Últimos 7 dias',
  '30dias': 'Últimos 30 dias',
};

export const NOMES_DIA_SEMANA = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

export const NOMES_DIA_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

/** Movimentação de uma hora cheia em uma unidade. */
export interface FluxoHora {
  hora: number;
  entradas: number;
  saidas: number;
  emAtendimento: number;
  esperaMinutos: number;
}

export interface DiaOperacional {
  data: Date;
  diaSemana: number;
  fluxo: readonly FluxoHora[];
}

export interface PerfilOperacional {
  unidadeId: string;
  nome: string;
  municipio: string;
  tipo: TipoUnidade;
  especialidades: number;
  permanenciaMediaMinutos: number;
  capacidadeSimultanea: number;
}

export interface SerieOperacional {
  perfil: PerfilOperacional;
  dias: readonly DiaOperacional[];
}

export interface DemandaCelula {
  diaSemana: number;
  hora: number;
  atendimentos: number;
}

export interface PicoDemanda {
  diaSemana: number;
  hora: number;
  atendimentos: number;
  equipeSugerida: number;
}

export interface ResumoOperacional {
  entradas: number;
  saidas: number;
  entradasPorDia: number;
  saidasPorDia: number;
  emAtendimentoAgora: number;
  picoSimultaneo: number;
  permanenciaMediaMinutos: number;
  esperaMediaMinutos: number;
  ocupacaoMediaPercentual: number;
  ocupacaoPicoPercentual: number;
  horaPico: number;
  horaVale: number;
  unidades: number;
  dias: number;
}

export interface DesempenhoUnidade {
  unidadeId: string;
  nome: string;
  municipio: string;
  tipo: TipoUnidade;
  entradasPorDia: number;
  saidasPorDia: number;
  saldo: number;
  permanenciaMediaMinutos: number;
  esperaMediaMinutos: number;
  ocupacaoPicoPercentual: number;
  dentroDaMetaPercentual: number;
  horaPico: number;
}

export interface AlertaGestao {
  unidadeId: string;
  unidade: string;
  municipio: string;
  mensagem: string;
  severidade: 'atencao' | 'critico';
}

/** Meta de espera assumida pelo painel de gestão, em minutos. */
export const META_ESPERA_MINUTOS = 60;

/** Atendimentos que uma pessoa da equipe absorve por hora, usado no dimensionamento. */
export const ATENDIMENTOS_POR_PROFISSIONAL_HORA = 4;

function fluxoVazio(): FluxoHora[] {
  return Array.from({ length: 24 }, (_, hora) => ({
    hora,
    entradas: 0,
    saidas: 0,
    emAtendimento: 0,
    esperaMinutos: 0,
  }));
}

function media(valores: readonly number[]): number {
  return valores.length === 0
    ? 0
    : valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

function horaDeMaiorEntrada(fluxo: readonly FluxoHora[]): number {
  return fluxo.reduce(
    (escolhida, hora) => (hora.entradas > fluxo[escolhida].entradas ? hora.hora : escolhida),
    0,
  );
}

function horaDeMenorEntrada(fluxo: readonly FluxoHora[]): number {
  const comMovimento = fluxo.filter((hora) => hora.entradas > 0);
  return comMovimento.reduce(
    (escolhida, hora) => (hora.entradas < escolhida.entradas ? hora : escolhida),
    comMovimento[0] ?? fluxo[0],
  ).hora;
}

/**
 * Consolida as séries em um perfil de 24 horas: soma as unidades e tira a média
 * entre os dias da janela, para que períodos diferentes fiquem comparáveis.
 */
export function agregarFluxoHorario(series: readonly SerieOperacional[]): readonly FluxoHora[] {
  const total = fluxoVazio();
  const dias = series[0]?.dias.length ?? 0;
  if (dias === 0) {
    return total;
  }

  const esperas: number[][] = Array.from({ length: 24 }, () => []);

  for (const serie of series) {
    for (const dia of serie.dias) {
      for (const hora of dia.fluxo) {
        const alvo = total[hora.hora];
        alvo.entradas += hora.entradas;
        alvo.saidas += hora.saidas;
        alvo.emAtendimento += hora.emAtendimento;
        if (hora.entradas > 0) {
          esperas[hora.hora].push(hora.esperaMinutos);
        }
      }
    }
  }

  return total.map((hora, indice) => ({
    hora: hora.hora,
    entradas: Math.round(hora.entradas / dias),
    saidas: Math.round(hora.saidas / dias),
    emAtendimento: Math.round(hora.emAtendimento / dias),
    esperaMinutos: Math.round(media(esperas[indice])),
  }));
}

/** Matriz dia da semana × hora com a média de entradas observadas em cada faixa. */
export function agregarDemanda(series: readonly SerieOperacional[]): readonly DemandaCelula[] {
  const somas = new Map<string, { total: number; ocorrencias: number }>();

  for (const serie of series) {
    for (const dia of serie.dias) {
      for (const hora of dia.fluxo) {
        const chave = `${dia.diaSemana}|${hora.hora}`;
        const atual = somas.get(chave) ?? { total: 0, ocorrencias: 0 };
        atual.total += hora.entradas;
        somas.set(chave, atual);
      }
    }
  }

  const diasPorSemana = new Map<number, number>();
  const primeira = series[0];
  for (const dia of primeira?.dias ?? []) {
    diasPorSemana.set(dia.diaSemana, (diasPorSemana.get(dia.diaSemana) ?? 0) + 1);
  }

  const celulas: DemandaCelula[] = [];
  for (let diaSemana = 0; diaSemana < 7; diaSemana += 1) {
    const ocorrencias = diasPorSemana.get(diaSemana) ?? 0;
    for (let hora = 0; hora < 24; hora += 1) {
      const soma = somas.get(`${diaSemana}|${hora}`)?.total ?? 0;
      celulas.push({
        diaSemana,
        hora,
        atendimentos: ocorrencias === 0 ? 0 : Math.round(soma / ocorrencias),
      });
    }
  }

  return celulas;
}

export function maioresPicos(
  celulas: readonly DemandaCelula[],
  quantidade: number,
): readonly PicoDemanda[] {
  return [...celulas]
    .filter((celula) => celula.atendimentos > 0)
    .sort((a, b) => b.atendimentos - a.atendimentos)
    .slice(0, quantidade)
    .map((celula) => ({
      diaSemana: celula.diaSemana,
      hora: celula.hora,
      atendimentos: celula.atendimentos,
      equipeSugerida: Math.max(
        1,
        Math.ceil(celula.atendimentos / ATENDIMENTOS_POR_PROFISSIONAL_HORA),
      ),
    }));
}

export function resumirOperacao(
  series: readonly SerieOperacional[],
  horaAtual: number,
): ResumoOperacional {
  const fluxo = agregarFluxoHorario(series);
  const dias = series[0]?.dias.length ?? 0;
  const capacidade = series.reduce((total, serie) => total + serie.perfil.capacidadeSimultanea, 0);

  const entradasPorDia = fluxo.reduce((total, hora) => total + hora.entradas, 0);
  const saidasPorDia = fluxo.reduce((total, hora) => total + hora.saidas, 0);
  const picoSimultaneo = fluxo.reduce((maior, hora) => Math.max(maior, hora.emAtendimento), 0);

  const comMovimento = fluxo.filter((hora) => hora.entradas > 0);
  const permanencia = media(series.map((serie) => serie.perfil.permanenciaMediaMinutos));
  const espera = media(comMovimento.map((hora) => hora.esperaMinutos));
  const ocupacaoMedia =
    capacidade === 0 ? 0 : media(comMovimento.map((hora) => hora.emAtendimento)) / capacidade;

  return {
    entradas: entradasPorDia * dias,
    saidas: saidasPorDia * dias,
    entradasPorDia,
    saidasPorDia,
    emAtendimentoAgora: fluxo[horaAtual]?.emAtendimento ?? 0,
    picoSimultaneo,
    permanenciaMediaMinutos: Math.round(permanencia),
    esperaMediaMinutos: Math.round(espera),
    ocupacaoMediaPercentual: Math.round(ocupacaoMedia * 100),
    ocupacaoPicoPercentual: capacidade === 0 ? 0 : Math.round((picoSimultaneo / capacidade) * 100),
    horaPico: horaDeMaiorEntrada(fluxo),
    horaVale: horaDeMenorEntrada(fluxo),
    unidades: series.length,
    dias,
  };
}

export function desempenhoPorUnidade(
  series: readonly SerieOperacional[],
): readonly DesempenhoUnidade[] {
  return series
    .map((serie) => {
      const fluxo = agregarFluxoHorario([serie]);
      const comMovimento = fluxo.filter((hora) => hora.entradas > 0);
      const entradasPorDia = fluxo.reduce((total, hora) => total + hora.entradas, 0);
      const saidasPorDia = fluxo.reduce((total, hora) => total + hora.saidas, 0);
      const pico = fluxo.reduce((maior, hora) => Math.max(maior, hora.emAtendimento), 0);
      const dentroDaMeta = comMovimento.filter((hora) => hora.esperaMinutos <= META_ESPERA_MINUTOS);
      const totalDentroDaMeta = dentroDaMeta.reduce((total, hora) => total + hora.entradas, 0);

      return {
        unidadeId: serie.perfil.unidadeId,
        nome: serie.perfil.nome,
        municipio: serie.perfil.municipio,
        tipo: serie.perfil.tipo,
        entradasPorDia,
        saidasPorDia,
        saldo: entradasPorDia - saidasPorDia,
        permanenciaMediaMinutos: serie.perfil.permanenciaMediaMinutos,
        esperaMediaMinutos: Math.round(media(comMovimento.map((hora) => hora.esperaMinutos))),
        ocupacaoPicoPercentual:
          serie.perfil.capacidadeSimultanea === 0
            ? 0
            : Math.round((pico / serie.perfil.capacidadeSimultanea) * 100),
        dentroDaMetaPercentual:
          entradasPorDia === 0 ? 0 : Math.round((totalDentroDaMeta / entradasPorDia) * 100),
        horaPico: horaDeMaiorEntrada(fluxo),
      };
    })
    .sort((a, b) => b.entradasPorDia - a.entradasPorDia);
}

export function alertasOperacionais(
  desempenho: readonly DesempenhoUnidade[],
): readonly AlertaGestao[] {
  const alertas: AlertaGestao[] = [];

  for (const unidade of desempenho) {
    if (unidade.ocupacaoPicoPercentual >= 95) {
      alertas.push({
        unidadeId: unidade.unidadeId,
        unidade: unidade.nome,
        municipio: unidade.municipio,
        severidade: 'critico',
        mensagem: `Lotação de pico em ${unidade.ocupacaoPicoPercentual}% da capacidade, com concentração às ${unidade.horaPico}h.`,
      });
    } else if (unidade.ocupacaoPicoPercentual >= 85) {
      alertas.push({
        unidadeId: unidade.unidadeId,
        unidade: unidade.nome,
        municipio: unidade.municipio,
        severidade: 'atencao',
        mensagem: `Lotação de pico em ${unidade.ocupacaoPicoPercentual}% da capacidade às ${unidade.horaPico}h.`,
      });
    }

    if (unidade.dentroDaMetaPercentual < 70 && unidade.entradasPorDia > 0) {
      alertas.push({
        unidadeId: unidade.unidadeId,
        unidade: unidade.nome,
        municipio: unidade.municipio,
        severidade: unidade.dentroDaMetaPercentual < 50 ? 'critico' : 'atencao',
        mensagem: `Apenas ${unidade.dentroDaMetaPercentual}% das entradas foram atendidas dentro da meta de ${META_ESPERA_MINUTOS} minutos.`,
      });
    }
  }

  return alertas.sort((a, b) =>
    a.severidade === b.severidade ? 0 : a.severidade === 'critico' ? -1 : 1,
  );
}

export function formatarFaixaHoraria(hora: number): string {
  const inicio = hora.toString().padStart(2, '0');
  const fim = ((hora + 1) % 24).toString().padStart(2, '0');
  return `${inicio}h–${fim}h`;
}
