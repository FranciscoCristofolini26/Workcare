import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  FiltroNivel,
  RedeStore,
  TODAS_ESPECIALIDADES,
  TODOS_MUNICIPIOS,
} from '../../core/services/rede.store';
import { NivelEspera, UnidadeResumo } from '../../core/models/rede.model';
import { LocalizacaoService } from '../../core/services/localizacao.service';
import {
  formatarHora,
  formatarLista,
  formatarMinutos,
  formatarNumero,
  formatarPercentual,
} from '../../core/utils/formatacao';
import { MapaRede } from '../../shared/mapa-rede/mapa-rede';
import { FiltroEspecialidade } from '../../shared/ui/filtro-especialidade/filtro-especialidade';
import { CartaoKpi } from '../../shared/ui/cartao-kpi/cartao-kpi';
import { Icone } from '../../shared/ui/icone/icone';

interface OpcaoNivel {
  valor: FiltroNivel;
  rotulo: string;
}

const OPCOES_NIVEL: readonly OpcaoNivel[] = [
  { valor: 'todos', rotulo: 'Todas' },
  { valor: 'baixa', rotulo: 'Espera baixa' },
  { valor: 'media', rotulo: 'Espera média' },
  { valor: 'alta', rotulo: 'Espera alta' },
];

@Component({
  selector: 'app-painel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapaRede, FiltroEspecialidade, Icone, CartaoKpi],
  templateUrl: './painel.html',
  styleUrl: './painel.scss',
})
export class Painel {
  protected readonly store = inject(RedeStore);
  protected readonly localizacao = inject(LocalizacaoService);
  private readonly documento = inject(DOCUMENT);
  private selecionarProximoAoLocalizar = false;
  private inicioArraste: number | null = null;
  private ignorarProximoClique = false;

  protected readonly situacaoExpandida = signal(false);
  protected readonly situacaoRecolhendo = signal(false);

  protected readonly opcoesNivel = OPCOES_NIVEL;
  protected readonly indicadores = this.store.indicadores;
  protected readonly unidades = this.store.unidades;
  protected readonly distribuicao = this.store.distribuicaoPorNivel;

  protected readonly esperaMedia = computed(() => this.indicadores().esperaMediaMinutos);
  protected readonly esperaMediaTexto = computed(() => formatarMinutos(this.esperaMedia()));
  protected readonly faltantes = computed(() =>
    formatarNumero(this.indicadores().pacientesFaltantes),
  );
  protected readonly absenteismo = computed(() =>
    formatarPercentual(this.indicadores().taxaAbsenteismo),
  );
  protected readonly vagasSalvas = computed(() => formatarNumero(this.indicadores().vagasSalvas));
  protected readonly faltasEvitadas = computed(() =>
    formatarNumero(this.indicadores().faltasEvitadas),
  );
  protected readonly confirmacao = computed(() =>
    formatarPercentual(this.indicadores().taxaConfirmacao),
  );
  protected readonly lotacaoMedia = computed(() => {
    const unidades = this.unidades();
    if (unidades.length === 0) {
      return 0;
    }

    return Math.round(
      unidades.reduce((total, unidade) => total + unidade.ocupacaoPercentual, 0) / unidades.length,
    );
  });

  protected readonly especialidadeAtiva = computed(
    () => this.store.especialidade() !== TODAS_ESPECIALIDADES,
  );

  protected readonly recorte = computed(() => {
    const total = this.indicadores().unidadesTotal;
    const unidades = total === 1 ? '1 unidade' : `${total} unidades`;
    return this.especialidadeAtiva()
      ? `${unidades} com ${this.store.especialidade()}`
      : `${unidades} monitoradas`;
  });

  /** Sem filtro de município, nomeia as cidades do recorte em vez de "toda a rede". */
  protected readonly municipioEmExibicao = computed(() => {
    const municipio = this.store.municipio();
    if (municipio !== TODOS_MUNICIPIOS) {
      return municipio;
    }

    const cidades = [
      ...new Set(this.store.unidadesDoMunicipio().map((unidade) => unidade.municipio)),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return cidades.length === 0 ? 'Toda a rede' : formatarLista(cidades);
  });

  protected readonly contextoKpi = computed(() =>
    this.especialidadeAtiva() ? ` em ${this.store.especialidade()}` : '',
  );

  protected readonly aproveitamento = computed(() => {
    const dados = this.indicadores();
    const base = dados.pacientesFaltantes + dados.vagasSalvas;
    return base === 0 ? 0 : (dados.vagasSalvas / base) * 100;
  });

  protected readonly tomEspera = computed(() => {
    const minutos = this.esperaMedia();
    if (minutos <= 30) {
      return 'sucesso' as const;
    }
    return minutos <= 60 ? ('alerta' as const) : ('perigo' as const);
  });

  protected readonly tomLotacao = computed(() => {
    const percentual = this.lotacaoMedia();
    if (percentual < 70) {
      return 'sucesso' as const;
    }
    return percentual < 90 ? ('alerta' as const) : ('perigo' as const);
  });

  protected readonly atualizadoEm = computed(() => formatarHora(this.store.atualizadoEm()));

  protected readonly resumoDistribuicao = computed(() => {
    const dados = this.distribuicao();
    return `${dados.baixa} unidades com espera baixa, ${dados.media} com espera média e ${dados.alta} com espera alta.`;
  });

  constructor() {
    effect(() => {
      const origem = this.localizacao.posicao();
      if (origem && this.selecionarProximoAoLocalizar) {
        this.selecionarProximoAoLocalizar = false;
        this.selecionarHospitalMaisProximo(origem);
      }
    });

    effect((limpar) => {
      const corpo = this.documento.body;
      corpo.classList.toggle('painel-bloqueado', this.situacaoExpandida());
      limpar(() => corpo.classList.remove('painel-bloqueado'));
    });
  }

  protected definirNivel(valor: FiltroNivel): void {
    this.store.definirNivel(valor);
  }

  protected selecionarUnidade(id: string | null): void {
    this.store.selecionarUnidade(id);
  }

  protected mostrarHospitalMaisProximo(): void {
    const origem = this.localizacao.posicao();
    if (!origem) {
      this.selecionarProximoAoLocalizar = true;
      if (this.localizacao.estado() !== 'buscando') {
        this.localizacao.buscar();
      }
      return;
    }

    this.selecionarHospitalMaisProximo(origem);
  }

  private selecionarHospitalMaisProximo(origem: { lat: number; lng: number }): void {
    const hospitais = this.hospitaisDisponiveis();
    let maisProximo = hospitais[0];
    if (!maisProximo) {
      return;
    }

    for (const hospital of hospitais.slice(1)) {
      if (this.distancia(origem, hospital.posicao) < this.distancia(origem, maisProximo.posicao)) {
        maisProximo = hospital;
      }
    }

    this.store.definirNivel('todos');
    this.selecionarUnidade(maisProximo.id);
  }

  protected mostrarHospitalComMenorFila(): void {
    const hospitais = this.hospitaisDisponiveis();
    let menorFila = hospitais[0];
    if (!menorFila) {
      return;
    }

    for (const hospital of hospitais.slice(1)) {
      if (hospital.esperaMinutos < menorFila.esperaMinutos) {
        menorFila = hospital;
      }
    }

    this.store.definirNivel('todos');
    this.selecionarUnidade(menorFila.id);
  }

  protected alternarSituacao(): void {
    if (this.ignorarProximoClique) {
      this.ignorarProximoClique = false;
      return;
    }
    if (this.situacaoExpandida()) {
      this.recolherSituacao();
    } else {
      this.expandirSituacao();
    }
  }

  protected iniciarArraste(evento: PointerEvent): void {
    this.inicioArraste = evento.clientY;
    (evento.currentTarget as HTMLElement).setPointerCapture?.(evento.pointerId);
  }

  protected finalizarArraste(evento: PointerEvent): void {
    if (this.inicioArraste === null) {
      return;
    }

    const deslocamento = evento.clientY - this.inicioArraste;
    this.inicioArraste = null;
    if (Math.abs(deslocamento) < 32) {
      return;
    }

    this.ignorarProximoClique = true;
    if (deslocamento < 0) {
      this.expandirSituacao();
    } else {
      this.recolherSituacao();
    }
  }

  protected cancelarArraste(): void {
    this.inicioArraste = null;
  }

  protected finalizarTransicao(evento: AnimationEvent): void {
    if (
      evento.target === evento.currentTarget &&
      evento.animationName === 'painel-folha-recolher' &&
      this.situacaoRecolhendo()
    ) {
      this.situacaoExpandida.set(false);
      this.situacaoRecolhendo.set(false);
    }
  }

  private expandirSituacao(): void {
    this.situacaoRecolhendo.set(false);
    this.situacaoExpandida.set(true);
  }

  private recolherSituacao(): void {
    if (this.situacaoExpandida()) {
      this.situacaoRecolhendo.set(true);
    }
  }

  private hospitaisDisponiveis(): readonly UnidadeResumo[] {
    const unidades = this.store.unidadesDoMunicipio();
    const hospitais = unidades.filter((unidade) => unidade.tipo === 'Hospital');
    return hospitais.length > 0 ? hospitais : unidades;
  }

  private distancia(
    origem: { lat: number; lng: number },
    destino: { lat: number; lng: number },
  ): number {
    return Math.hypot(origem.lat - destino.lat, origem.lng - destino.lng);
  }

  protected contagem(nivel: NivelEspera): number {
    return this.distribuicao()[nivel];
  }
}
