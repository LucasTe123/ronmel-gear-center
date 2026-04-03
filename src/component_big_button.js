// ============================================
// COMPONENT_BIG_BUTTON.JS - Botón Glass premium
// ============================================

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import COLORS from './colors_config';

export default function BigButton({ titulo, onPress, color, variante = 'glass' }) {

  if (variante === 'solido') {
    return (
      <TouchableOpacity
        style={[styles.botonSolido, { backgroundColor: color || COLORS.acento }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.texto}>{titulo}</Text>
      </TouchableOpacity>
    );
  }

  // Glass simulado — borde brillante + fondo con tinte
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.glassWrapper}>
      {/* Borde superior brillante efecto glass */}
      <View style={styles.glassHighlight} />
      <Text style={styles.texto}>{titulo}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Glass
  glassWrapper: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.2)',
    // Sombra suave
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)', // línea brillante arriba
    borderRadius: 1,
  },

  // Sólido
  botonSolido: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 6,
    shadowColor: COLORS.acento,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },

  texto: {
    color: COLORS.textoBlanco,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});