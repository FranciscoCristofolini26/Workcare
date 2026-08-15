import { NivelEspera, TipoEvento } from '../models/rede.model';
import { TomEtiqueta } from '../../shared/ui/etiqueta/etiqueta';

export const CORES_NIVEL: Record<NivelEspera, string> = {
  baixa: '#16a34a',
  media: '#d97706',
  alta: '#dc2626',
};

export function rotuloNivel(nivel: NivelEspera): string {
  switch (nivel) {
    case 'baixa':
      return 'Espera baixa';
    case 'media':
      return 'Espera média';
    default:
      return 'Espera alta';
  }
}

export function tomNivel(nivel: NivelEspera): TomEtiqueta {
  switch (nivel) {
    case 'baixa':
      return 'sucesso';
    case 'media':
      return 'alerta';
    default:
      return 'perigo';
  }
}

export function rotuloEvento(tipo: TipoEvento): string {
  switch (tipo) {
    case 'cancelado':
      return 'Cancelado';
    case 'confirmado':
      return 'Confirmado';
    default:
      return 'Reatribuído';
  }
}

export function tomEvento(tipo: TipoEvento): TomEtiqueta {
  switch (tipo) {
    case 'cancelado':
      return 'perigo';
    case 'confirmado':
      return 'sucesso';
    default:
      return 'primario';
  }
}
