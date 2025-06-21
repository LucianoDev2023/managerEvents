const linking = {
  prefixes: ['planejeja://', 'https://planejeja.com.br'],
  config: {
    screens: {
      '(tabs)': {
        screens: {
          myevents: 'myevents',
        },
      },
      '(stack)': {
        screens: {
          events: {
            screens: {
              '[id]': 'event', // corresponde a planejeja://event?title=...&code=...
              new: 'events/new',
            },
          },
          'permission-confirmation': {
            screens: {
              '[id]': 'permission-confirmation/:id',
            },
          },
          'qr-scanner': 'qr-scanner',
        },
      },
      '(newevents)': {
        screens: {
          search: 'search',
        },
      },
      '(auth)': {
        // exemplo se tiver login
      },
      '(modulo)': {
        // se tiver telas aqui também
      },
      // rota fallback para erro
      '+not-found': '*',
    },
  },
};

export default linking;
