// ============================================
// SuccessPayment.js
// Animación de venta aprobada - PANTALLA COMPLETA
// Usa Modal para tapar hasta la barra de navegación
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated,
  Dimensions, Modal, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Línea de luz que cruza la pantalla
function LineaLuz({ delay, posY, duracion }) {
  const x = useRef(new Animated.Value(-width)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(x, { toValue: width * 2, duration: duracion, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.6, duration: 100, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: duracion - 100, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.lineaLuz,
      { top: posY, transform: [{ translateX: x }], opacity }
    ]} />
  );
}

export default function SuccessPayment({
  visible,
  ganancia = 0,
  totalVenta = 0,
  nombreProducto = '',
  cantidad = 1,
  onFinish,
}) {
  const bgColor = useRef(new Animated.Value(0)).current;
  const montoY = useRef(new Animated.Value(60)).current;
  const montoOpacity = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const separadorW = useRef(new Animated.Value(0)).current;
  const subInfoOpacity = useRef(new Animated.Value(0)).current;
  const productoOpacity = useRef(new Animated.Value(0)).current;
  const productoY = useRef(new Animated.Value(20)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    if (!visible) return;

    // Primero abrimos el modal, luego animamos
    setModalAbierto(true);

    bgColor.setValue(0);
    montoY.setValue(60);
    montoOpacity.setValue(0);
    labelOpacity.setValue(0);
    iconScale.setValue(0);
    separadorW.setValue(0);
    subInfoOpacity.setValue(0);
    productoOpacity.setValue(0);
    productoY.setValue(20);
    fadeOut.setValue(1);

    // Pequeño delay para que el modal abra antes de animar
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(bgColor, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(bgColor, { toValue: 2, duration: 400, useNativeDriver: false }),
        Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(separadorW, { toValue: width * 0.5, duration: 300, useNativeDriver: false }),
        Animated.parallel([
          Animated.spring(montoY, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
          Animated.timing(montoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(productoY, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
          Animated.timing(productoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.timing(subInfoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(fadeOut, { toValue: 0, duration: 500, useNativeDriver: true })
            .start(() => {
              setModalAbierto(false);
              onFinish && onFinish();
            });
        }, 1400);
      });
    }, 50);

  }, [visible]);

  const fondo = bgColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#0a0a0a', '#0d3320', '#0e7c40'],
  });

  const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    // 👇 Modal con transparent + statusBarTranslucent tapa TODO
    <Modal
      visible={modalAbierto}
      transparent={false}
      animationType="none"
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="#0a0a0a" barStyle="light-content" />

      <Animated.View style={[styles.contenedor, { backgroundColor: fondo, opacity: fadeOut }]}>

        {/* Líneas de luz */}
        <LineaLuz delay={500} posY={height * 0.15} duracion={700} />
        <LineaLuz delay={650} posY={height * 0.45} duracion={900} />
        <LineaLuz delay={820} posY={height * 0.72} duracion={600} />
        <LineaLuz delay={950} posY={height * 0.88} duracion={800} />

        {/* Contenido */}
        <View style={styles.cuerpo}>

          <Animated.View style={[styles.iconoBadge, { transform: [{ scale: iconScale }] }]}>
            <Ionicons name="checkmark-circle" size={48} color="#fff" />
          </Animated.View>

          <Animated.Text style={[styles.labelAprobado, { opacity: labelOpacity }]}>
            VENTA APROBADA
          </Animated.Text>

          <Animated.View style={[styles.separador, { width: separadorW }]} />

          <Animated.Text style={[
            styles.montoTexto,
            { opacity: montoOpacity, transform: [{ translateY: montoY }] }
          ]}>
            + Bs {ganancia}
          </Animated.Text>

          <Animated.Text style={[styles.montoLabel, { opacity: montoOpacity }]}>
            ganancia
          </Animated.Text>

          <Animated.Text style={[
            styles.nombreProducto,
            { opacity: productoOpacity, transform: [{ translateY: productoY }] }
          ]}>
            {cantidad}x {nombreProducto}
          </Animated.Text>

          <Animated.View style={[styles.infoExtra, { opacity: subInfoOpacity }]}>
            <View style={styles.infoFila}>
              <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.5)" />
              <Text style={styles.infoTexto}>Total cobrado: Bs {totalVenta}</Text>
            </View>
            <View style={styles.infoFila}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.5)" />
              <Text style={styles.infoTexto}>{hora}</Text>
            </View>
            <View style={styles.infoFila}>
              <Ionicons name="cube-outline" size={14} color="rgba(255,255,255,0.5)" />
              <Text style={styles.infoTexto}>Stock actualizado</Text>
            </View>
          </Animated.View>

        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // flex:1 + width/height para cubrir absolutamente todo
  contenedor: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineaLuz: {
    position: 'absolute',
    width: width * 0.6, height: 1.5,
    backgroundColor: '#fff', borderRadius: 2,
  },
  cuerpo: { alignItems: 'center', paddingHorizontal: 40 },
  iconoBadge: { marginBottom: 16 },
  labelAprobado: {
    fontSize: 13, fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 4, marginBottom: 20,
  },
  separador: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 28,
  },
  montoTexto: {
    fontSize: 68, fontWeight: '800', color: '#fff', letterSpacing: -2,
  },
  montoLabel: {
    fontSize: 16, color: 'rgba(255,255,255,0.5)',
    marginTop: 4, marginBottom: 16,
  },
  nombreProducto: {
    fontSize: 18, fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 36, textAlign: 'center',
  },
  infoExtra: { gap: 12, alignItems: 'flex-start' },
  infoFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoTexto: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
});