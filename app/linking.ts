const linking = {
  prefixes: ['planejeja://', 'https://planejeja.com.br'],
  config: {
    screens: {
      '(auth)': {
        screens: {
          invite: 'invite', // ✅ adiciona o invite aqui
        },
      },

      '(newevents)': {
        screens: {
          search: 'search',
        },
      },

      '(tabs)': {
        screens: {
          myevents: 'myevents',
        },
      },

      '(stack)': {
        screens: {
          events: {
            screens: {
              '[id]': 'event',
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

      '+not-found': '*',
    },
  },
};

export default linking;
