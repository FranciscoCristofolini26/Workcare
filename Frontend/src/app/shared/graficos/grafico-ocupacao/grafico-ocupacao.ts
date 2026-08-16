import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FluxoHora } from '../../../core/models/gestao.model';
import {
  ALTURA_GRAFICO,
  LARGURA_GRAFICO,
  LINHA_BASE,
  PLOT_LARGURA,
  PLOT_X,
  escalaAgradavel,
  marcasDoEixo,
  posicaoY,
  rotuloHora,
} from '../geometria';

interface PontoHora {
  hora: number;
  rotulo: string;
  x: number;
  y: number;
  faixaX: number;
  faixaLargura: number;
  emAtendimento: number;
  entradas: number;
  saidas: number;
  ocupacao: number;
  eixoVisivel: boolean;
}

@Component({
  selector: 'app-grafico-ocupacao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grafico-ocupacao.html',
  styleUrl: './grafico-ocupacao.scss',
})
export class GraficoOcupacao {
  readonly dados = input.required<readonly FluxoHora[]>();
  readonly capacidade = input<number>(0);
  readonly rotuloPeriodo = input<string>('média por dia');

  protected readonly larguraTotal = LARGURA_GRAFICO;
  protected readonly alturaTotal = ALTURA_GRAFICO;
  protected readonly linhaBase = LINHA_BASE;
  protected readonly plotX = PLOT_X;
  protected readonly plotLargura = PLOT_LARGURA;

  protected readonly indiceAtivo = signal<number | null>(null);

  private readonly horas = computed(() => {
    const dados = this.dados();
    const ativos = dados.filter((hora) => hora.entradas > 0 || hora.emAtendimento > 0);
    if (ativos.length === 0) {
      return dados;
    }

    const primeira = ativos[0].hora;
    const ultima = ativos[ativos.length - 1].hora;
    return dados.filter((hora) => hora.hora >= primeira && hora.hora <= ultima);
  });

  protected readonly topoEscala = computed(() =>
    escalaAgradavel(
      Math.max(
        this.capacidade(),
        this.horas().reduce((maior, hora) => Math.max(maior, hora.emAtendimento), 0),
      ),
    ),
  );

  protected readonly marcas = computed(() =>
    marcasDoEixo(this.topoEscala()).map((valor) => ({
      valor,
      y: posicaoY(valor, this.topoEscala()),
    })),
  );

  protected readonly pontos = computed<readonly PontoHora[]>(() => {
    const horas = this.horas();
    const topo = this.topoEscala();
    const capacidade = this.capacidade();
    const passo = PLOT_LARGURA / Math.max(1, horas.length - 1);
    const intervaloRotulo = horas.length > 16 ? 3 : horas.length > 10 ? 2 : 1;

    return horas.map((hora, indice) => {
      const x = PLOT_X + passo * indice;
      return {
        hora: hora.hora,
        rotulo: rotuloHora(hora.hora),
        x,
        y: posicaoY(hora.emAtendimento, topo),
        faixaX: x - passo / 2,
        faixaLargura: passo,
        emAtendimento: hora.emAtendimento,
        entradas: hora.entradas,
        saidas: hora.saidas,
        ocupacao: capacidade === 0 ? 0 : Math.round((hora.emAtendimento / capacidade) * 100),
        eixoVisivel: indice % intervaloRotulo === 0 || indice === horas.length - 1,
      };
    });
  });

  protected readonly caminhoLinha = computed(() =>
    this.pontos()
      .map((ponto, indice) => `${indice === 0 ? 'M' : 'L'}${ponto.x} ${ponto.y}`)
      .join(' '),
  );

  protected readonly caminhoArea = computed(() => {
    const pontos = this.pontos();
    if (pontos.length === 0) {
      return '';
    }

    const primeiro = pontos[0];
    const ultimo = pontos[pontos.length - 1];
    return `M${primeiro.x} ${LINHA_BASE} ${this.caminhoLinha().slice(1)} L${ultimo.x} ${LINHA_BASE} Z`;
  });

  protected readonly pico = computed(() =>
    this.pontos().reduce(
      (escolhido, ponto) => (ponto.emAtendimento > escolhido.emAtendimento ? ponto : escolhido),
      this.pontos()[0] ?? null,
    ),
  );

  protected readonly linhaCapacidade = computed(() =>
    this.capacidade() === 0 ? null : posicaoY(this.capacidade(), this.topoEscala()),
  );

  protected readonly ativo = computed(() => {
    const indice = this.indiceAtivo();
    return indice === null ? null : (this.pontos()[indice] ?? null);
  });

  protected readonly posicaoDica = computed(() => {
    const ativo = this.ativo();
    if (!ativo) {
      return 50;
    }
    return Math.min(88, Math.max(12, (ativo.x / LARGURA_GRAFICO) * 100));
  });

  protected readonly resumoAcessivel = computed(() => {
    const pico = this.pico();
    return `Pacientes em atendimento por hora. Pico de ${pico?.emAtendimento ?? 0} pacientes às ${pico?.rotulo ?? '00h'}, sobre capacidade de ${this.capacidade()} atendimentos simultâneos.`;
  });

  protected destacar(indice: number): void {
    this.indiceAtivo.set(indice);
  }

  protected limpar(): void {
    this.indiceAtivo.set(null);
  }

  protected navegar(evento: KeyboardEvent): void {
    const total = this.pontos().length;
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
