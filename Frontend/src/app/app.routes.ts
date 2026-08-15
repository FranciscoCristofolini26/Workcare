import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'painel' },
  {
    path: 'painel',
    title: 'Painel geral · CareHub',
    loadComponent: () => import('./features/painel/painel').then((m) => m.Painel),
  },
  {
    path: 'unidades',
    title: 'Unidades · CareHub',
    loadComponent: () => import('./features/unidades/unidades').then((m) => m.Unidades),
  },
  {
    path: 'relatorios',
    title: 'Relatórios · CareHub',
    loadComponent: () => import('./features/relatorios/relatorios').then((m) => m.Relatorios),
  },
  {
    path: 'contato',
    title: 'Contato · CareHub',
    loadComponent: () => import('./features/contato/contato').then((m) => m.Contato),
  },
  { path: '**', redirectTo: 'painel' },
];
