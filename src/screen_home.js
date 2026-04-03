// ============================================
// SCREEN_HOME.JS - Pantalla principal con datos reales
// ============================================

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import COLORS from './colors_config';
import BigButton from './component_big_button';
import { getResumenInventario } from './logic_inventory';
import { getResumenVentas } from './logic_sales';

export default function HomeScreen({ navigation }) {
  const [inventario, setInventario] = useState({
    totalProductos: 0,
    totalInvertido: 0,
    totalGanancia: 0,
  });
  const [ventas, setVentas] = useState({
    cantidadHoy: 0,
    gananciaHoy: 0,
    gananciaMes: 0,
  });

  // Recargar datos cada vez que entras a esta pantalla
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  async function cargarDatos() {
    const [resInv, resVentas] = await Promise.all([
      getResumenInventario(),
      getResumenVentas(),
    ]);
    setInventario(resInv);
    setVentas(resVentas);
  }

  // Saludo según la hora del día
  function getSaludo() {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  return (
    <ScrollView style={styles.fondo} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />
      <View style={styles.contenedor}>

        {/* Encabezado */}
        <Text style={styles.saludo}>{getSaludo()}</Text>
        <Text style={styles.titulo}>Ronmel Gear Center</Text>

        {/* Tarjetas inventario */}
        <Text style={styles.seccionTitulo}>Inventario</Text>
        <View style={styles.filaTarjetas}>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Productos</Text>
            <Text style={styles.tarjetaNumero}>{inventario.totalProductos}</Text>
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Invertido</Text>
            <Text style={styles.tarjetaNumero}>Bs {inventario.totalInvertido}</Text>
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Ganancia pot.</Text>
            <Text style={[styles.tarjetaNumero, { color: COLORS.exito }]}>
              Bs {inventario.totalGanancia}
            </Text>
          </View>
        </View>

        {/* Tarjetas ventas */}
        <Text style={styles.seccionTitulo}>Ventas</Text>
        <View style={styles.filaTarjetas}>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Ventas hoy</Text>
            <Text style={styles.tarjetaNumero}>{ventas.cantidadHoy}</Text>
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Ganancia hoy</Text>
            <Text style={[styles.tarjetaNumero, { color: COLORS.exito }]}>
              Bs {ventas.gananciaHoy}
            </Text>
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Este mes</Text>
            <Text style={[styles.tarjetaNumero, { color: COLORS.acento }]}>
              Bs {ventas.gananciaMes}
            </Text>
          </View>
        </View>

        {/* Acciones */}
<Text style={styles.seccionTitulo}>Acciones</Text>
<BigButton
  titulo="Ver Inventario"
  onPress={() => navigation.navigate('Inventario')}
  variante="glass"
/>
<BigButton
  titulo="Registrar Venta"
  onPress={() => navigation.navigate('Ventas')}
  variante="solido"
  color={COLORS.acento}
/>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORS.fondo },
  contenedor: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  saludo: {
    fontSize: 15, color: COLORS.textoGris,
    fontWeight: '400', marginBottom: 4,
  },
  titulo: {
    fontSize: 28, fontWeight: '700',
    color: COLORS.textoBlanco, marginBottom: 28, letterSpacing: -0.5,
  },
  seccionTitulo: {
    fontSize: 18, fontWeight: '600',
    color: COLORS.textoBlanco, marginBottom: 12,
    marginTop: 8, letterSpacing: -0.3,
  },
  filaTarjetas: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  tarjeta: {
    backgroundColor: COLORS.tarjeta,
    borderRadius: 14, padding: 14,
    width: '31%',
  },
  tarjetaLabel: {
    fontSize: 11, color: COLORS.textoGris, marginBottom: 6,
  },
  tarjetaNumero: {
    fontSize: 16, fontWeight: '600',
    color: COLORS.textoBlanco, letterSpacing: -0.3,
  },
});