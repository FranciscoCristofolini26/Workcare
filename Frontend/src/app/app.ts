import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Abertura } from './layout/abertura/abertura';
import { Cabecalho } from './layout/cabecalho/cabecalho';
import { Navegacao } from './layout/navegacao/navegacao';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Cabecalho, Navegacao, Abertura],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly roteador = inject(Router);
  private readonly localizacao = inject(Location);
  private readonly documento = inject(DOCUMENT);
  private readonly destruicao = inject(DestroyRef);
  private readonly injetor = inject(Injector);
  private readonly cabecalho = viewChild(Cabecalho, { read: ElementRef });
  private readonly urlAtual = toSignal(
    this.roteador.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.localizacao.path(true) || this.roteador.url },
  );

  protected readonly navegacaoAberta = signal(false);
  protected readonly aberturaVisivel = signal(true);

  private readonly rotaAtual = computed(() =>
    this.urlAtual().split(/[?#]/, 1)[0].replace(/\/$/, ''),
  );

  /** Telas de entrada usam a área cheia, sem cabeçalho nem navegação lateral. */
  protected readonly paginaDeCadastro = computed(() => {
    const rota = this.rotaAtual();
    return rota === '/cadastro' || rota === '/empresa/entrar' || rota === '/bem-vindo';
  });

  /** Só o painel geral perde o respiro lateral no celular: o mapa ocupa a tela toda. */
  protected readonly paginaDoMapa = computed(() => {
    const rota = this.rotaAtual();
    return rota === '/painel' || rota === '';
  });

  constructor() {
    afterNextRender(() => this.acompanharAlturaDoCabecalho());
  }

  protected encerrarAbertura(): void {
    this.aberturaVisivel.set(false);
  }

  /**
   * O cabeçalho cresce conforme o conteúdo (linha de filtros, quebras de texto).
   * Sem medir, a barra lateral calcula a própria altura por um valor defasado e a
   * página passa da altura da tela, sobrando uma faixa vazia no rodapé.
   */
  private acompanharAlturaDoCabecalho(): void {
    const raiz = this.documento.documentElement;
    const janela = this.documento.defaultView;
    if (typeof janela?.ResizeObserver !== 'function') {
      return;
    }

    let ultimaAltura = 0;
    const observador = new janela.ResizeObserver(([entrada]) => {
      const altura = entrada?.target.getBoundingClientRect().height ?? 0;
      if (altura > 0 && Math.abs(altura - ultimaAltura) >= 1) {
        ultimaAltura = altura;
        raiz.style.setProperty('--altura-cabecalho-real', `${altura}px`);
      }
    });

    effect(
      (limpar) => {
        const elemento = this.cabecalho()?.nativeElement as HTMLElement | undefined;
        if (!elemento) {
          raiz.style.removeProperty('--altura-cabecalho-real');
          ultimaAltura = 0;
          return;
        }

        observador.observe(elemento);
        limpar(() => observador.unobserve(elemento));
      },
      { injector: this.injetor },
    );

    this.destruicao.onDestroy(() => {
      observador.disconnect();
      raiz.style.removeProperty('--altura-cabecalho-real');
    });
  }

  protected alternarNavegacao(): void {
    this.navegacaoAberta.update((aberta) => !aberta);
  }

  protected fecharNavegacao(): void {
    this.navegacaoAberta.set(false);
  }
}
