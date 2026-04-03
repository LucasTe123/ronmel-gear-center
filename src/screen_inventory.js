import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import COLORS from './colors_config';

export default function InventarioScreen() {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.texto}>📦 Inventario</Text>
      <Text style={styles.subtexto}>Próximamente...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: COLORS.fondo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  texto: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textoBlanco,
  },
  subtexto: {
    fontSize: 16,
    color: COLORS.textoGris,
    marginTop: 8,
  },
});