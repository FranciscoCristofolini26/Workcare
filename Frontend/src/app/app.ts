import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Cabecalho } from './layout/cabecalho/cabecalho';
import { Navegacao } from './layout/navegacao/navegacao';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Cabecalho, Navegacao],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly roteador = inject(Router);
  private readonly localizacao = inject(Location);
  private readonly urlAtual = toSignal(
    this.roteador.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.localizacao.path(true) || this.roteador.url },
  );

  protected readonly navegacaoAberta = signal(false);
  protected readonly paginaDeCadastro = computed(
    () => this.urlAtual().split(/[?#]/, 1)[0].replace(/\/$/, '') === '/cadastro',
  );

  protected alternarNavegacao(): void {
    this.navegacaoAberta.update((aberta) => !aberta);
  }

  protected fecharNavegacao(): void {
    this.navegacaoAberta.set(false);
  }
}
