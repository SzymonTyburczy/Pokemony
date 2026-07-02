import { Tabs } from 'expo-router';

export default function TabsLayout() {
	return (
		<Tabs>
			<Tabs.Screen name="index" options={{ title: 'Home' }} />
			<Tabs.Screen name="list" options={{ title: 'List' }} />
			<Tabs.Screen name="map" options={{ title: 'Map' }} />
            <Tabs.Screen name="camera" options={{ title: 'Camera' }} />
		</Tabs>
	);
}
