import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RedeStore } from '../../core/services/rede.store';
import { UnidadeResumo, nivelPorEspera } from '../../core/models/rede.model';
import { formatarMinutos } from '../../core/utils/formatacao';
import { rotuloNivel, tomNivel } from '../../core/utils/nivel';
import { MapaRede } from '../../shared/mapa-rede/mapa-rede';
import { Etiqueta } from '../../shared/ui/etiqueta/etiqueta';
import { Icone } from '../../shared/ui/icone/icone';

@Component({
  selector: 'app-unidades',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapaRede, Etiqueta, Icone],
  templateUrl: './unidades.html',
  styleUrl: './unidades.scss',
})
export class Unidades {
  protected readonly store = inject(RedeStore);
  protected readonly unidades = this.store.unidades;

  protected rotulo(unidade: UnidadeResumo): string {
    return rotuloNivel(nivelPorEspera(unidade.esperaMinutos));
  }

  protected tom(unidade: UnidadeResumo) {
    return tomNivel(nivelPorEspera(unidade.esperaMinutos));
  }

  protected espera(unidade: UnidadeResumo): string {
    return formatarMinutos(unidade.esperaMinutos);
  }

  protected selecionar(id: string | null): void {
    this.store.selecionarUnidade(id);
  }
}
