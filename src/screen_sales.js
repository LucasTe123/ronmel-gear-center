// ============================================
// SCREEN_SALES.JS - Pantalla de ventas
// Solo muestra historial + resumen
// (El formulario de registrar venta se movió al Home)
// ============================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from './colors_config';
import { getVentasHoy, getResumenVentas } from './logic_sales';
import { eliminarVenta } from './storage_manager';

// ============================================
// FILA DE VENTA CON SWIPE PARA BORRAR
// (sin cambios)
// ============================================
function FilaVenta({ item, onEliminar }) {
  const swipeableRef = useRef(null);

  const renderBotonBorrar = (progress, dragX) => {
    const escalaX = dragX.interpolate({
      inputRange: [-160, -80, 0],
      outputRange: [1.5, 1, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={estilosVenta.contenedorBorrar}>
        <Animated.View style={[
          estilosVenta.circuloBorrar,
          { transform: [{ scaleX: escalaX }] }
        ]}>
          <TouchableOpacity
            onPress={() => {
              swipeableRef.current?.close();
              onEliminar(item);
            }}
            style={estilosVenta.botonInterior}
          >
            <Ionicons name="trash" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const hora = new Date(item.fecha).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderBotonBorrar}
      overshootRight={true}
      overshootFriction={3}
      friction={2}
      rightThreshold={50}
      overshootLeft={false}
      leftThreshold={99999}
    >
      <View style={estilosVenta.fila}>
        <View style={{ flex: 1 }}>
          <Text style={estilosVenta.nombre}>{item.nombreProducto}</Text>
          <Text style={estilosVenta.hora}>
            {hora} · {item.cantidad} unidad{item.cantidad > 1 ? 'es' : ''}
          </Text>
        </View>
        <Text style={estilosVenta.ganancia}>+Bs {item.ganancia}</Text>
      </View>
    </Swipeable>
  );
}

const estilosVenta = StyleSheet.create({
  fila: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 4,
    backgroundColor: COLORS.fondo,
  },
  nombre: { fontSize: 15, fontWeight: '500', color: COLORS.textoBlanco },
  hora: { fontSize: 12, color: COLORS.textoGris, marginTop: 2 },
  ganancia: { fontSize: 16, fontWeight: '600', color: COLORS.exito },
  contenedorBorrar: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fondo,
  },
  circuloBorrar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
  },
  botonInterior: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ============================================
// PANTALLA PRINCIPAL DE VENTAS
// ============================================
export default function VentasScreen() {
  const [ventasHoy, setVentasHoy] = useState([]);
  const [resumen, setResumen] = useState({ cantidadHoy: 0, gananciaHoy: 0, gananciaMes: 0 });
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => { cargarDatos(); }, [])
  );

  async function cargarDatos() {
    setCargando(true);
    const [ventas, res] = await Promise.all([
      getVentasHoy(),
      getResumenVentas(),
    ]);
    setVentasHoy(ventas);
    setResumen(res);
    setCargando(false);
  }

  async function borrarVenta(venta) {
    Alert.alert(
      'Borrar venta',
      `¿Eliminar venta de ${venta.cantidad}x ${venta.nombreProducto}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await eliminarVenta(venta.id);
            cargarDatos();
          },
        },
      ]
    );
  }

  if (cargando) return <ActivityIndicator color={COLORS.acento} style={{ marginTop: 40 }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView style={styles.fondo} showsVerticalScrollIndicator={false}>
        <View style={styles.contenedor}>

          {/* Resumen del día */}
          <View style={styles.filaTarjetas}>
            <View style={styles.tarjetaResumen}>
              <Text style={styles.resumenLabel}>Ventas hoy</Text>
              <Text style={styles.resumenNumero}>{resumen.cantidadHoy}</Text>
            </View>
            <View style={styles.tarjetaResumen}>
              <Text style={styles.resumenLabel}>Ganancia hoy</Text>
              <Text style={[styles.resumenNumero, { color: COLORS.exito }]}>
                Bs {resumen.gananciaHoy}
              </Text>
            </View>
            <View style={styles.tarjetaResumen}>
              <Text style={styles.resumenLabel}>Este mes</Text>
              <Text style={[styles.resumenNumero, { color: COLORS.acento }]}>
                Bs {resumen.gananciaMes}
              </Text>
            </View>
          </View>

          {/* Historial con swipe para borrar */}
          {ventasHoy.length > 0 ? (
            <>
              <Text style={styles.seccionTitulo}>Ventas de hoy</Text>
              <Text style={styles.textoAyuda}>← Deslizá para borrar una venta</Text>
              <View style={styles.listaVentas}>
                {ventasHoy.map(item => (
                  <FilaVenta
                    key={item.id}
                    item={item}
                    onEliminar={borrarVenta}
                  />
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.textoVacio}>No hay ventas registradas hoy</Text>
          )}

        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORS.fondo },
  contenedor: { padding: 16, paddingBottom: 40 },
  filaTarjetas: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  tarjetaResumen: {
    backgroundColor: COLORS.tarjeta, borderRadius: 14,
    padding: 14, width: '31%', alignItems: 'center',
  },
  resumenLabel: { fontSize: 11, color: COLORS.textoGris, marginBottom: 6 },
  resumenNumero: { fontSize: 18, fontWeight: '700', color: COLORS.textoBlanco },
  seccionTitulo: {
    fontSize: 18, fontWeight: '600', color: COLORS.textoBlanco,
    marginBottom: 8, marginTop: 8, letterSpacing: -0.3,
  },
  textoAyuda: {
    fontSize: 11, color: COLORS.textoGris,
    marginBottom: 8, fontStyle: 'italic',
  },
  listaVentas: {
    backgroundColor: COLORS.fondo,
    borderRadius: 14,
    overflow: 'hidden',
  },
  textoVacio: { color: COLORS.textoGris, fontSize: 14, marginTop: 8 },
});