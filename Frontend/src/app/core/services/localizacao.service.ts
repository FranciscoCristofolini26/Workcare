import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { Coordenada } from '../models/rede.model';

export type EstadoLocalizacao = 'inicial' | 'buscando' | 'encontrada' | 'indisponivel';
export type OrigemLocalizacao = 'endereco-padrao' | 'localizacao-atual';

export interface DistanciaRota {
  metros: number;
  origem: 'rota' | 'linha-reta';
}

interface LocalizacaoPadrao {
  posicao: Coordenada;
  rotulo: string;
}

const CHAVE_LOCALIZACAO_PADRAO = 'carehub.localizacao-padrao';

interface RespostaOsrm {
  code?: string;
  routes?: Array<{ distance?: number }>;
}

@Injectable({ providedIn: 'root' })
export class LocalizacaoService {
  private readonly documento = inject(DOCUMENT);
  private readonly janela = this.documento.defaultView;

  readonly posicao = signal<Coordenada | null>(null);
  readonly precisaoMetros = signal<number | null>(null);
  readonly estado = signal<EstadoLocalizacao>('inicial');
  readonly mensagem = signal('');
  readonly origem = signal<OrigemLocalizacao | null>(null);
  readonly rotulo = signal('');

  constructor() {
    this.carregarLocalizacaoPadrao();
  }

  definirLocalizacaoPadrao(posicao: Coordenada, rotulo: string): void {
    const localizacao: LocalizacaoPadrao = { posicao, rotulo };
    this.janela?.localStorage.setItem(CHAVE_LOCALIZACAO_PADRAO, JSON.stringify(localizacao));
    this.posicao.set(posicao);
    this.precisaoMetros.set(null);
    this.origem.set('endereco-padrao');
    this.rotulo.set(rotulo);
    this.estado.set('encontrada');
    this.mensagem.set('Endereço cadastrado definido como localização padrão.');
  }

  /** Descarta o endereço salvo; usado ao encerrar a sessão do paciente. */
  limparLocalizacaoPadrao(): void {
    this.janela?.localStorage.removeItem(CHAVE_LOCALIZACAO_PADRAO);
    if (this.origem() !== 'localizacao-atual') {
      this.posicao.set(null);
      this.precisaoMetros.set(null);
      this.origem.set(null);
      this.rotulo.set('');
      this.estado.set('inicial');
      this.mensagem.set('');
    }
  }

  buscar(): void {
    const geolocalizacao = this.documento.defaultView?.navigator.geolocation;
    if (!geolocalizacao) {
      this.estado.set('indisponivel');
      this.mensagem.set('A localização não está disponível neste navegador.');
      return;
    }

    this.estado.set('buscando');
    this.mensagem.set('Buscando sua localização…');
    geolocalizacao.getCurrentPosition(
      ({ coords }) => {
        this.posicao.set({ lat: coords.latitude, lng: coords.longitude });
        this.precisaoMetros.set(Number.isFinite(coords.accuracy) ? coords.accuracy : null);
        this.origem.set('localizacao-atual');
        this.rotulo.set('Sua localização atual');
        this.estado.set('encontrada');
        this.mensagem.set('Mapa centralizado na sua localização.');
      },
      (erro) => {
        this.estado.set('indisponivel');
        this.mensagem.set(this.mensagemErro(erro.code));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  private carregarLocalizacaoPadrao(): void {
    try {
      const valor = this.janela?.localStorage.getItem(CHAVE_LOCALIZACAO_PADRAO);
      if (!valor) {
        return;
      }

      const localizacao = JSON.parse(valor) as LocalizacaoPadrao;
      if (
        !Number.isFinite(localizacao.posicao?.lat) ||
        !Number.isFinite(localizacao.posicao?.lng)
      ) {
        return;
      }

      this.posicao.set(localizacao.posicao);
      this.origem.set('endereco-padrao');
      this.rotulo.set(localizacao.rotulo);
      this.estado.set('encontrada');
      this.mensagem.set('Usando o endereço cadastrado como localização padrão.');
    } catch {
      this.janela?.localStorage.removeItem(CHAVE_LOCALIZACAO_PADRAO);
    }
  }

  async calcularDistancia(
    origem: Coordenada,
    destino: Coordenada,
    sinal?: AbortSignal,
  ): Promise<DistanciaRota> {
    const distanciaDireta = this.distanciaLinhaReta(origem, destino);
    const janela = this.documento.defaultView;
    if (typeof janela?.fetch !== 'function') {
      return { metros: distanciaDireta, origem: 'linha-reta' };
    }

    const coordenadas = `${origem.lng},${origem.lat};${destino.lng},${destino.lat}`;
    const parametros = new URLSearchParams({ overview: 'false', steps: 'false' });

    try {
      const resposta = await janela.fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordenadas}?${parametros.toString()}`,
        { signal: sinal },
      );
      if (!resposta.ok) {
        throw new Error(`OSRM respondeu com status ${resposta.status}`);
      }

      const dados = (await resposta.json()) as RespostaOsrm;
      const metros = dados.routes?.[0]?.distance;
      if (dados.code !== 'Ok' || typeof metros !== 'number' || !Number.isFinite(metros)) {
        throw new Error('A resposta do OSRM não contém uma rota válida');
      }
      return { metros, origem: 'rota' };
    } catch (erro) {
      if (sinal?.aborted) {
        throw erro;
      }
      return { metros: distanciaDireta, origem: 'linha-reta' };
    }
  }

  private distanciaLinhaReta(origem: Coordenada, destino: Coordenada): number {
    const raioTerra = 6_371_000;
    const radianos = (graus: number) => (graus * Math.PI) / 180;
    const deltaLat = radianos(destino.lat - origem.lat);
    const deltaLng = radianos(destino.lng - origem.lng);
    const latOrigem = radianos(origem.lat);
    const latDestino = radianos(destino.lat);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(latOrigem) * Math.cos(latDestino) * Math.sin(deltaLng / 2) ** 2;
    return raioTerra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private mensagemErro(codigo: number): string {
    if (codigo === 1) {
      return 'Permita o acesso à localização para centralizar o mapa e calcular as distâncias.';
    }
    if (codigo === 3) {
      return 'Não foi possível obter sua localização a tempo. Tente novamente.';
    }
    return 'Não foi possível determinar sua localização. Tente novamente.';
  }
}
