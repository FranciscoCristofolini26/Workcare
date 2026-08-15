import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AcessibilidadeService } from '../../core/services/acessibilidade.service';
import { Icone } from '../../shared/ui/icone/icone';

@Component({
  selector: 'app-controles-acessibilidade',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icone],
  template: `
    <div class="controles" role="group" aria-label="Aparência e acessibilidade">
      <button
        type="button"
        class="botao botao--pequeno controles__botao"
        [attr.aria-pressed]="temaEscuro()"
        [attr.aria-label]="rotuloTema()"
        (click)="acessibilidade.alternarTema()"
      >
        <app-icone [nome]="temaEscuro() ? 'sol' : 'lua'" [tamanho]="18" />
        <span class="controles__texto">{{ temaEscuro() ? 'Tema claro' : 'Tema escuro' }}</span>
      </button>

      <button
        type="button"
        class="botao botao--pequeno controles__botao"
        aria-label="Diminuir tamanho da fonte"
        (click)="acessibilidade.diminuirFonte()"
      >
        <app-icone nome="fonte" [tamanho]="16" />
        <span aria-hidden="true">A-</span>
      </button>

      <button
        type="button"
        class="botao botao--pequeno controles__botao"
        aria-label="Aumentar tamanho da fonte"
        (click)="acessibilidade.aumentarFonte()"
      >
        <app-icone nome="fonte" [tamanho]="20" />
        <span aria-hidden="true">A+</span>
      </button>

      <p class="visualmente-oculto" aria-live="polite">
        Tamanho da fonte {{ fonteAtual() }}. Tema {{ temaEscuro() ? 'escuro' : 'claro' }}.
      </p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .controles {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .controles__botao {
      flex: 0 0 auto;
    }

    @media (max-width: 84rem) {
      .controles__texto {
        display: none;
      }
    }
  `,
})
export class ControlesAcessibilidade {
  protected readonly acessibilidade = inject(AcessibilidadeService);

  protected readonly temaEscuro = computed(() => this.acessibilidade.tema() === 'escuro');

  protected readonly rotuloTema = computed(() =>
    this.temaEscuro() ? 'Mudar para tema claro' : 'Mudar para tema escuro',
  );

  protected readonly fonteAtual = computed(() => {
    const tamanho = this.acessibilidade.tamanhoFonte();
    return tamanho === 'padrao' ? 'padrão' : tamanho;
  });
}
