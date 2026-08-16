import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FiltroNivel, RedeStore, TODAS_ESPECIALIDADES } from '../../core/services/rede.store';
import { NivelEspera } from '../../core/models/rede.model';
import { formatarHora, formatarMinutos } from '../../core/utils/formatacao';
import { MapaRede } from '../../shared/mapa-rede/mapa-rede';
import { FiltroEspecialidade } from '../../shared/ui/filtro-especialidade/filtro-especialidade';

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
  imports: [MapaRede, FiltroEspecialidade],
  templateUrl: './painel.html',
  styleUrl: './painel.scss',
})
export class Painel {
  protected readonly store = inject(RedeStore);

  protected readonly opcoesNivel = OPCOES_NIVEL;
  protected readonly indicadores = this.store.indicadores;
  protected readonly unidades = this.store.unidades;
  protected readonly distribuicao = this.store.distribuicaoPorNivel;

  protected readonly esperaMedia = computed(() => this.indicadores().esperaMediaMinutos);
  protected readonly esperaMediaTexto = computed(() => formatarMinutos(this.esperaMedia()));
  protected readonly lotacaoMedia = computed(() => {
    const unidades = this.unidades();
    if (unidades.length === 0) {
      return 0;
    }

    return Math.round(
      unidades.reduce((total, unidade) => total + unidade.ocupacaoPercentual, 0) /
        unidades.length,
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

  protected definirNivel(valor: FiltroNivel): void {
    this.store.definirNivel(valor);
  }

  protected selecionarUnidade(id: string | null): void {
    this.store.selecionarUnidade(id);
  }

  protected contagem(nivel: NivelEspera): number {
    return this.distribuicao()[nivel];
  }
}
