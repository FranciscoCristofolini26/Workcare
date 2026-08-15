export const environment = {
  producao: false,
  mapa: {
    urlTiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribuicao:
      '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    zoomMaximo: 18,
    zoomInicial: 11,
  },
  intervaloAtualizacaoMs: 5000,
};
