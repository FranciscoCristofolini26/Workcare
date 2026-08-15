import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RedeStore, TODAS_ESPECIALIDADES } from '../../../core/services/rede.store';

@Component({
  selector: 'app-filtro-especialidade',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="campo">
      <label class="campo__rotulo" [attr.for]="idCampo()">Especialidade</label>
      <select
        class="campo__controle"
        [id]="idCampo()"
        [value]="store.especialidade()"
        (change)="aoTrocar($any($event.target).value)"
      >
        <option [value]="todas">Todas as especialidades</option>
        @for (especialidade of store.especialidades(); track especialidade) {
          <option [value]="especialidade">{{ especialidade }}</option>
        }
      </select>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 16rem;
    }

    .campo__controle {
      width: 100%;
    }
  `,
})
export class FiltroEspecialidade {
  protected readonly store = inject(RedeStore);
  protected readonly todas = TODAS_ESPECIALIDADES;

  readonly idCampo = input<string>('filtro-especialidade');

  protected aoTrocar(valor: string): void {
    this.store.definirEspecialidade(valor);
  }
}
