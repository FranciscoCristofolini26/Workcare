import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TomEtiqueta = 'sucesso' | 'alerta' | 'perigo' | 'neutro' | 'primario';

@Component({
  selector: 'app-etiqueta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="classe()">
      <span class="badge__marca"></span>
      <span><ng-content /></span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .badge--primario {
      background: var(--cor-primaria-suave);
      color: var(--cor-primaria-texto);
      border-color: var(--cor-primaria);
    }

    .badge--primario .badge__marca {
      background: var(--cor-primaria);
    }
  `,
})
export class Etiqueta {
  readonly tom = input<TomEtiqueta>('neutro');
  protected readonly classe = computed(() => `badge--${this.tom()}`);
}
