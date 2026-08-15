import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { RedeSnapshot } from '../models/rede.model';

export abstract class RedeDataService {
  abstract readonly rede$: Observable<RedeSnapshot>;
  abstract reatribuirVaga(eventoId: string): void;
}

export const INTERVALO_ATUALIZACAO = new InjectionToken<number>('INTERVALO_ATUALIZACAO', {
  providedIn: 'root',
  factory: () => 5000,
});

export const SEMENTE_SIMULACAO = new InjectionToken<number>('SEMENTE_SIMULACAO', {
  providedIn: 'root',
  factory: () => 20260815,
});
