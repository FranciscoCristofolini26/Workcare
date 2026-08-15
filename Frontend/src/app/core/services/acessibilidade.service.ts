import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

export type Tema = 'claro' | 'escuro';
export type TamanhoFonte = 'padrao' | 'grande' | 'maior';

const CHAVE_TEMA = 'carehub:tema';
const CHAVE_FONTE = 'carehub:fonte';

const ESCALA: readonly TamanhoFonte[] = ['padrao', 'grande', 'maior'];

@Injectable({ providedIn: 'root' })
export class AcessibilidadeService {
  private readonly documento = inject(DOCUMENT);

  readonly tema = signal<Tema>(this.temaInicial());
  readonly tamanhoFonte = signal<TamanhoFonte>(this.ler(CHAVE_FONTE, 'padrao'));

  constructor() {
    effect(() => {
      const raiz = this.documento.documentElement;
      raiz.dataset['tema'] = this.tema();
      raiz.dataset['fonte'] = this.tamanhoFonte();
      raiz.style.colorScheme = this.tema() === 'escuro' ? 'dark' : 'light';
      this.gravar(CHAVE_TEMA, this.tema());
      this.gravar(CHAVE_FONTE, this.tamanhoFonte());
    });
  }

  alternarTema(): void {
    this.tema.update((atual) => (atual === 'claro' ? 'escuro' : 'claro'));
  }

  aumentarFonte(): void {
    this.tamanhoFonte.update((atual) => {
      const indice = ESCALA.indexOf(atual);
      return ESCALA[Math.min(indice + 1, ESCALA.length - 1)];
    });
  }

  diminuirFonte(): void {
    this.tamanhoFonte.update((atual) => {
      const indice = ESCALA.indexOf(atual);
      return ESCALA[Math.max(indice - 1, 0)];
    });
  }

  restaurar(): void {
    this.tema.set(this.preferenciaDoSistema());
    this.tamanhoFonte.set('padrao');
  }

  private temaInicial(): Tema {
    const gravado = this.ler<Tema | ''>(CHAVE_TEMA, '');
    return gravado === 'claro' || gravado === 'escuro' ? gravado : this.preferenciaDoSistema();
  }

  private preferenciaDoSistema(): Tema {
    const janela = this.documento.defaultView;
    return typeof janela?.matchMedia === 'function' &&
      janela.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'escuro'
      : 'claro';
  }

  private ler<T extends string>(chave: string, padrao: T): T {
    try {
      return (this.documento.defaultView?.localStorage.getItem(chave) as T | null) ?? padrao;
    } catch {
      return padrao;
    }
  }

  private gravar(chave: string, valor: string): void {
    try {
      this.documento.defaultView?.localStorage.setItem(chave, valor);
    } catch {
      return;
    }
  }
}
