import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icone } from '../../shared/ui/icone/icone';

@Component({
  selector: 'app-boas-vindas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icone],
  templateUrl: './boas-vindas.html',
  styleUrl: './boas-vindas.scss',
})
export class BoasVindas {}
