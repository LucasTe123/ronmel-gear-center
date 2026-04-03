// ============================================
// SCREEN_HOME.JS - Pantalla principal (resumen)
// Si quieres cambiar lo que se ve en el inicio, hazlo AQUÍ
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import COLORS from './colors_config';
import BigButton from './component_big_button';

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.fondo}>
      <View style={styles.contenedor}>

        {/* --- Título principal --- */}
        <Text style={styles.titulo}>Ronmel Gear Center</Text>
        <Text style={styles.subtitulo}>Panel de control</Text>

        {/* --- Tarjetas de resumen --- */}
        <View style={styles.filaTarjetas}>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaNumero}>Bs 0</Text>
            <Text style={styles.tarjetaLabel}>Invertido</Text>
          </View>
          <View style={styles.tarjeta}>
            <Text style={[styles.tarjetaNumero, { color: COLORS.exito }]}>Bs 0</Text>
            <Text style={styles.tarjetaLabel}>Ganancia</Text>
          </View>
        </View>

        <View style={styles.filaTarjetas}>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaNumero}>0</Text>
            <Text style={styles.tarjetaLabel}>Productos</Text>
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaNumero}>0</Text>
            <Text style={styles.tarjetaLabel}>Ventas hoy</Text>
          </View>
        </View>

        {/* --- Botones de navegación --- */}
        <View style={styles.botones}>
          <BigButton
            titulo="📦 Ver Inventario"
            onPress={() => navigation.navigate('Inventario')}
            color={COLORS.secundario}
          />
          <BigButton
            titulo="💰 Registrar Venta"
            onPress={() => navigation.navigate('Ventas')}
            color={COLORS.acento}
          />
        </View>

      </View>
    </ScrollView>
  );
}

// --- Cambia estilos de la pantalla home aquí ---
const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: COLORS.fondo,
  },
  contenedor: {
    padding: 20,
    paddingTop: 50,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textoBlanco,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: COLORS.textoGris,
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 4,
  },
  filaTarjetas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tarjeta: {
    backgroundColor: COLORS.tarjeta,
    borderRadius: 12,
    padding: 20,
    width: '48%',
    alignItems: 'center',
  },
  tarjetaNumero: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textoBlanco,
  },
  tarjetaLabel: {
    fontSize: 12,
    color: COLORS.textoGris,
    marginTop: 4,
  },
  botones: {
    marginTop: 20,
  },
});