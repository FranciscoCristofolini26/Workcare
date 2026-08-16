import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { META_ESPERA_MINUTOS, ROTULO_PERIODO } from '../../../core/models/gestao.model';
import { GestaoStore } from '../../../core/services/gestao.store';
import { formatarMinutos } from '../../../core/utils/formatacao';
import { Etiqueta, TomEtiqueta } from '../../../shared/ui/etiqueta/etiqueta';
import { FiltrosGestao } from '../filtros-gestao/filtros-gestao';

@Component({
  selector: 'app-gestao-desempenho',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FiltrosGestao, Etiqueta],
  templateUrl: './desempenho.html',
  styleUrl: './desempenho.scss',
})
export class Desempenho {
  protected readonly store = inject(GestaoStore);

  protected readonly meta = META_ESPERA_MINUTOS;
  protected readonly unidades = this.store.desempenho;
  protected readonly resumo = this.store.resumo;

  protected readonly rotuloPeriodo = computed(() =>
    ROTULO_PERIODO[this.store.periodo()].toLocaleLowerCase('pt-BR'),
  );

  protected readonly ranking = computed(() =>
    [...this.unidades()].sort((a, b) => b.dentroDaMetaPercentual - a.dentroDaMetaPercentual),
  );

  protected readonly metaMediaRede = computed(() => {
    const unidades = this.unidades();
    if (unidades.length === 0) {
      return 0;
    }
    return Math.round(
      unidades.reduce((total, unidade) => total + unidade.dentroDaMetaPercentual, 0) /
        unidades.length,
    );
  });

  protected minutos(valor: number): string {
    return formatarMinutos(valor);
  }

  protected tomEspera(minutos: number): TomEtiqueta {
    if (minutos <= 30) {
      return 'sucesso';
    }
    return minutos <= META_ESPERA_MINUTOS ? 'alerta' : 'perigo';
  }

  protected tomOcupacao(percentual: number): TomEtiqueta {
    if (percentual < 75) {
      return 'sucesso';
    }
    return percentual < 90 ? 'alerta' : 'perigo';
  }

  protected classeMedidor(percentual: number): string {
    if (percentual >= 85) {
      return 'medidor__preenchimento--sucesso';
    }
    return percentual >= 70 ? 'medidor__preenchimento--alerta' : 'medidor__preenchimento--perigo';
  }
}
