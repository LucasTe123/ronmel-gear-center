// ============================================
// NAVIGATION_MAIN.JS - Navegación entre pantallas
// ============================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import COLORS from './colors_config';

import HomeScreen from './screen_home';
import InventarioScreen from './screen_inventory';
import VentasScreen from './screen_sales';

const Tab = createBottomTabNavigator();

export default function Navegacion() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          // --- Icono según la pantalla ---
          tabBarIcon: ({ focused, size }) => {
            let iconName;
            if (route.name === 'Inicio') iconName = focused ? 'home' : 'home-outline';
            if (route.name === 'Inventario') iconName = focused ? 'cube' : 'cube-outline';
            if (route.name === 'Ventas') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            return <Ionicons name={iconName} size={size} color={focused ? COLORS.acento : COLORS.textoGris} />;
          },

          // --- Estilo de la barra inferior ---
          tabBarStyle: {
            backgroundColor: '#1c1c1e',
            borderTopColor: COLORS.borde,
            borderTopWidth: 0.5,
            paddingBottom: 8,
            height: 60,
          },
          tabBarActiveTintColor: COLORS.acento,
          tabBarInactiveTintColor: COLORS.textoGris,

          // --- Header de cada pantalla ---
          headerStyle: { backgroundColor: '#1c1c1e' },
          headerTintColor: COLORS.textoBlanco,
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
        })}
      >
        <Tab.Screen name="Inicio" component={HomeScreen} />
        <Tab.Screen name="Inventario" component={InventarioScreen} />
        <Tab.Screen name="Ventas" component={VentasScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}