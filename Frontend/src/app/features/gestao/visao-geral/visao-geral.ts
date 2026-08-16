import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  META_ESPERA_MINUTOS,
  NOMES_DIA_SEMANA,
  ROTULO_PERIODO,
  formatarFaixaHoraria,
} from '../../../core/models/gestao.model';
import { GestaoStore } from '../../../core/services/gestao.store';
import { formatarMinutos, formatarNumero } from '../../../core/utils/formatacao';
import { GraficoFluxo } from '../../../shared/graficos/grafico-fluxo/grafico-fluxo';
import { CartaoKpi } from '../../../shared/ui/cartao-kpi/cartao-kpi';
import { Etiqueta } from '../../../shared/ui/etiqueta/etiqueta';
import { FiltrosGestao } from '../filtros-gestao/filtros-gestao';

@Component({
  selector: 'app-gestao-visao-geral',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FiltrosGestao, GraficoFluxo, CartaoKpi, Etiqueta],
  templateUrl: './visao-geral.html',
  styleUrl: './visao-geral.scss',
})
export class VisaoGeral {
  protected readonly store = inject(GestaoStore);

  protected readonly metaEspera = META_ESPERA_MINUTOS;
  protected readonly resumo = this.store.resumo;
  protected readonly alertas = this.store.alertas;

  protected readonly rotuloPeriodo = computed(() =>
    ROTULO_PERIODO[this.store.periodo()].toLocaleLowerCase('pt-BR'),
  );

  protected readonly subtitulo = computed(() => {
    const municipios = this.store.municipiosAtendidos();
    const recorte = this.store.rotuloFoco();
    return municipios.length === 0 ? recorte : `${recorte} · ${municipios.join(', ')}`;
  });

  protected readonly entradas = computed(() => formatarNumero(this.resumo().entradasPorDia));
  protected readonly saidas = computed(() => formatarNumero(this.resumo().saidasPorDia));

  protected readonly saldo = computed(
    () => this.resumo().entradasPorDia - this.resumo().saidasPorDia,
  );

  protected readonly esperaTexto = computed(() =>
    formatarMinutos(this.resumo().esperaMediaMinutos),
  );
  protected readonly permanenciaTexto = computed(() =>
    formatarMinutos(this.resumo().permanenciaMediaMinutos),
  );

  protected readonly tomOcupacao = computed(() => {
    const ocupacao = this.resumo().ocupacaoPicoPercentual;
    if (ocupacao < 75) {
      return 'sucesso' as const;
    }
    return ocupacao < 90 ? ('alerta' as const) : ('perigo' as const);
  });

  protected readonly tomEspera = computed(() => {
    const espera = this.resumo().esperaMediaMinutos;
    if (espera <= 30) {
      return 'sucesso' as const;
    }
    return espera <= META_ESPERA_MINUTOS ? ('alerta' as const) : ('perigo' as const);
  });

  protected readonly picosPrincipais = computed(() => this.store.picos().slice(0, 3));

  protected diaSemana(indice: number): string {
    return NOMES_DIA_SEMANA[indice];
  }

  protected faixa(hora: number): string {
    return formatarFaixaHoraria(hora);
  }
}
