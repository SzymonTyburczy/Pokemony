import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useCustomPokemonActionsContext,
  useCustomPokemonStateContext,
} from "../../src/features/customPokemon/context/CustomPokemonContext";
import { CustomPokemon } from "../../src/features/customPokemon/model/types";
import { formatPokemonName } from "../../src/shared/utils/formatPokemonName";
import {
  useFavouritesActionsContext,
  useFavouritesStateContext,
} from "../../src/features/favourites/context/FavouritesContext";
import { customPokemonToFavourite } from "../../src/features/customPokemon/utils/customPokemonFavourites";
import {
  persistCustomPokemonImage,
  resolveCustomPokemonImageUri,
} from "../../src/features/customPokemon/storage/customPokemonImages";
import { useMapPinsActionsContext } from "../../src/features/map/context/MapPinsContext";

const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

const TYPE_COLORS: Record<string, string> = {
  normal: "#a8a878",
  fire: "#f08030",
  water: "#6890f0",
  electric: "#f8d030",
  grass: "#78c850",
  ice: "#98d8d8",
  fighting: "#c03028",
  poison: "#a040a0",
  ground: "#e0c068",
  flying: "#a890f0",
  psychic: "#f85888",
  bug: "#a8b820",
  rock: "#b8a038",
  ghost: "#705898",
  dragon: "#7038f8",
  dark: "#705848",
  steel: "#b8b8d0",
  fairy: "#ee99ac",
};

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Atak",
  defense: "Obrona",
  "special-attack": "Sp. Atak",
  "special-defense": "Sp. Obr.",
  speed: "Szybkość",
};

const DEFAULT_STATS = Object.keys(STAT_LABELS).map((name) => ({
  name,
  value: 50,
}));

function CustomPokemonRow({
  pokemon,
  onPress,
  onDelete,
  isFavourite,
  onToggleFavourite,
}: {
  pokemon: CustomPokemon;
  onPress: () => void;
  onDelete: () => void;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}) {
  const resolvedImageUri = resolveCustomPokemonImageUri(pokemon.imageUri);

  return (
    <Pressable
      style={({ pressed }) => [styles.customRow, pressed && { opacity: 0.75 }]}
      onPress={onPress}
    >
      {resolvedImageUri ? (
        <Image
          source={{ uri: resolvedImageUri }}
          style={styles.customRowImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.customRowImage, styles.customRowImagePlaceholder]}>
          <Ionicons name="help-outline" size={22} color="#9ca3af" />
        </View>
      )}
      <View style={styles.customRowInfo}>
        <Text style={styles.customRowName}>
          {formatPokemonName(pokemon.name)}
        </Text>
        {pokemon.types.length > 0 && (
          <Text style={styles.customRowTypes}>{pokemon.types.join(" / ")}</Text>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#9ca3af"
        style={{ marginRight: 4 }}
      />
      <Pressable
        style={({ pressed }) => [
          styles.customRowHeart,
          pressed && { opacity: 0.6 },
        ]}
        onPress={(e) => {
          e.stopPropagation?.();
          onToggleFavourite();
        }}
        hitSlop={8}
      >
        <Text style={styles.customRowHeartIcon}>
          {isFavourite ? "❤️" : "🤍"}
        </Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.customRowDelete,
          pressed && { opacity: 0.6 },
        ]}
        onPress={(e) => {
          e.stopPropagation?.();
          Alert.alert(
            "Usuń Pokémona",
            `Czy na pewno chcesz usunąć ${pokemon.name}?`,
            [
              { text: "Anuluj", style: "cancel" },
              { text: "Usuń", style: "destructive", onPress: onDelete },
            ],
          );
        }}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={20} color="#dc2626" />
      </Pressable>
    </Pressable>
  );
}

export default function CreateNewPokemonScreen() {
  const router = useRouter();
  const { customPokemons } = useCustomPokemonStateContext();
  const { addCustomPokemon, removeCustomPokemon } =
    useCustomPokemonActionsContext();
  const { favouriteUrlSet } = useFavouritesStateContext();
  const { removeFavourite, toggleFavourite } = useFavouritesActionsContext();
  const { removePinsForPokemonUrl } = useMapPinsActionsContext();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [isSaving, setIsSaving] = useState(false);

  const pickImage = () => {
    Alert.alert("Wybierz źródło obrazka", undefined, [
      {
        text: "Galeria",
        onPress: async () => {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Brak uprawnień",
              "Zezwól na dostęp do galerii w ustawieniach.",
            );
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled) setImageUri(result.assets[0].uri);
        },
      },
      {
        text: "Aparat",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Brak uprawnień",
              "Zezwól na dostęp do aparatu w ustawieniach.",
            );
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled) setImageUri(result.assets[0].uri);
        },
      },
      { text: "Anuluj", style: "cancel" },
    ]);
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type);
      if (prev.length >= 2) {
        Alert.alert(
          "Maksymalnie 2 typy",
          "Pokemon może mieć co najwyżej 2 typy.",
        );
        return prev;
      }
      return [...prev, type];
    });
  };

  const updateStat = (index: number, raw: string) => {
    const value = Math.min(255, Math.max(0, parseInt(raw, 10) || 0));
    setStats((prev) => prev.map((s, i) => (i === index ? { ...s, value } : s)));
  };

  const resetForm = () => {
    setImageUri(null);
    setName("");
    setDescription("");
    setSelectedTypes([]);
    setHeight("");
    setWeight("");
    setStats(DEFAULT_STATS);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Brakuje nazwy", "Podaj nazwę Pokémona przed zapisem.");
      return;
    }

    const pokemonId = Date.now().toString();
    setIsSaving(true);

    try {
      const persistedImageUri = await persistCustomPokemonImage(
        imageUri,
        pokemonId,
      );
      const pokemon: CustomPokemon = {
        id: pokemonId,
        name: name.trim(),
        description: description.trim(),
        imageUri: persistedImageUri,
        height: parseFloat(height) || 0,
        weight: parseFloat(weight) || 0,
        types: selectedTypes,
        stats,
      };

      addCustomPokemon(pokemon);
      resetForm();
      Alert.alert("Gotowe!", `${pokemon.name} został dodany do kolekcji.`);
    } catch (error) {
      console.error("Nie udało się utrwalić zdjęcia własnego Pokémona:", error);
      Alert.alert(
        "Błąd",
        "Nie udało się zapisać zdjęcia Pokémona. Spróbuj ponownie.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Dodaj Pokémona</Text>
        <Text style={styles.subtitle}>
          Stwórz własnego Pokémona i zapisz go w kolekcji.
        </Text>

        {/* Obrazek */}
        <Pressable style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={40} color="#9ca3af" />
              <Text style={styles.imagePlaceholderText}>Dodaj zdjęcie</Text>
            </View>
          )}
        </Pressable>

        {/* Nazwa */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nazwa</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="np. Fireon"
            placeholderTextColor="#9ca3af"
            maxLength={40}
          />
        </View>

        {/* Opis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opis</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Opisz swojego Pokémona..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={300}
          />
        </View>

        {/* Typy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Typy (max 2)</Text>
          <View style={styles.typeGrid}>
            {POKEMON_TYPES.map((type) => {
              const isSelected = selectedTypes.includes(type);
              return (
                <Pressable
                  key={type}
                  style={[
                    styles.typeChip,
                    isSelected && { backgroundColor: TYPE_COLORS[type] },
                  ]}
                  onPress={() => toggleType(type)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      isSelected && styles.typeChipTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Wzrost i waga */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wymiary</Text>
          <View style={styles.rowInputs}>
            <View style={styles.halfInputWrap}>
              <Text style={styles.inputLabel}>Wzrost (m)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder="np. 1.2"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.halfInputWrap}>
              <Text style={styles.inputLabel}>Waga (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="np. 8.5"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Statystyki */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statystyki (0–255)</Text>
          {stats.map((stat, index) => (
            <View key={stat.name} style={styles.statRow}>
              <Text style={styles.statLabel}>{STAT_LABELS[stat.name]}</Text>
              <View style={styles.statBarWrap}>
                <View
                  style={[
                    styles.statBar,
                    { width: `${(stat.value / 255) * 100}%` },
                  ]}
                />
              </View>
              <TextInput
                style={styles.statInput}
                value={stat.value.toString()}
                onChangeText={(v) => updateStat(index, v)}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          ))}
        </View>

        {/* Zapisz */}
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            (!name.trim() || isSaving) && styles.saveButtonDisabled,
            pressed && name.trim() && !isSaving && styles.saveButtonPressed,
          ]}
          onPress={handleSave}
          disabled={!name.trim() || isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Zapisywanie..." : "Zapisz Pokémona"}
          </Text>
        </Pressable>

        {/* Moja kolekcja */}
        {customPokemons.length > 0 && (
          <View style={styles.collectionSection}>
            <Text style={styles.sectionTitle}>
              Moja kolekcja ({customPokemons.length})
            </Text>
            {customPokemons.map((p) => {
              const favourite = customPokemonToFavourite(p);
              const handleDelete = () => {
                removeCustomPokemon(p.id);
                removeFavourite(favourite.url);
                removePinsForPokemonUrl(favourite.url);
              };

              return (
                <CustomPokemonRow
                  key={p.id}
                  pokemon={p}
                  onPress={() => router.push(`/custom-pokemon/${p.id}`)}
                  onDelete={handleDelete}
                  isFavourite={favouriteUrlSet.has(favourite.url)}
                  onToggleFavourite={() => toggleFavourite(favourite)}
                />
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#3b4cca",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 20,
  },
  imagePicker: {
    alignSelf: "center",
    width: 160,
    height: 160,
    borderRadius: 20,
    marginBottom: 28,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#e9ecef",
    borderStyle: "dashed",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#3b4cca",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 6,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
  },
  halfInputWrap: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
    textTransform: "capitalize",
  },
  typeChipTextSelected: {
    color: "#fff",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  statLabel: {
    width: 74,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  statBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: "#e9ecef",
    borderRadius: 4,
    overflow: "hidden",
  },
  statBar: {
    height: "100%",
    backgroundColor: "#3b4cca",
    borderRadius: 4,
  },
  statInput: {
    width: 48,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    paddingVertical: 6,
  },
  saveButton: {
    backgroundColor: "#3b4cca",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#3b4cca",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: "#d1d5db",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  bottomSpacer: {
    height: 20,
  },
  collectionSection: {
    marginTop: 32,
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e9ecef",
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  customRowImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  customRowImagePlaceholder: {
    backgroundColor: "#e9ecef",
    alignItems: "center",
    justifyContent: "center",
  },
  customRowInfo: {
    flex: 1,
  },
  customRowName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  customRowTypes: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
    textTransform: "capitalize",
  },
  customRowDelete: {
    padding: 4,
  },
  customRowHeart: {
    padding: 4,
  },
  customRowHeartIcon: {
    fontSize: 22,
  },
});
