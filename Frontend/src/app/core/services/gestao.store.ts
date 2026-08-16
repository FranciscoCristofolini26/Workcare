import { Injectable, computed, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  DIAS_POR_PERIODO,
  PeriodoGestao,
  TODAS_UNIDADES,
  agregarDemanda,
  agregarFluxoHorario,
  alertasOperacionais,
  desempenhoPorUnidade,
  maioresPicos,
  resumirOperacao,
} from '../models/gestao.model';
import { REDE_VAZIA, Unidade } from '../models/rede.model';
import { EmpresaService } from './empresa.service';
import { OperacaoDataService, ultimosDias } from './operacao-data.service';
import { RedeDataService } from './rede-data.service';

/** Janela mínima para leitura de sazonalidade semanal, em dias. */
const JANELA_MINIMA_DEMANDA = 7;

@Injectable({ providedIn: 'root' })
export class GestaoStore {
  private readonly dados = inject(RedeDataService);
  private readonly operacao = inject(OperacaoDataService);
  private readonly empresaServico = inject(EmpresaService);

  private readonly snapshot = toSignal(this.dados.rede$, { initialValue: REDE_VAZIA });
  private readonly referencia = new Date();

  readonly empresa = this.empresaServico.empresa;
  readonly horaAtual = signal(this.referencia.getHours());
  readonly unidadeFiltro = signal<string>(TODAS_UNIDADES);
  readonly periodo = signal<PeriodoGestao>('hoje');

  readonly atualizadoEm = computed(() => this.snapshot().atualizadoEm);

  /** Unidades que a empresa autenticada administra, na ordem do catálogo da rede. */
  readonly unidadesDaEmpresa = computed<readonly Unidade[]>(() => {
    const ids = new Set(this.empresa()?.unidadeIds ?? []);
    return this.snapshot().unidades.filter((unidade) => ids.has(unidade.id));
  });

  readonly municipiosAtendidos = computed(() =>
    [...new Set(this.unidadesDaEmpresa().map((unidade) => unidade.municipio))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    ),
  );

  readonly unidadesEmFoco = computed<readonly Unidade[]>(() => {
    const filtro = this.unidadeFiltro();
    const unidades = this.unidadesDaEmpresa();
    return filtro === TODAS_UNIDADES
      ? unidades
      : unidades.filter((unidade) => unidade.id === filtro);
  });

  readonly rotuloFoco = computed(() => {
    const filtro = this.unidadeFiltro();
    if (filtro === TODAS_UNIDADES) {
      const total = this.unidadesDaEmpresa().length;
      return total === 1 ? '1 unidade administrada' : `${total} unidades administradas`;
    }
    return this.unidadesEmFoco()[0]?.nome ?? 'Unidade indisponível';
  });

  /**
   * Chave estável do recorte: evita recalcular os painéis a cada pulso de
   * atualização da rede, que altera indicadores de espera mas não o catálogo.
   */
  private readonly assinaturaFoco = computed(() =>
    this.unidadesEmFoco()
      .map((unidade) => `${unidade.id}:${unidade.tipo}:${unidade.atendimentos.length}`)
      .join('|'),
  );

  private readonly diasDaJanela = computed(() =>
    ultimosDias(this.referencia, DIAS_POR_PERIODO[this.periodo()]),
  );

  private readonly diasDaDemanda = computed(() =>
    ultimosDias(this.referencia, Math.max(JANELA_MINIMA_DEMANDA, DIAS_POR_PERIODO[this.periodo()])),
  );

  private readonly series = computed(() => {
    this.assinaturaFoco();
    const unidades = untracked(this.unidadesEmFoco);
    const dias = this.diasDaJanela();
    return unidades.map((unidade) => this.operacao.serie(unidade, dias));
  });

  private readonly seriesDemanda = computed(() => {
    this.assinaturaFoco();
    const unidades = untracked(this.unidadesEmFoco);
    const dias = this.diasDaDemanda();
    return unidades.map((unidade) => this.operacao.serie(unidade, dias));
  });

  readonly fluxoHorario = computed(() => agregarFluxoHorario(this.series()));
  readonly resumo = computed(() => resumirOperacao(this.series(), this.horaAtual()));
  readonly desempenho = computed(() => desempenhoPorUnidade(this.series()));
  readonly alertas = computed(() => alertasOperacionais(this.desempenho()));
  readonly demanda = computed(() => agregarDemanda(this.seriesDemanda()));
  readonly picos = computed(() => maioresPicos(this.demanda(), 5));
  readonly diasDaDemandaTotal = computed(() => this.diasDaDemanda().length);

  readonly capacidadeTotal = computed(() =>
    this.series().reduce((total, serie) => total + serie.perfil.capacidadeSimultanea, 0),
  );

  definirUnidade(id: string): void {
    this.unidadeFiltro.set(id);
  }

  definirPeriodo(periodo: PeriodoGestao): void {
    this.periodo.set(periodo);
  }
}
