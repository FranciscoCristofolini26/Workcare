import { Injectable } from '@angular/core';
import {
  DiaOperacional,
  FluxoHora,
  PerfilOperacional,
  SerieOperacional,
} from '../models/gestao.model';
import { TipoUnidade, Unidade } from '../models/rede.model';
import { criarGeradorAleatorio } from '../utils/aleatorio';
import { OperacaoDataService, chaveDoDia } from './operacao-data.service';

interface ConfiguracaoTipo {
  /** Peso relativo da demanda em cada hora cheia; zero significa unidade fechada. */
  readonly curva: readonly number[];
  /** Entradas na hora de pico para cada especialidade ofertada. */
  readonly entradasPorEspecialidade: number;
  readonly permanenciaMinutos: number;
  readonly esperaBaseMinutos: number;
  /** Multiplicador da demanda por dia da semana, começando no domingo. */
  readonly fatorDiaSemana: readonly number[];
}

const FECHADO = 0;

const CONFIGURACOES: Record<TipoUnidade, ConfiguracaoTipo> = {
  UBS: {
    curva: [
      0, 0, 0, 0, 0, 0, 0, 0.7, 1, 0.95, 0.8, 0.6, 0.35, 0.7, 1, 0.85, 0.6, 0.3, 0, 0, 0, 0, 0, 0,
    ],
    entradasPorEspecialidade: 3,
    permanenciaMinutos: 40,
    esperaBaseMinutos: 26,
    fatorDiaSemana: [FECHADO, 1.15, 1.05, 1, 1, 0.95, FECHADO],
  },
  Policlínica: {
    curva: [
      0, 0, 0, 0, 0, 0, 0, 0.5, 0.9, 1, 0.9, 0.7, 0.4, 0.7, 0.95, 0.9, 0.8, 0.6, 0.4, 0.2, 0, 0, 0,
      0,
    ],
    entradasPorEspecialidade: 4,
    permanenciaMinutos: 55,
    esperaBaseMinutos: 34,
    fatorDiaSemana: [FECHADO, 1.12, 1.04, 1, 1, 0.96, 0.45],
  },
  'Pronto Atendimento': {
    curva: [
      0.25, 0.18, 0.14, 0.12, 0.12, 0.18, 0.3, 0.5, 0.8, 1, 0.95, 0.85, 0.7, 0.7, 0.8, 0.85, 0.9,
      0.95, 1, 0.95, 0.8, 0.6, 0.45, 0.32,
    ],
    entradasPorEspecialidade: 6,
    permanenciaMinutos: 105,
    esperaBaseMinutos: 62,
    fatorDiaSemana: [1.15, 1.2, 1, 0.95, 0.95, 1.05, 1.1],
  },
  Hospital: {
    curva: [
      0.3, 0.22, 0.18, 0.16, 0.16, 0.22, 0.35, 0.55, 0.85, 1, 0.95, 0.85, 0.7, 0.75, 0.85, 0.9, 0.9,
      0.85, 0.9, 0.85, 0.7, 0.55, 0.42, 0.34,
    ],
    entradasPorEspecialidade: 5,
    permanenciaMinutos: 185,
    esperaBaseMinutos: 78,
    fatorDiaSemana: [1.1, 1.18, 1.02, 0.96, 0.96, 1.04, 1.05],
  },
};

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

function semente(texto: string): number {
  let valor = 0x811c9dc5;
  for (let indice = 0; indice < texto.length; indice += 1) {
    valor = Math.imul(valor ^ texto.charCodeAt(indice), 0x01000193) >>> 0;
  }
  return valor;
}

@Injectable()
export class OperacaoMockService extends OperacaoDataService {
  private readonly cache = new Map<string, DiaOperacional>();

  override perfil(unidade: Unidade): PerfilOperacional {
    const configuracao = CONFIGURACOES[unidade.tipo];
    const especialidades = Math.max(1, unidade.atendimentos.length);
    const entradasPico = especialidades * configuracao.entradasPorEspecialidade;
    const permanenciaHoras = configuracao.permanenciaMinutos / 60;

    return {
      unidadeId: unidade.id,
      nome: unidade.nome,
      municipio: unidade.municipio,
      tipo: unidade.tipo,
      especialidades,
      permanenciaMediaMinutos: configuracao.permanenciaMinutos,
      capacidadeSimultanea: Math.max(4, Math.ceil(entradasPico * permanenciaHoras * 1.15)),
    };
  }

  override serie(unidade: Unidade, dias: readonly Date[]): SerieOperacional {
    const perfil = this.perfil(unidade);
    return {
      perfil,
      dias: dias.map((data) => this.dia(perfil, data)),
    };
  }

  private dia(perfil: PerfilOperacional, data: Date): DiaOperacional {
    const chave = `${perfil.unidadeId}|${chaveDoDia(data)}`;
    const guardado = this.cache.get(chave);
    if (guardado) {
      return guardado;
    }

    const gerado: DiaOperacional = {
      data,
      diaSemana: data.getDay(),
      fluxo: this.simular(perfil, data),
    };
    this.cache.set(chave, gerado);
    return gerado;
  }

  /**
   * Fila simples: cada hora recebe entradas conforme a curva do tipo de unidade e
   * libera uma fração dos presentes proporcional à permanência média.
   */
  private simular(perfil: PerfilOperacional, data: Date): readonly FluxoHora[] {
    const configuracao = CONFIGURACOES[perfil.tipo];
    const aleatorio = criarGeradorAleatorio(semente(`${perfil.unidadeId}|${chaveDoDia(data)}`));
    const fatorDia = configuracao.fatorDiaSemana[data.getDay()];
    const entradasPico = perfil.especialidades * configuracao.entradasPorEspecialidade;
    const taxaSaida = limitar(60 / configuracao.permanenciaMinutos, 0.18, 0.9);
    const vinteQuatroHoras = configuracao.curva[3] > 0;

    let presentes = vinteQuatroHoras ? Math.round(perfil.capacidadeSimultanea * 0.35) : 0;

    return configuracao.curva.map((peso, hora) => {
      const variacao = 0.85 + aleatorio.proximo() * 0.3;
      const entradas = Math.round(entradasPico * peso * fatorDia * variacao);
      presentes += entradas;

      const saidas = Math.min(
        presentes,
        Math.round(presentes * taxaSaida * (0.85 + aleatorio.proximo() * 0.3)),
      );
      presentes -= saidas;

      const ocupacao =
        perfil.capacidadeSimultanea === 0 ? 0 : presentes / perfil.capacidadeSimultanea;
      const esperaMinutos =
        entradas === 0
          ? 0
          : Math.round(
              limitar(
                configuracao.esperaBaseMinutos * (0.55 + 0.85 * Math.pow(ocupacao, 1.6)) * variacao,
                5,
                180,
              ),
            );

      return { hora, entradas, saidas, emAtendimento: presentes, esperaMinutos };
    });
  }
}
