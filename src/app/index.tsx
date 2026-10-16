import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Pokemon = {
  name: string;
  url: string;
};

const POKEMON_API_URL =
  "https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0";

// Copia estática oficial de PokéAPI en GitHub. Se usa cuando la red bloquea
// pokeapi.co (por ejemplo, un firewall que intercepta su certificado HTTPS).
const POKEMON_MIRROR_URL =
  "https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2/pokemon/index.json";

function isPokemon(value: unknown): value is Pokemon {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "url" in value &&
    typeof value.url === "string"
  );
}

function getPokemonId(url: string) {
  const match = url.match(/\/pokemon\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

function getPokemonImage(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function getPokemonCry(id: number) {
  return `https://pokemoncries.com/cries/${id}.mp3`;
}

async function fetchPokemon(signal?: AbortSignal): Promise<Pokemon[]> {
  try {
    return await fetchPokemonFrom(POKEMON_API_URL, signal);
  } catch (error) {
    if (signal?.aborted || !(error instanceof TypeError)) {
      throw error;
    }
    return fetchPokemonFrom(POKEMON_MIRROR_URL, signal);
  }
}

async function fetchPokemonFrom(
  url: string,
  signal?: AbortSignal,
): Promise<Pokemon[]> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Error del servidor (${response.status}).`);
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("results" in data) ||
    !Array.isArray(data.results) ||
    !data.results.every(isPokemon)
  ) {
    throw new Error("La respuesta de la API no tiene el formato esperado.");
  }

  return data.results;
}

function getErrorMessage(error: unknown) {
  if (error instanceof TypeError) {
    return "No se pudo conectar con PokéAPI. Revisa tu conexión a internet y que el navegador acepte su certificado HTTPS.";
  }

  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado.";
}

export default function Index() {
  const audioPlayer = useAudioPlayer(null);
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    }).catch(() => {
      setAudioError("No se pudo preparar el reproductor de audio.");
    });
  }, []);

  const loadPokemon = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const results = await fetchPokemon();
        setPokemon(results);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchPokemon(controller.signal)
      .then((results) => {
        if (!controller.signal.aborted) {
          setPokemon(results);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const filteredPokemon = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? pokemon.filter((item) => item.name.toLowerCase().includes(query))
      : pokemon;
  }, [pokemon, search]);

  const playCry = useCallback(
    (id: number) => {
      if (!id) {
        return;
      }

      setAudioError(null);
      audioPlayer.replace(getPokemonCry(id));
      audioPlayer.play();
    },
    [audioPlayer],
  );

  const renderPokemon = ({
    item,
  }: {
    item: Pokemon;
    index: number;
    separators: { highlight: () => void; unhighlight: () => void };
  }) => {
    const id = getPokemonId(item.url);

    return (
      <Pressable
        onPress={() => playCry(id)}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Reproducir el sonido de ${item.name}`}
        accessibilityHint="Toca para escuchar su grito"
      >
        <View style={styles.artwork}>
          <Image
            source={{ uri: getPokemonImage(id) }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={`Imagen de ${item.name}`}
          />
          <View style={styles.soundBadge}>
            <Text style={styles.soundBadgeText}>♫</Text>
          </View>
        </View>
        <Text style={styles.pokemonNumber}>
          N.º {String(id).padStart(3, "0")}
        </Text>
        <Text style={styles.pokemonName} numberOfLines={1}>
          {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={styles.safeArea.backgroundColor}
      />
      <FlatList
        data={filteredPokemon}
        renderItem={renderPokemon}
        keyExtractor={(item) => item.url}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadPokemon(true)}
            tintColor="#e3350d"
            colors={["#e3350d"]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>P</Text>
              </View>
              <Text style={styles.eyebrow}>POKÉMON · API</Text>
            </View>
            <Text style={styles.title}>Pokédex</Text>
            <Text style={styles.subtitle}>
              Encuentra tu próximo compañero.
            </Text>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar Pokémon"
                placeholderTextColor="#8992a3"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Buscar Pokémon por nombre"
                returnKeyType="search"
              />
              {search.length > 0 && (
                <Pressable
                  onPress={() => setSearch("")}
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar búsqueda"
                  hitSlop={10}
                >
                  <Text style={styles.clearSearch}>×</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.resultCount}>
              {loading ? "Cargando Pokémon..." : `${filteredPokemon.length} Pokémon`}
            </Text>
            {(audioError || audioStatus.error) && (
              <Text style={styles.audioError}>
                No se pudo reproducir el sonido. Inténtalo de nuevo.
              </Text>
            )}
            {error && pokemon.length > 0 && (
              <View style={styles.refreshError}>
                <Text style={styles.refreshErrorText}>{error}</Text>
                <Pressable
                  onPress={() => void loadPokemon(true)}
                  accessibilityRole="button"
                >
                  <Text style={styles.refreshErrorAction}>Reintentar</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color="#e3350d" />
                <Text style={styles.emptyTitle}>Preparando la Pokédex</Text>
                <Text style={styles.emptyDescription}>
                  Estamos cargando los Pokémon.
                </Text>
              </>
            ) : error ? (
              <>
                <Text style={styles.emptyTitle}>No se pudo cargar</Text>
                <Text style={styles.emptyDescription}>{error}</Text>
                <Pressable
                  onPress={() => void loadPokemon()}
                  style={styles.retryButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>No encontramos Pokémon</Text>
                <Text style={styles.emptyDescription}>
                  Prueba con otro nombre.
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f6fa",
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 18,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e3350d",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  eyebrow: {
    color: "#737d90",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    color: "#1e2532",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  subtitle: {
    color: "#737d90",
    fontSize: 15,
    marginTop: 4,
    marginBottom: 22,
  },
  searchBox: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ebf1",
  },
  searchIcon: {
    color: "#8992a3",
    fontSize: 26,
    lineHeight: 30,
    marginRight: 9,
  },
  searchInput: {
    flex: 1,
    color: "#1e2532",
    fontSize: 15,
    paddingVertical: 0,
  },
  clearSearch: {
    color: "#8992a3",
    fontSize: 24,
    paddingLeft: 10,
  },
  resultCount: {
    color: "#737d90",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 15,
  },
  refreshError: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff0ed",
  },
  refreshErrorText: {
    flex: 1,
    color: "#9a2b15",
    fontSize: 12,
  },
  refreshErrorAction: {
    color: "#c33213",
    fontSize: 12,
    fontWeight: "700",
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#edf0f4",
  },
  cardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  artwork: {
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#f3f5f9",
    marginBottom: 12,
  },
  image: {
    width: "88%",
    height: "88%",
  },
  soundBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ebf1",
  },
  soundBadgeText: {
    color: "#e3350d",
    fontSize: 17,
    fontWeight: "700",
  },
  audioError: {
    color: "#9a2b15",
    fontSize: 12,
    marginTop: 8,
  },
  pokemonNumber: {
    color: "#8992a3",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  pokemonName: {
    color: "#242b38",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: "#242b38",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 14,
  },
  emptyDescription: {
    color: "#737d90",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 6,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: "#e3350d",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
