import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { NivelEspera, UnidadeResumo, nivelPorEspera } from '../../core/models/rede.model';
import { CONFIGURACAO_MAPA, urlComoChegar } from '../../core/services/mapa.config';
import { DistanciaRota, LocalizacaoService } from '../../core/services/localizacao.service';
import { CORES_NIVEL, rotuloNivel, tomNivel } from '../../core/utils/nivel';
import { formatarMinutos } from '../../core/utils/formatacao';
import { Etiqueta } from '../ui/etiqueta/etiqueta';
import { Icone } from '../ui/icone/icone';

const CENTRO_PADRAO: L.LatLngExpression = [-26.87, -49.17];

@Component({
  selector: 'app-mapa-rede',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [Etiqueta, Icone],
  host: { '[style.--altura-mapa]': 'altura()' },
  templateUrl: './mapa-rede.html',
  styleUrl: './mapa-rede.scss',
})
export class MapaRede {
  private readonly configuracao = inject(CONFIGURACAO_MAPA);
  protected readonly localizacao = inject(LocalizacaoService);
  private readonly destruicao = inject(DestroyRef);
  private readonly injetor = inject(Injector);

  readonly unidades = input.required<readonly UnidadeResumo[]>();
  readonly selecionadaId = input<string | null>(null);
  readonly altura = input<string>('26rem');

  readonly selecionar = output<string | null>();

  private readonly tela = viewChild.required<ElementRef<HTMLElement>>('tela');
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  private readonly mapa = signal<L.Map | null>(null);
  protected readonly distancia = signal<DistanciaRota | null>(null);
  protected readonly calculandoDistancia = signal(false);
  private readonly marcadores = new Map<string, L.Marker>();
  private marcadorUsuario: L.CircleMarker | null = null;
  private areaPrecisao: L.Circle | null = null;
  private consultaDistancia: AbortController | null = null;

  private chaveEnquadramento = '';
  private chaveCentralizacao = '';
  private chaveDistancia = '';

  protected readonly detalhe = computed(() => {
    const id = this.selecionadaId();
    return id === null ? null : (this.unidades().find((unidade) => unidade.id === id) ?? null);
  });

  constructor() {
    afterNextRender(() => this.criarMapa());

    effect(() => {
      const mapa = this.mapa();
      const unidades = this.unidades();
      if (mapa) {
        this.sincronizarMarcadores(mapa, unidades);
      }
    });

    effect(() => {
      const mapa = this.mapa();
      const posicao = this.localizacao.posicao();
      const precisao = this.localizacao.precisaoMetros();
      const origem = this.localizacao.origem();
      if (mapa && posicao) {
        this.mostrarLocalizacao(mapa, posicao, precisao, origem);
      }
    });

    effect(() => {
      const unidade = this.detalhe();
      const origem = this.localizacao.posicao();
      void this.atualizarDistancia(unidade, origem);
    });

    effect(() => {
      this.detalhe();
      afterNextRender(() => this.sincronizarDialogo(), { injector: this.injetor });
    });

    this.destruicao.onDestroy(() => {
      this.mapa()?.remove();
      this.consultaDistancia?.abort();
      this.marcadores.clear();
    });
  }

  private criarMapa(): void {
    const mapa = L.map(this.tela().nativeElement, {
      center: CENTRO_PADRAO,
      zoom: this.configuracao.zoomInicial,
      scrollWheelZoom: false,
      keyboard: true,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(this.configuracao.urlTiles, {
      attribution: this.configuracao.atribuicao,
      maxZoom: this.configuracao.zoomMaximo,
    }).addTo(mapa);

    this.mapa.set(mapa);
    if (this.localizacao.estado() === 'inicial') {
      this.localizacao.buscar();
    }
  }

  protected centralizarNaMinhaLocalizacao(): void {
    const posicao = this.localizacao.posicao();
    const mapa = this.mapa();
    if (!posicao || this.localizacao.origem() === 'endereco-padrao') {
      this.localizacao.buscar();
      return;
    }
    mapa?.setView([posicao.lat, posicao.lng], Math.max(mapa.getZoom(), 15), { animate: true });
  }

  private mostrarLocalizacao(
    mapa: L.Map,
    posicao: { lat: number; lng: number },
    precisao: number | null,
    origem: 'endereco-padrao' | 'localizacao-atual' | null,
  ): void {
    const coordenada: L.LatLngExpression = [posicao.lat, posicao.lng];
    const titulo = origem === 'endereco-padrao' ? 'Seu endereço cadastrado' : 'Você está aqui';
    if (!this.marcadorUsuario) {
      this.marcadorUsuario = L.circleMarker(coordenada, {
        radius: 9,
        color: '#ffffff',
        weight: 3,
        fillColor: '#2563eb',
        fillOpacity: 1,
        className: 'marcador-usuario',
      })
        .bindTooltip(titulo, { direction: 'top', offset: [0, -8] })
        .addTo(mapa);
    } else {
      this.marcadorUsuario.setLatLng(coordenada);
      this.marcadorUsuario.setTooltipContent(titulo);
    }

    if (precisao !== null) {
      if (!this.areaPrecisao) {
        this.areaPrecisao = L.circle(coordenada, {
          radius: precisao,
          color: '#2563eb',
          weight: 1,
          opacity: 0.45,
          fillColor: '#60a5fa',
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(mapa);
      } else {
        this.areaPrecisao.setLatLng(coordenada).setRadius(precisao);
      }
    }

    const chave = `${posicao.lat}:${posicao.lng}`;
    if (chave !== this.chaveCentralizacao) {
      this.chaveCentralizacao = chave;
      mapa.setView(coordenada, 15, { animate: true });
    }
  }

  private async atualizarDistancia(
    unidade: UnidadeResumo | null,
    origem: { lat: number; lng: number } | null,
  ): Promise<void> {
    if (!unidade || !origem) {
      this.consultaDistancia?.abort();
      this.consultaDistancia = null;
      this.chaveDistancia = '';
      this.distancia.set(null);
      this.calculandoDistancia.set(false);
      return;
    }

    const chave = `${origem.lat}:${origem.lng}:${unidade.id}`;
    if (chave === this.chaveDistancia) {
      return;
    }

    this.consultaDistancia?.abort();
    this.consultaDistancia = null;
    this.chaveDistancia = chave;
    const controle = new AbortController();
    this.consultaDistancia = controle;
    this.distancia.set(null);
    this.calculandoDistancia.set(true);

    try {
      const distancia = await this.localizacao.calcularDistancia(
        origem,
        unidade.posicao,
        controle.signal,
      );
      if (!controle.signal.aborted) {
        this.distancia.set(distancia);
      }
    } catch (erro) {
      if (!controle.signal.aborted) {
        this.distancia.set(null);
      }
    } finally {
      if (!controle.signal.aborted) {
        this.calculandoDistancia.set(false);
      }
    }
  }

  private sincronizarDialogo(): void {
    const dialogo = this.dialogo().nativeElement;
    if (this.detalhe()) {
      if (!dialogo.open) {
        dialogo.showModal();
      }
    } else if (dialogo.open) {
      dialogo.close();
    }
  }

  protected fecharDetalhe(evento?: Event): void {
    evento?.preventDefault();
    this.selecionar.emit(null);
  }

  protected fecharAoClicarFora(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) {
      this.fecharDetalhe();
    }
  }

  private sincronizarMarcadores(mapa: L.Map, unidades: readonly UnidadeResumo[]): void {
    const vistos = new Set<string>();

    for (const unidade of unidades) {
      vistos.add(unidade.id);
      const existente = this.marcadores.get(unidade.id);
      if (existente) {
        existente.setLatLng([unidade.posicao.lat, unidade.posicao.lng]);
        this.atualizarElemento(existente, unidade);
      } else {
        this.marcadores.set(unidade.id, this.criarMarcador(mapa, unidade));
      }
    }

    for (const [id, marcador] of this.marcadores) {
      if (!vistos.has(id)) {
        marcador.remove();
        this.marcadores.delete(id);
      }
    }

    this.enquadrar(mapa, unidades);
  }

  private criarMarcador(mapa: L.Map, unidade: UnidadeResumo): L.Marker {
    const marcador = L.marker([unidade.posicao.lat, unidade.posicao.lng], {
      keyboard: true,
      icon: L.divIcon({
        className: 'marcador-unidade',
        html: '<span class="marcador-unidade__numero"></span>',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -26],
      }),
    });

    marcador.on('click keypress', () => this.selecionar.emit(unidade.id));
    /* O balão traz só o nome; os números ficam no marcador e no detalhe da unidade. */
    marcador.bindTooltip(unidade.nome, {
      direction: 'top',
      offset: [0, -28],
      opacity: 1,
      className: 'tooltip-unidade',
    });
    /* Abre sozinho no hover e no foco; ao clicar sai de cena para não ficar sob o modal. */
    marcador.on('click', () => marcador.closeTooltip());
    marcador.addTo(mapa);
    this.atualizarElemento(marcador, unidade);

    return marcador;
  }

  private atualizarElemento(marcador: L.Marker, unidade: UnidadeResumo): void {
    const elemento = marcador.getElement();
    if (!elemento) {
      return;
    }

    const nivel = this.nivel(unidade);
    const titulo = this.tituloMarcador(unidade);

    elemento.dataset['nivel'] = nivel;
    elemento.style.setProperty('--cor-marcador', CORES_NIVEL[nivel]);
    elemento.setAttribute('role', 'button');
    /* A descrição completa fica para a leitura assistiva; o balão mostra só o nome. */
    elemento.setAttribute('aria-label', titulo);
    elemento.removeAttribute('title');
    marcador.setTooltipContent(unidade.nome);

    const numero = elemento.firstElementChild;
    if (numero) {
      numero.textContent = String(unidade.pacientesAguardando);
    }
  }

  private enquadrar(mapa: L.Map, unidades: readonly UnidadeResumo[]): void {
    if (unidades.length === 0) {
      return;
    }

    const chave = unidades
      .map((unidade) => unidade.id)
      .sort()
      .join('|');

    if (chave === this.chaveEnquadramento) {
      return;
    }

    this.chaveEnquadramento = chave;
    const limites = L.latLngBounds(
      unidades.map((unidade) => [unidade.posicao.lat, unidade.posicao.lng] as L.LatLngTuple),
    );
    mapa.fitBounds(limites, { padding: [48, 48], maxZoom: 14 });
  }

  protected nivel(unidade: UnidadeResumo): NivelEspera {
    return nivelPorEspera(unidade.esperaMinutos);
  }

  protected rotulo(unidade: UnidadeResumo): string {
    return rotuloNivel(this.nivel(unidade));
  }

  protected tom(unidade: UnidadeResumo) {
    return tomNivel(this.nivel(unidade));
  }

  protected tomEspera(minutos: number) {
    return tomNivel(nivelPorEspera(minutos));
  }

  protected espera(minutos: number): string {
    return formatarMinutos(minutos);
  }

  protected tituloMarcador(unidade: UnidadeResumo): string {
    const esperas = [
      unidade.esperaComPlanoMinutos === null
        ? null
        : `com plano: ${this.espera(unidade.esperaComPlanoMinutos)}`,
      unidade.esperaSemPlanoMinutos === null
        ? null
        : `sem plano: ${this.espera(unidade.esperaSemPlanoMinutos)}`,
    ].filter((valor): valor is string => valor !== null);
    return `${unidade.nome}. Espera ${esperas.join('; ')}. ${unidade.pacientesAguardando} pacientes aguardando.`;
  }

  protected especialidadesResumidas(unidade: UnidadeResumo): string {
    const lista = unidade.especialidades;
    return lista.length <= 3
      ? lista.join(', ')
      : `${lista.slice(0, 3).join(', ')} +${lista.length - 3}`;
  }

  protected comoChegar(unidade: UnidadeResumo): string {
    return urlComoChegar(unidade.posicao, this.localizacao.posicao() ?? undefined);
  }

  protected formatarDistancia(distancia: DistanciaRota): string {
    if (distancia.metros < 1000) {
      return `${Math.round(distancia.metros / 10) * 10} m`;
    }
    return `${(distancia.metros / 1000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} km`;
  }
}
