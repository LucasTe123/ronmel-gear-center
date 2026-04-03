// ============================================
// SCREEN_HOME.JS - Pantalla principal
// Si quieres cambiar lo que se ve en inicio, hazlo AQUÍ
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import COLORS from './colors_config';
import BigButton from './component_big_button';

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.fondo} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />
      <View style={styles.contenedor}>

        {/* Encabezado */}
        <Text style={styles.saludo}>Buen día</Text>
        <Text style={styles.titulo}>Ronmel Gear Center</Text>

        {/* Tarjetas resumen */}
        <View style={styles.filaTarjetas}>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Invertido</Text>
            <Text style={styles.tarjetaNumero}>Bs 0</Text>
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Ganancia</Text>
            <Text style={[styles.tarjetaNumero, { color: COLORS.exito }]}>Bs 0</Text>
          </View>
        </View>

        <View style={styles.filaTarjetas}>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Productos</Text>
            <Text style={styles.tarjetaNumero}>0</Text>
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Ventas hoy</Text>
            <Text style={styles.tarjetaNumero}>0</Text>
          </View>
        </View>

        {/* Acciones */}
        <Text style={styles.seccionTitulo}>Acciones</Text>
        <BigButton
          titulo="Ver Inventario"
          onPress={() => navigation.navigate('Inventario')}
          color={COLORS.secundario}
        />
        <BigButton
          titulo="Registrar Venta"
          onPress={() => navigation.navigate('Ventas')}
          color={COLORS.acento}
        />

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: COLORS.fondo,
  },
  contenedor: {
    padding: 20,
    paddingTop: 60,
  },
  saludo: {
    fontSize: 15,
    color: COLORS.textoGris,
    fontWeight: '400',
    marginBottom: 4,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textoBlanco,
    marginBottom: 28,
    letterSpacing: -0.5,
  },
  filaTarjetas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tarjeta: {
    backgroundColor: COLORS.tarjeta,
    borderRadius: 16,
    padding: 18,
    width: '48%',
  },
  tarjetaLabel: {
    fontSize: 13,
    color: COLORS.textoGris,
    marginBottom: 6,
    fontWeight: '400',
  },
  tarjetaNumero: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textoBlanco,
    letterSpacing: -0.5,
  },
  seccionTitulo: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textoBlanco,
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
});