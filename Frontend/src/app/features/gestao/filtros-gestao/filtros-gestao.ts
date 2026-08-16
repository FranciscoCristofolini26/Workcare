import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PeriodoGestao, ROTULO_PERIODO, TODAS_UNIDADES } from '../../../core/models/gestao.model';
import { GestaoStore } from '../../../core/services/gestao.store';
import { formatarHora } from '../../../core/utils/formatacao';

@Component({
  selector: 'app-filtros-gestao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filtros-gestao.html',
  styleUrl: './filtros-gestao.scss',
})
export class FiltrosGestao {
  protected readonly store = inject(GestaoStore);

  protected readonly todas = TODAS_UNIDADES;
  protected readonly periodos: readonly PeriodoGestao[] = ['hoje', '7dias', '30dias'];
  protected readonly rotulos = ROTULO_PERIODO;

  protected readonly unidades = this.store.unidadesDaEmpresa;
  protected readonly sincronizadoEm = computed(() => formatarHora(this.store.atualizadoEm()));

  protected aoTrocarUnidade(valor: string): void {
    this.store.definirUnidade(valor);
  }

  protected aoTrocarPeriodo(periodo: PeriodoGestao): void {
    this.store.definirPeriodo(periodo);
  }
}
