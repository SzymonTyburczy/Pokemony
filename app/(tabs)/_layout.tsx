import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'heart', selected: 'heart.fill' }}
            selectedColor="#3b4cca"
          />
          <NativeTabs.Trigger.Label>Ulubione</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="list">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'list.bullet', selected: 'list.bullet' }}
            selectedColor="#3b4cca"
          />
          <NativeTabs.Trigger.Label>Lista</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="map">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'map', selected: 'map.fill' }}
            selectedColor="#3b4cca"
          />
          <NativeTabs.Trigger.Label>Mapa</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="camera">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'camera', selected: 'camera.fill' }}
            selectedColor="#3b4cca"
          />
          <NativeTabs.Trigger.Label>Kamera</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="additional">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' }}
            selectedColor="#3b4cca"
          />
          <NativeTabs.Trigger.Label>Swipe</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // Android i Web
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b4cca',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: { backgroundColor: '#ffffff' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ulubione',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="list"
        options={{
          title: 'Lista',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="camera"
        options={{
          title: 'Kamera',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'camera' : 'camera-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="additional"
        options={{
          title: 'Swipe',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
