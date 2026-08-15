import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RedeStore } from '../../core/services/rede.store';
import { calcularIndicadores, nivelPorEspera } from '../../core/models/rede.model';
import { formatarMinutos, formatarPercentual } from '../../core/utils/formatacao';
import { rotuloNivel, tomNivel } from '../../core/utils/nivel';
import { Etiqueta } from '../../shared/ui/etiqueta/etiqueta';

@Component({
  selector: 'app-relatorios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Etiqueta],
  templateUrl: './relatorios.html',
  styleUrl: './relatorios.scss',
})
export class Relatorios {
  private readonly store = inject(RedeStore);

  protected readonly geral = this.store.indicadores;
  protected readonly distribuicao = this.store.distribuicaoPorNivel;

  protected readonly porMunicipio = computed(() => {
    const unidades = this.store.unidadesDoMunicipio();
    const municipios = [...new Set(unidades.map((unidade) => unidade.municipio))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    );

    return municipios.map((municipio) => {
      const doMunicipio = unidades.filter((unidade) => unidade.municipio === municipio);
      return { municipio, unidades: doMunicipio.length, indicadores: calcularIndicadores(doMunicipio) };
    });
  });

  protected readonly criticas = computed(() =>
    [...this.store.unidadesDoMunicipio()]
      .sort((a, b) => b.esperaMinutos - a.esperaMinutos)
      .slice(0, 5),
  );

  protected percentual(valor: number): string {
    return formatarPercentual(valor);
  }

  protected minutos(valor: number): string {
    return formatarMinutos(valor);
  }

  protected rotulo(minutos: number): string {
    return rotuloNivel(nivelPorEspera(minutos));
  }

  protected tom(minutos: number) {
    return tomNivel(nivelPorEspera(minutos));
  }
}
