// ============================================
// SuccessPayment.js - VERSIÓN FINAL SIN ERRORES
// Solo transform y opacity en native driver
// backgroundColor en JS driver separado
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated,
  Dimensions, Modal, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// ============================================
// LÍNEA DE LUZ QUE CRUZA LA PANTALLA
// ============================================
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

// ============================================
// COMPONENTE PRINCIPAL
// Props:
//   visible         → true/false
//   ganancia        → Bs de ganancia
//   totalVenta      → Bs total cobrado
//   nombreProducto  → nombre del producto
//   cantidad        → unidades vendidas
//   onFinish        → función al terminar
// ============================================
export default function SuccessPayment({
  visible,
  ganancia = 0,
  totalVenta = 0,
  nombreProducto = '',
  cantidad = 1,
  onFinish,
}) {
  // --- CARRIL JS: solo backgroundColor ---
  const bgColor = useRef(new Animated.Value(0)).current;

  // --- CARRIL NATIVE: solo transform y opacity ---
  const iconScale = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const separadorScale = useRef(new Animated.Value(0)).current;
  const montoY = useRef(new Animated.Value(60)).current;
  const montoOpacity = useRef(new Animated.Value(0)).current;
  const productoY = useRef(new Animated.Value(20)).current;
  const productoOpacity = useRef(new Animated.Value(0)).current;
  const subInfoOpacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setModalAbierto(true);

    // Reset de todos los valores
    bgColor.setValue(0);
    iconScale.setValue(0);
    labelOpacity.setValue(0);
    separadorScale.setValue(0);
    montoY.setValue(60);
    montoOpacity.setValue(0);
    productoY.setValue(20);
    productoOpacity.setValue(0);
    subInfoOpacity.setValue(0);
    fadeOut.setValue(1);

    setTimeout(() => {

      // ============================================
      // CARRIL JS — solo bgColor
      // ============================================
      Animated.sequence([
        Animated.timing(bgColor, { toValue: 1, duration: 150, useNativeDriver: false }),
        Animated.timing(bgColor, { toValue: 2, duration: 200, useNativeDriver: false }),
      ]).start();

      // ============================================
      // CARRIL NATIVE — todo lo demás
      // ============================================
      Animated.sequence([
        Animated.delay(350),
        Animated.spring(iconScale, { toValue: 1, friction: 6, tension: 150, useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.spring(separadorScale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(montoY, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
          Animated.timing(montoOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(productoY, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
          Animated.timing(productoOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.timing(subInfoOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(fadeOut, { toValue: 0, duration: 400, useNativeDriver: true })
            .start(() => {
              setModalAbierto(false);
              onFinish && onFinish();
            });
        }, 900);
      });

    }, 50);

  }, [visible]);

  const fondo = bgColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#0a0a0a', '#0d3320', '#0e7c40'],
  });

  const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal
      visible={modalAbierto}
      transparent={false}
      animationType="none"
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="#0a0a0a" barStyle="light-content" />

      {/* View exterior: solo backgroundColor (JS driver) */}
      <Animated.View style={[styles.fondoColor, { backgroundColor: fondo }]}>

        {/* View interior: solo opacity (native driver) */}
        <Animated.View style={[styles.contenedor, { opacity: fadeOut }]}>

          {/* Líneas de luz */}
          <LineaLuz delay={400}  posY={height * 0.12} duracion={700} />
          <LineaLuz delay={550}  posY={height * 0.35} duracion={900} />
          <LineaLuz delay={700}  posY={height * 0.60} duracion={600} />
          <LineaLuz delay={850}  posY={height * 0.82} duracion={800} />

          {/* Contenido centrado */}
          <View style={styles.cuerpo}>

            {/* Check */}
            <Animated.View style={[styles.iconoBadge, { transform: [{ scale: iconScale }] }]}>
              <Ionicons name="checkmark-circle" size={48} color="#fff" />
            </Animated.View>

            {/* VENTA APROBADA */}
            <Animated.Text style={[styles.labelAprobado, { opacity: labelOpacity }]}>
              VENTA APROBADA
            </Animated.Text>

            {/* Separador con scaleX — native driver compatible */}
            <Animated.View style={[
              styles.separador,
              { transform: [{ scaleX: separadorScale }] }
            ]} />

            {/* Ganancia grande */}
            <Animated.Text style={[
              styles.montoTexto,
              { opacity: montoOpacity, transform: [{ translateY: montoY }] }
            ]}>
              + Bs {ganancia}
            </Animated.Text>

            <Animated.Text style={[styles.montoLabel, { opacity: montoOpacity }]}>
              ganancia
            </Animated.Text>

            {/* Nombre del producto */}
            <Animated.Text style={[
              styles.nombreProducto,
              { opacity: productoOpacity, transform: [{ translateY: productoY }] }
            ]}>
              {cantidad}x {nombreProducto}
            </Animated.Text>

            {/* Info extra */}
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
      </Animated.View>
    </Modal>
  );
}

// ============================================
// ESTILOS
// ============================================
const styles = StyleSheet.create({
  fondoColor: {
    flex: 1,
    width: '100%',
  },
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineaLuz: {
    position: 'absolute',
    width: width * 0.6,
    height: 1.5,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  cuerpo: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconoBadge: {
    marginBottom: 16,
  },
  labelAprobado: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 4,
    marginBottom: 20,
  },
  separador: {
    width: width * 0.5,   // ancho fijo, scaleX lo hace crecer desde 0
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 28,
  },
  montoTexto: {
    fontSize: 68,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -2,
  },
  montoLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    marginBottom: 16,
  },
  nombreProducto: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 36,
    textAlign: 'center',
  },
  infoExtra: {
    gap: 12,
    alignItems: 'flex-start',
  },
  infoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoTexto: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});