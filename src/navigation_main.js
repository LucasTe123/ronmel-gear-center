// ============================================
// NAVIGATION_MAIN.JS - Navegación entre pantallas
// Si quieres agregar más pantallas, hazlo AQUÍ
// ============================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import COLORS from './colors_config';

// Importar pantallas
import HomeScreen from './screen_home';
import InventarioScreen from './screen_inventory';
import VentasScreen from './screen_sales';

const Tab = createBottomTabNavigator();

export default function Navegacion() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          // --- Cambia colores de la barra de navegación aquí ---
          tabBarStyle: {
            backgroundColor: COLORS.tarjeta,
            borderTopColor: COLORS.secundario,
            paddingBottom: 8,
            height: 60,
          },
          tabBarActiveTintColor: COLORS.acento,
          tabBarInactiveTintColor: COLORS.textoGris,
          headerStyle: { backgroundColor: COLORS.tarjeta },
          headerTintColor: COLORS.textoBlanco,
        }}
      >
        <Tab.Screen
          name="Inicio"
          component={HomeScreen}
          options={{ tabBarIcon: () => <Text style={{fontSize:20}}>🏠</Text> }}
        />
        <Tab.Screen
          name="Inventario"
          component={InventarioScreen}
          options={{ tabBarIcon: () => <Text style={{fontSize:20}}>📦</Text> }}
        />
        <Tab.Screen
          name="Ventas"
          component={VentasScreen}
          options={{ tabBarIcon: () => <Text style={{fontSize:20}}>💰</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}