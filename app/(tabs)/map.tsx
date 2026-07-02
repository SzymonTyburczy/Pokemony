import { Text, View, StyleSheet } from 'react-native';

export default function MapScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Mapa Pokémonów</Text>
			<Text>To jest tymczasowy ekran mapy.</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 10,
	},
});
