// ============================================
// COMPONENT_BIG_BUTTON.JS - Botón grande reutilizable
// Si quieres cambiar el estilo del botón, hazlo AQUÍ
// ============================================

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import COLORS from './colors_config';

// Props: titulo, onPress, color (opcional)
export default function BigButton({ titulo, onPress, color }) {
  return (
    <TouchableOpacity
      style={[styles.boton, { backgroundColor: color || COLORS.acento }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.texto}>{titulo}</Text>
    </TouchableOpacity>
  );
}

// --- Cambia el diseño del botón aquí abajo ---
const styles = StyleSheet.create({
  boton: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  texto: {
    color: COLORS.textoBlanco,
    fontSize: 18,       // <- cambia tamaño de texto aquí
    fontWeight: 'bold',
  },
});