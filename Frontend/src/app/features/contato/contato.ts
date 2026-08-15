import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RedeStore, TODAS_ESPECIALIDADES } from '../../core/services/rede.store';
import { UnidadeResumo, nivelPorEspera } from '../../core/models/rede.model';
import { apenasDigitos, formatarMinutos } from '../../core/utils/formatacao';
import { rotuloNivel, tomNivel } from '../../core/utils/nivel';
import { urlComoChegar } from '../../core/services/mapa.config';
import { Etiqueta } from '../../shared/ui/etiqueta/etiqueta';
import { Icone } from '../../shared/ui/icone/icone';
import { FiltroEspecialidade } from '../../shared/ui/filtro-especialidade/filtro-especialidade';

@Component({
  selector: 'app-contato',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Etiqueta, Icone, FiltroEspecialidade],
  templateUrl: './contato.html',
  styleUrl: './contato.scss',
})
export class Contato {
  protected readonly store = inject(RedeStore);

  protected readonly unidades = this.store.unidades;

  protected readonly especialidadeAtiva = computed(
    () => this.store.especialidade() !== TODAS_ESPECIALIDADES,
  );

  protected readonly recorte = computed(() => {
    const total = this.unidades().length;
    const contagem = total === 1 ? '1 unidade' : `${total} unidades`;
    return this.especialidadeAtiva()
      ? `${contagem} com atendimento em ${this.store.especialidade()}`
      : `${contagem} na rede monitorada`;
  });

  protected rotulo(unidade: UnidadeResumo): string {
    return rotuloNivel(nivelPorEspera(unidade.esperaMinutos));
  }

  protected tom(unidade: UnidadeResumo) {
    return tomNivel(nivelPorEspera(unidade.esperaMinutos));
  }

  protected espera(unidade: UnidadeResumo): string {
    return formatarMinutos(unidade.esperaMinutos);
  }

  protected minutos(valor: number): string {
    return formatarMinutos(valor);
  }

  protected tomMinutos(valor: number) {
    return tomNivel(nivelPorEspera(valor));
  }

  protected urlTelefone(unidade: UnidadeResumo): string {
    return `tel:+55${apenasDigitos(unidade.contato.telefone)}`;
  }

  protected urlWhatsapp(unidade: UnidadeResumo): string {
    return `https://wa.me/55${apenasDigitos(unidade.contato.whatsapp)}`;
  }

  protected urlEmail(unidade: UnidadeResumo): string {
    return `mailto:${unidade.contato.email}`;
  }

  protected comoChegar(unidade: UnidadeResumo): string {
    return urlComoChegar(unidade.posicao);
  }
}
