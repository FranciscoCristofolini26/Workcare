import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  protected readonly navegacaoAberta = signal(false);

  protected alternarNavegacao(): void {
    this.navegacaoAberta.update((aberta) => !aberta);
  }

  protected fecharNavegacao(): void {
    this.navegacaoAberta.set(false);
  }
}
