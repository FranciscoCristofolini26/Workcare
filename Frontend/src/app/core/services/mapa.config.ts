import { InjectionToken } from '@angular/core';
import { Coordenada } from '../models/rede.model';
import { environment } from '../../../environments/environment';

export interface ConfiguracaoMapa {
  urlTiles: string;
  atribuicao: string;
  zoomMaximo: number;
  zoomInicial: number;
}

export const CONFIGURACAO_MAPA = new InjectionToken<ConfiguracaoMapa>('CONFIGURACAO_MAPA', {
  providedIn: 'root',
  factory: () => environment.mapa,
});

export function urlComoChegar(destino: Coordenada, origem?: Coordenada): string {
  const parametros = new URLSearchParams({
    engine: 'fossgis_osrm_car',
    route: origem
      ? `${origem.lat},${origem.lng};${destino.lat},${destino.lng}`
      : `;${destino.lat},${destino.lng}`,
  });
  return `https://www.openstreetmap.org/directions?${parametros.toString()}`;
}
