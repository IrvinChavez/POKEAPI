import { useAudioPlayer } from "expo-audio";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PokemonDetails = {
  id: number;
  name: string;
  types: { type: { name: string } }[];
  abilities: {
    is_hidden: boolean;
    ability: { name: string };
  }[];
  stats: {
    base_stat: number;
    stat: { name: string };
  }[];
  moves: { move: { name: string } }[];
};

async function fetchPokemonDetails(id: string): Promise<PokemonDetails> {
  const urls = [
    `https://pokeapi.co/api/v2/pokemon/${id}/`,
    `https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2/pokemon/${id}/index.json`,
  ];

  let lastError: unknown;

  for (const url of urls) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error del servidor (${response.status}).`);
      }

      return (await response.json()) as PokemonDetails;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo cargar el detalle del Pokémon.");
}

export default function PokemonDetailScreen() {
  const audioPlayer = useAudioPlayer(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pokemon, setPokemon] = useState<PokemonDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playCry = () => {
    if (!pokemon) return;

    audioPlayer.replace(`https://pokemoncries.com/cries/${pokemon.id}.mp3`);
    audioPlayer.play();
  };

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    async function loadDetails() {
      try {
        setError(null);
        const details = await fetchPokemonDetails(id);

        if (!controller.signal.aborted) {
          setPokemon(details);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Ocurrió un error inesperado.",
          );
        }
      }
    }

    void loadDetails();

    return () => controller.abort();
  }, [id]);

  if (!pokemon && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e3350d" />
        <Text style={styles.message}>Cargando Pokémon...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No se pudo cargar el Pokémon</Text>
        <Text style={styles.message}>{error}</Text>
      </View>
    );
  }

  if (!pokemon) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.pokedex}>
        <View style={styles.pokedexTop}>
          <View style={styles.cameraLens} />
          <Text style={styles.pokedexLabel}>POKÉDEX</Text>
          <Text style={styles.pokemonNumber}>
            N.º {String(pokemon.id).padStart(3, "0")}
          </Text>
        </View>

        <View style={styles.pokemonScreen}>
          <Image
            source={{
              uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`,
            }}
            style={styles.pokemonImage}
            resizeMode="contain"
            accessibilityLabel={`Imagen de ${pokemon.name}`}
          />
          <Text style={styles.title}>
            {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
          </Text>
        </View>
      </View>

      <Pressable
        style={styles.soundButton}
        onPress={playCry}
        accessibilityRole="button"
        accessibilityLabel={`Reproducir el grito de ${pokemon.name}`}
      >
        <Text style={styles.soundButtonText}>♫ Escuchar sonido</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.heading}>Tipos</Text>
        <View style={styles.typeList}>
          {pokemon.types.map(({ type }) => (
            <Text key={type.name} style={styles.typeBadge}>
              {type.name}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Habilidades</Text>
        <View style={styles.abilityList}>
          {pokemon.abilities.map(({ ability, is_hidden }) => (
            <View key={ability.name} style={styles.abilityCard}>
              <Text style={styles.abilityName}>{ability.name}</Text>
              <Text
                style={[
                  styles.abilityKind,
                  is_hidden && styles.hiddenAbilityKind,
                ]}
              >
                {is_hidden ? "Oculta" : "Normal"}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Estadísticas</Text>
        {pokemon.stats.map(({ stat, base_stat }) => (
          <View key={stat.name} style={styles.statRow}>
            <View style={styles.statLabels}>
              <Text style={styles.statName}>{stat.name.replace("-", " ")}</Text>
              <Text style={styles.statValue}>{base_stat}</Text>
            </View>
            <View
              style={styles.statTrack}
              accessibilityRole="progressbar"
              accessibilityLabel={`${stat.name}: ${base_stat}`}
              accessibilityValue={{ min: 0, max: 255, now: base_stat }}
            >
              <View
                style={[
                  styles.statFill,
                  { width: `${Math.min((base_stat / 255) * 100, 100)}%` },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.movesHeading}>
          <Text style={styles.heading}>Movimientos</Text>
          <Text style={styles.moveCount}>{pokemon.moves.length}</Text>
        </View>
        <View style={styles.moveList}>
          {pokemon.moves.map(({ move }) => (
            <Text key={move.name} style={styles.moveBadge}>
              {move.name.replace("-", " ")}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: "#f0f2f5",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f0f2f5",
  },
  title: {
    color: "#202938",
    fontSize: 28,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  pokedex: {
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#e3350d",
    padding: 12,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#202938",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  pokedexTop: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  cameraLens: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#74d7f5",
    borderWidth: 3,
    borderColor: "#fff",
    marginRight: 8,
  },
  pokedexLabel: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
  },
  pokemonNumber: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  pokemonScreen: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderRadius: 18,
    backgroundColor: "#f0f2f5",
  },
  pokemonImage: {
    width: "100%",
    height: 220,
    marginBottom: 8,
  },
  soundButton: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: "#e3350d",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginBottom: 8,
  },
  soundButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e8ee",
    padding: 16,
    marginTop: 14,
    elevation: 2,
    shadowColor: "#202938",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  typeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeBadge: {
    overflow: "hidden",
    backgroundColor: "#eef1f5",
    borderRadius: 20,
    color: "#3d4859",
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 7,
    textTransform: "capitalize",
  },
  abilityList: {
    gap: 10,
  },
  abilityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f5f6fa",
  },
  abilityName: {
    flex: 1,
    color: "#303a4b",
    fontSize: 15,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  abilityKind: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#e7f5ec",
    color: "#247344",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  hiddenAbilityKind: {
    backgroundColor: "#fff0e8",
    color: "#bd431d",
  },
  statRow: {
    marginTop: 10,
  },
  statLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statName: {
    color: "#535d70",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statValue: {
    color: "#242b38",
    fontSize: 13,
    fontWeight: "800",
  },
  statTrack: {
    height: 9,
    overflow: "hidden",
    borderRadius: 5,
    backgroundColor: "#e9ecf1",
  },
  statFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#e3350d",
  },
  movesHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moveCount: {
    color: "#7b8493",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  moveList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moveBadge: {
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: "#f0f2f5",
    color: "#4c5668",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    textTransform: "capitalize",
  },
  heading: {
    color: "#e3350d",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
  item: {
    color: "#535d70",
    fontSize: 15,
    lineHeight: 23,
  },
  message: {
    color: "#535d70",
    fontSize: 15,
    marginTop: 12,
    textAlign: "center",
  },
});
