import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ROTULO_PERIODO } from '../../../core/models/gestao.model';
import { GestaoStore } from '../../../core/services/gestao.store';
import { formatarMinutos } from '../../../core/utils/formatacao';
import { GraficoFluxo } from '../../../shared/graficos/grafico-fluxo/grafico-fluxo';
import { GraficoOcupacao } from '../../../shared/graficos/grafico-ocupacao/grafico-ocupacao';
import { Etiqueta } from '../../../shared/ui/etiqueta/etiqueta';
import { FiltrosGestao } from '../filtros-gestao/filtros-gestao';

@Component({
  selector: 'app-gestao-fluxo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FiltrosGestao, GraficoFluxo, GraficoOcupacao, Etiqueta],
  templateUrl: './fluxo.html',
  styleUrl: './fluxo.scss',
})
export class Fluxo {
  protected readonly store = inject(GestaoStore);

  protected readonly resumo = this.store.resumo;
  protected readonly desempenho = this.store.desempenho;

  protected readonly rotuloPeriodo = computed(() =>
    ROTULO_PERIODO[this.store.periodo()].toLocaleLowerCase('pt-BR'),
  );

  protected readonly horaPicoTexto = computed(
    () => `${this.resumo().horaPico.toString().padStart(2, '0')}h`,
  );

  protected readonly horaValeTexto = computed(
    () => `${this.resumo().horaVale.toString().padStart(2, '0')}h`,
  );

  protected readonly giroTexto = computed(() =>
    formatarMinutos(this.resumo().permanenciaMediaMinutos),
  );

  protected saldo(entradas: number, saidas: number): number {
    return entradas - saidas;
  }

  protected minutos(valor: number): string {
    return formatarMinutos(valor);
  }
}
