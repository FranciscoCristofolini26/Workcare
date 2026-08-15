export type NivelEspera = 'baixa' | 'media' | 'alta';

export type TipoUnidade = 'UBS' | 'Pronto Atendimento' | 'Policlínica' | 'Hospital';

export type TipoEvento = 'cancelado' | 'confirmado' | 'reatribuido';

export type OrigemEvento = 'paciente' | 'automatico';

export const TODAS_ESPECIALIDADES = 'todas';

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface Contato {
  telefone: string;
  whatsapp: string;
  email: string;
  horario: string;
}

export interface Atendimento {
  especialidade: string;
  esperaMinutos: number;
  esperaComPlanoMinutos: number | null;
  esperaSemPlanoMinutos: number | null;
  pacientesAguardando: number;
  agendamentosHoje: number;
  faltasHoje: number;
  faltasEvitadas: number;
  vagasSalvas: number;
}

export interface Unidade {
  id: string;
  nome: string;
  municipio: string;
  tipo: TipoUnidade;
  bairro: string;
  posicao: Coordenada;
  imagem: string;
  planos: readonly string[];
  atendeSemPlano: boolean;
  online: boolean;
  ocupacaoPercentual: number;
  contato: Contato;
  atendimentos: readonly Atendimento[];
}

export interface UnidadeResumo {
  id: string;
  nome: string;
  municipio: string;
  tipo: TipoUnidade;
  bairro: string;
  posicao: Coordenada;
  imagem: string;
  planos: readonly string[];
  atendeSemPlano: boolean;
  online: boolean;
  ocupacaoPercentual: number;
  contato: Contato;
  esperaMinutos: number;
  esperaComPlanoMinutos: number | null;
  esperaSemPlanoMinutos: number | null;
  pacientesAguardando: number;
  agendamentosHoje: number;
  faltasHoje: number;
  faltasEvitadas: number;
  vagasSalvas: number;
  especialidades: readonly string[];
}

export interface EventoWhatsapp {
  id: string;
  paciente: string;
  especialidade: string;
  unidadeId: string;
  unidadeNome: string;
  municipio: string;
  horarioConsulta: string;
  tipo: TipoEvento;
  origem: OrigemEvento;
  registradoEm: Date;
}

export interface RedeSnapshot {
  unidades: readonly Unidade[];
  eventos: readonly EventoWhatsapp[];
  atualizadoEm: Date;
}

export interface Indicadores {
  pacientesFaltantes: number;
  agendamentosHoje: number;
  taxaAbsenteismo: number;
  faltasEvitadas: number;
  taxaConfirmacao: number;
  vagasSalvas: number;
  esperaMediaMinutos: number;
  esperaMediaComPlanoMinutos: number | null;
  esperaMediaSemPlanoMinutos: number | null;
  unidadesOnline: number;
  unidadesTotal: number;
  pacientesAguardando: number;
}

export const REDE_VAZIA: RedeSnapshot = {
  unidades: [],
  eventos: [],
  atualizadoEm: new Date(0),
};

export function nivelPorEspera(minutos: number): NivelEspera {
  if (minutos <= 30) {
    return 'baixa';
  }
  return minutos <= 60 ? 'media' : 'alta';
}

export function resumirUnidade(unidade: Unidade, especialidade: string): UnidadeResumo | null {
  const linhas =
    especialidade === TODAS_ESPECIALIDADES
      ? unidade.atendimentos
      : unidade.atendimentos.filter((atendimento) => atendimento.especialidade === especialidade);

  if (linhas.length === 0) {
    return null;
  }

  const soma = linhas.reduce(
    (acumulado, linha) => ({
      aguardando: acumulado.aguardando + linha.pacientesAguardando,
      agendamentos: acumulado.agendamentos + linha.agendamentosHoje,
      faltas: acumulado.faltas + linha.faltasHoje,
      evitadas: acumulado.evitadas + linha.faltasEvitadas,
      vagas: acumulado.vagas + linha.vagasSalvas,
      esperaPonderada: acumulado.esperaPonderada + linha.esperaMinutos * linha.pacientesAguardando,
      espera: acumulado.espera + linha.esperaMinutos,
    }),
    {
      aguardando: 0,
      agendamentos: 0,
      faltas: 0,
      evitadas: 0,
      vagas: 0,
      esperaPonderada: 0,
      espera: 0,
    },
  );

  const esperaMinutos =
    soma.aguardando === 0
      ? Math.round(soma.espera / linhas.length)
      : Math.round(soma.esperaPonderada / soma.aguardando);

  const esperaPorModalidade = (
    campo: 'esperaComPlanoMinutos' | 'esperaSemPlanoMinutos',
  ): number | null => {
    const disponiveis = linhas.filter((linha) => linha[campo] !== null);
    if (disponiveis.length === 0) {
      return null;
    }

    const aguardando = disponiveis.reduce((total, linha) => total + linha.pacientesAguardando, 0);
    const total = disponiveis.reduce(
      (somaEspera, linha) => somaEspera + linha[campo]! * linha.pacientesAguardando,
      0,
    );

    return aguardando === 0
      ? Math.round(
          disponiveis.reduce((somaEspera, linha) => somaEspera + linha[campo]!, 0) /
            disponiveis.length,
        )
      : Math.round(total / aguardando);
  };

  return {
    id: unidade.id,
    nome: unidade.nome,
    municipio: unidade.municipio,
    tipo: unidade.tipo,
    bairro: unidade.bairro,
    posicao: unidade.posicao,
    imagem: unidade.imagem,
    planos: unidade.planos,
    atendeSemPlano: unidade.atendeSemPlano,
    online: unidade.online,
    ocupacaoPercentual: unidade.ocupacaoPercentual,
    contato: unidade.contato,
    esperaMinutos,
    esperaComPlanoMinutos: esperaPorModalidade('esperaComPlanoMinutos'),
    esperaSemPlanoMinutos: esperaPorModalidade('esperaSemPlanoMinutos'),
    pacientesAguardando: soma.aguardando,
    agendamentosHoje: soma.agendamentos,
    faltasHoje: soma.faltas,
    faltasEvitadas: soma.evitadas,
    vagasSalvas: soma.vagas,
    especialidades: linhas.map((linha) => linha.especialidade),
  };
}

export function resumirRede(
  unidades: readonly Unidade[],
  especialidade: string,
): readonly UnidadeResumo[] {
  return unidades
    .map((unidade) => resumirUnidade(unidade, especialidade))
    .filter((resumo): resumo is UnidadeResumo => resumo !== null);
}

export function calcularIndicadores(unidades: readonly UnidadeResumo[]): Indicadores {
  const total = unidades.length;
  const soma = unidades.reduce(
    (acumulado, unidade) => ({
      faltas: acumulado.faltas + unidade.faltasHoje,
      evitadas: acumulado.evitadas + unidade.faltasEvitadas,
      agendamentos: acumulado.agendamentos + unidade.agendamentosHoje,
      vagas: acumulado.vagas + unidade.vagasSalvas,
      espera: acumulado.espera + unidade.esperaMinutos,
      esperaComPlano: acumulado.esperaComPlano + (unidade.esperaComPlanoMinutos ?? 0),
      unidadesComPlano:
        acumulado.unidadesComPlano + (unidade.esperaComPlanoMinutos === null ? 0 : 1),
      esperaSemPlano: acumulado.esperaSemPlano + (unidade.esperaSemPlanoMinutos ?? 0),
      unidadesSemPlano:
        acumulado.unidadesSemPlano + (unidade.esperaSemPlanoMinutos === null ? 0 : 1),
      aguardando: acumulado.aguardando + unidade.pacientesAguardando,
      online: acumulado.online + (unidade.online ? 1 : 0),
    }),
    {
      faltas: 0,
      evitadas: 0,
      agendamentos: 0,
      vagas: 0,
      espera: 0,
      esperaComPlano: 0,
      unidadesComPlano: 0,
      esperaSemPlano: 0,
      unidadesSemPlano: 0,
      aguardando: 0,
      online: 0,
    },
  );

  return {
    pacientesFaltantes: soma.faltas,
    agendamentosHoje: soma.agendamentos,
    taxaAbsenteismo: soma.agendamentos === 0 ? 0 : (soma.faltas / soma.agendamentos) * 100,
    faltasEvitadas: soma.evitadas,
    taxaConfirmacao: soma.agendamentos === 0 ? 0 : (soma.evitadas / soma.agendamentos) * 100,
    vagasSalvas: soma.vagas,
    esperaMediaMinutos: total === 0 ? 0 : Math.round(soma.espera / total),
    esperaMediaComPlanoMinutos:
      soma.unidadesComPlano === 0 ? null : Math.round(soma.esperaComPlano / soma.unidadesComPlano),
    esperaMediaSemPlanoMinutos:
      soma.unidadesSemPlano === 0 ? null : Math.round(soma.esperaSemPlano / soma.unidadesSemPlano),
    unidadesOnline: soma.online,
    unidadesTotal: total,
    pacientesAguardando: soma.aguardando,
  };
}
