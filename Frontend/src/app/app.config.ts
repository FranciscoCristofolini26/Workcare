import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { INTERVALO_ATUALIZACAO, RedeDataService } from './core/services/rede-data.service';
import { RedeMockService } from './core/services/rede-mock.service';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: INTERVALO_ATUALIZACAO, useValue: environment.intervaloAtualizacaoMs },
    { provide: RedeDataService, useClass: RedeMockService },
  ],
};
