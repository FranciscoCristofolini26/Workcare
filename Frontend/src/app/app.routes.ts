import { inject } from '@angular/core';
import { RedirectFunction, Routes } from '@angular/router';
import { empresaGuard, semSessaoEmpresaGuard } from './core/guards/empresa.guard';
import { EmpresaService } from './core/services/empresa.service';
import { PerfilService } from './core/services/perfil.service';

const redirecionarInicio: RedirectFunction = () => {
  if (inject(EmpresaService).autenticada()) {
    return 'gestao';
  }
  return inject(PerfilService).perfil() ? 'painel' : 'bem-vindo';
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: redirecionarInicio },
  {
    path: 'bem-vindo',
    title: 'Bem-vindo · CareHub',
    loadComponent: () => import('./features/boas-vindas/boas-vindas').then((m) => m.BoasVindas),
  },
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
    path: 'contato',
    title: 'Contato · CareHub',
    loadComponent: () => import('./features/contato/contato').then((m) => m.Contato),
  },
  {
    path: 'cadastro',
    title: 'Cadastro · CareHub',
    loadComponent: () => import('./features/cadastro/cadastro').then((m) => m.Cadastro),
  },
  {
    path: 'empresa/entrar',
    title: 'Acesso corporativo · CareHub',
    canActivate: [semSessaoEmpresaGuard],
    loadComponent: () => import('./features/empresa/acesso/acesso').then((m) => m.Acesso),
  },
  {
    path: 'gestao',
    canActivate: [empresaGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Painel de gestão · CareHub',
        loadComponent: () =>
          import('./features/gestao/visao-geral/visao-geral').then((m) => m.VisaoGeral),
      },
      {
        path: 'fluxo',
        title: 'Fluxo de pacientes · CareHub',
        loadComponent: () => import('./features/gestao/fluxo/fluxo').then((m) => m.Fluxo),
      },
      {
        path: 'demanda',
        title: 'Horários de maior demanda · CareHub',
        loadComponent: () => import('./features/gestao/demanda/demanda').then((m) => m.Demanda),
      },
      {
        path: 'desempenho',
        title: 'Indicadores de desempenho · CareHub',
        loadComponent: () =>
          import('./features/gestao/desempenho/desempenho').then((m) => m.Desempenho),
      },
      {
        path: 'relatorios',
        title: 'Relatórios · CareHub',
        loadComponent: () => import('./features/relatorios/relatorios').then((m) => m.Relatorios),
      },
      {
        path: 'unidades',
        title: 'Unidades administradas · CareHub',
        loadComponent: () =>
          import('./features/gestao/unidades-empresa/unidades-empresa').then(
            (m) => m.UnidadesEmpresa,
          ),
      },
    ],
  },
  { path: 'relatorios', redirectTo: 'gestao/relatorios' },
  { path: 'login', redirectTo: 'bem-vindo' },
  { path: '**', redirectTo: 'painel' },
];
