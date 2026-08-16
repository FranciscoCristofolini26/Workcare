import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FluxoHora } from '../../../core/models/gestao.model';
import {
  ALTURA_GRAFICO,
  LARGURA_GRAFICO,
  LINHA_BASE,
  PLOT_LARGURA,
  PLOT_X,
  alturaDaBarra,
  caminhoColuna,
  escalaAgradavel,
  marcasDoEixo,
  posicaoY,
  rotuloHora,
} from '../geometria';

interface ColunaHora {
  hora: number;
  rotulo: string;
  centro: number;
  faixaX: number;
  faixaLargura: number;
  entradas: number;
  saidas: number;
  emAtendimento: number;
  caminhoEntradas: string;
  caminhoSaidas: string;
  topoEntradas: number;
  eixoVisivel: boolean;
}

const LARGURA_MAXIMA_COLUNA = 24;
const ESPACO_ENTRE_COLUNAS = 2;

@Component({
  selector: 'app-grafico-fluxo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grafico-fluxo.html',
  styleUrl: './grafico-fluxo.scss',
})
export class GraficoFluxo {
  readonly dados = input.required<readonly FluxoHora[]>();
  readonly rotuloPeriodo = input<string>('média por dia');

  protected readonly larguraTotal = LARGURA_GRAFICO;
  protected readonly alturaTotal = ALTURA_GRAFICO;
  protected readonly linhaBase = LINHA_BASE;
  protected readonly plotX = PLOT_X;
  protected readonly plotLargura = PLOT_LARGURA;

  protected readonly indiceAtivo = signal<number | null>(null);

  /** Recorta o eixo ao intervalo em que a unidade realmente opera. */
  protected readonly horas = computed(() => {
    const dados = this.dados();
    const ativos = dados.filter((hora) => hora.entradas > 0 || hora.saidas > 0);
    if (ativos.length === 0) {
      return dados;
    }

    const primeira = ativos[0].hora;
    const ultima = ativos[ativos.length - 1].hora;
    return dados.filter((hora) => hora.hora >= primeira && hora.hora <= ultima);
  });

  protected readonly topoEscala = computed(() =>
    escalaAgradavel(
      this.horas().reduce((maior, hora) => Math.max(maior, hora.entradas, hora.saidas), 0),
    ),
  );

  protected readonly marcas = computed(() =>
    marcasDoEixo(this.topoEscala()).map((valor) => ({
      valor,
      y: posicaoY(valor, this.topoEscala()),
    })),
  );

  protected readonly colunas = computed<readonly ColunaHora[]>(() => {
    const horas = this.horas();
    const topo = this.topoEscala();
    const banda = PLOT_LARGURA / Math.max(1, horas.length);
    const larguraColuna = Math.min(
      LARGURA_MAXIMA_COLUNA,
      Math.max(3, (banda - 8 - ESPACO_ENTRE_COLUNAS) / 2),
    );
    const intervaloRotulo = horas.length > 16 ? 3 : horas.length > 10 ? 2 : 1;

    return horas.map((hora, indice) => {
      const faixaX = PLOT_X + banda * indice;
      const centro = faixaX + banda / 2;
      const xEntradas = centro - larguraColuna - ESPACO_ENTRE_COLUNAS / 2;
      const xSaidas = centro + ESPACO_ENTRE_COLUNAS / 2;
      const alturaEntradas = alturaDaBarra(hora.entradas, topo);

      return {
        hora: hora.hora,
        rotulo: rotuloHora(hora.hora),
        centro,
        faixaX,
        faixaLargura: banda,
        entradas: hora.entradas,
        saidas: hora.saidas,
        emAtendimento: hora.emAtendimento,
        caminhoEntradas: caminhoColuna(xEntradas, larguraColuna, alturaEntradas),
        caminhoSaidas: caminhoColuna(xSaidas, larguraColuna, alturaDaBarra(hora.saidas, topo)),
        topoEntradas: LINHA_BASE - alturaEntradas,
        eixoVisivel: indice % intervaloRotulo === 0 || indice === horas.length - 1,
      };
    });
  });

  /** Único rótulo direto do gráfico: o pico de entradas. */
  protected readonly indicePico = computed(() => {
    const colunas = this.colunas();
    return colunas.reduce(
      (escolhido, coluna, indice) =>
        coluna.entradas > colunas[escolhido].entradas ? indice : escolhido,
      0,
    );
  });

  protected readonly ativo = computed(() => {
    const indice = this.indiceAtivo();
    return indice === null ? null : (this.colunas()[indice] ?? null);
  });

  protected readonly posicaoDica = computed(() => {
    const ativo = this.ativo();
    if (!ativo) {
      return 50;
    }
    return Math.min(88, Math.max(12, (ativo.centro / LARGURA_GRAFICO) * 100));
  });

  protected readonly totalEntradas = computed(() =>
    this.horas().reduce((total, hora) => total + hora.entradas, 0),
  );

  protected readonly totalSaidas = computed(() =>
    this.horas().reduce((total, hora) => total + hora.saidas, 0),
  );

  protected readonly resumoAcessivel = computed(() => {
    const pico = this.colunas()[this.indicePico()];
    return `Entradas e saídas por hora. ${this.totalEntradas()} entradas e ${this.totalSaidas()} saídas, com pico de ${pico?.entradas ?? 0} entradas às ${pico?.rotulo ?? '00h'}.`;
  });

  protected destacar(indice: number): void {
    this.indiceAtivo.set(indice);
  }

  protected limpar(): void {
    this.indiceAtivo.set(null);
  }

  protected navegar(evento: KeyboardEvent): void {
    const total = this.colunas().length;
    if (total === 0) {
      return;
    }

    const atual = this.indiceAtivo();
    const destino =
      evento.key === 'ArrowRight'
        ? Math.min(total - 1, (atual ?? -1) + 1)
        : evento.key === 'ArrowLeft'
          ? Math.max(0, (atual ?? total) - 1)
          : evento.key === 'Home'
            ? 0
            : evento.key === 'End'
              ? total - 1
              : null;

    if (destino !== null) {
      evento.preventDefault();
      this.indiceAtivo.set(destino);
      return;
    }

    if (evento.key === 'Escape') {
      this.limpar();
    }
  }
}
