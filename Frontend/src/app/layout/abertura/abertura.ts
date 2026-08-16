import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  output,
  signal,
} from '@angular/core';

/** Tempo total da tela de abertura, incluindo o desaparecimento. */
export const DURACAO_ABERTURA_MS = 3200;
const DURACAO_SAIDA_MS = 320;

@Component({
  selector: 'app-abertura',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './abertura.html',
  styleUrl: './abertura.scss',
})
export class Abertura {
  private readonly destruicao = inject(DestroyRef);

  readonly concluida = output<void>();
  protected readonly saindo = signal(false);

  constructor() {
    afterNextRender(() => {
      const saida = setTimeout(() => this.saindo.set(true), DURACAO_ABERTURA_MS - DURACAO_SAIDA_MS);
      const fim = setTimeout(() => this.concluida.emit(), DURACAO_ABERTURA_MS);

      this.destruicao.onDestroy(() => {
        clearTimeout(saida);
        clearTimeout(fim);
      });
    });
  }
}
