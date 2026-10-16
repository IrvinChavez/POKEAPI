# Pokédex

Aplicación móvil hecha con Expo y React Native que consulta la PokéAPI y muestra
un catálogo de Pokémon con búsqueda por nombre e ilustraciones oficiales.

## API e imágenes

- Lista: `https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0`
- Ilustraciones: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`
- Gritos: `https://pokemoncries.com/cries/{id}.mp3`

La lista se carga al abrir la aplicación. Puedes buscar por nombre o deslizar
hacia abajo para volver a cargarla. Toca una tarjeta para reproducir el grito
del Pokémon.

## Iniciar el proyecto

```bash
npm install
npx expo start
```

Abre la aplicación con Expo Go, un emulador o un dispositivo conectado. También
puedes usar `npx expo start --web` para ejecutarla en el navegador.
