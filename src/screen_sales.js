// ============================================
// SCREEN_SALES.JS - Pantalla de ventas
// Con swipe para borrar ventas individuales
// ============================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from './colors_config';
import { getProductos } from './logic_inventory';
import { venderProducto, getVentasHoy, getResumenVentas } from './logic_sales';
import { eliminarVenta } from './storage_manager'; // para borrar venta individual

// ============================================
// FILA DE VENTA CON SWIPE PARA BORRAR
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
      // backgroundColor igual al fondo → el cuadrado se camufla
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
      // SIN onSwipeableOpen — no borra automático
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
    backgroundColor: COLORS.fondo, // mismo fondo para que el swipe no corte
  },
  nombre: { fontSize: 15, fontWeight: '500', color: COLORS.textoBlanco },
  hora: { fontSize: 12, color: COLORS.textoGris, marginTop: 2 },
  ganancia: { fontSize: 16, fontWeight: '600', color: COLORS.exito },

  // Mismo truco: backgroundColor = fondo → cuadrado invisible
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
// PANTALLA PRINCIPAL
// ============================================
export default function VentasScreen() {
  const [productos, setProductos] = useState([]);
  const [ventasHoy, setVentasHoy] = useState([]);
  const [resumen, setResumen] = useState({ cantidadHoy: 0, gananciaHoy: 0, gananciaMes: 0 });
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);

  useFocusEffect(
    useCallback(() => { cargarDatos(); }, [])
  );

  async function cargarDatos() {
    setCargando(true);
    const [prods, ventas, res] = await Promise.all([
      getProductos(),
      getVentasHoy(),
      getResumenVentas(),
    ]);
    setProductos(prods);
    setVentasHoy(ventas);
    setResumen(res);
    setCargando(false);
  }

  function abrirModal(producto) {
    setProductoSeleccionado(producto);
    setCantidad(1);
    setModalVisible(true);
  }

  async function confirmarVenta() {
    if (!productoSeleccionado) return;
    if (cantidad < 1) {
      Alert.alert('Cantidad inválida', 'La cantidad debe ser al menos 1.');
      return;
    }
    const resultado = await venderProducto(productoSeleccionado.id, cantidad);
    if (!resultado.exito) {
      Alert.alert('Error', resultado.mensaje);
      return;
    }
    setModalVisible(false);
    Alert.alert(
      'Venta registrada ✅',
      `${cantidad}x ${productoSeleccionado.nombre}\nGanancia: Bs ${resultado.venta.ganancia}`
    );
    cargarDatos();
  }

  // Borrar una venta — pide confirmación, luego la elimina y recalcula todo
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
            cargarDatos(); // recarga todo — resumen se actualiza solo
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

          {/* Productos para registrar venta */}
          <Text style={styles.seccionTitulo}>Registrar venta</Text>
          {productos.length === 0 ? (
            <Text style={styles.textoVacio}>Agrega productos desde Inventario primero</Text>
          ) : (
            productos.map(item => (
              <TouchableOpacity key={item.id} style={styles.tarjeta} onPress={() => abrirModal(item)}>
                <View style={styles.tarjetaFila}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nombreProducto}>{item.nombre}</Text>
                    <Text style={styles.precioTexto}>Bs {item.precioVenta} c/u</Text>
                  </View>
                  <View style={styles.stockBadge}>
                    <Text style={styles.stockTexto}>{item.cantidad} en stock</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* Historial de hoy con swipe para borrar */}
          {ventasHoy.length > 0 && (
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
          )}

        </View>

        {/* Modal cantidad */}
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Registrar venta</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textoGris} />
              </TouchableOpacity>
            </View>

            {productoSeleccionado && (
              <>
                <Text style={styles.modalProducto}>{productoSeleccionado.nombre}</Text>
                <Text style={styles.modalPrecio}>Bs {productoSeleccionado.precioVenta} c/u</Text>

                <Text style={styles.campoLabel}>Cantidad</Text>
                <View style={styles.selectorCantidad}>
                  <TouchableOpacity
                    style={styles.btnCantidad}
                    onPress={() => setCantidad(c => Math.max(1, c - 1))}
                  >
                    <Ionicons name="remove" size={24} color={COLORS.textoBlanco} />
                  </TouchableOpacity>
                  <Text style={styles.cantidadNumero}>{cantidad}</Text>
                  <TouchableOpacity
                    style={styles.btnCantidad}
                    onPress={() => setCantidad(c => Math.min(productoSeleccionado.cantidad, c + 1))}
                  >
                    <Ionicons name="add" size={24} color={COLORS.textoBlanco} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.totalTexto}>
                  Total: Bs {productoSeleccionado.precioVenta * cantidad}
                </Text>

                <TouchableOpacity style={styles.botonVender} onPress={confirmarVenta}>
                  <Text style={styles.botonVenderTexto}>Confirmar venta</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Modal>

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
  tarjeta: {
    backgroundColor: COLORS.tarjeta, borderRadius: 14,
    padding: 16, marginBottom: 10,
  },
  tarjetaFila: { flexDirection: 'row', alignItems: 'center' },
  nombreProducto: { fontSize: 16, fontWeight: '600', color: COLORS.textoBlanco },
  precioTexto: { fontSize: 13, color: COLORS.textoGris, marginTop: 2 },
  stockBadge: {
    backgroundColor: COLORS.secundario, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  stockTexto: { fontSize: 12, color: COLORS.textoGris },
  textoVacio: { color: COLORS.textoGris, fontSize: 14, marginTop: 8 },

  // Contenedor de ventas con fondo para que el swipe quede limpio
  listaVentas: {
    backgroundColor: COLORS.fondo,
    borderRadius: 14,
    overflow: 'hidden',
  },

  modal: { flex: 1, backgroundColor: COLORS.fondo, padding: 24 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24, marginTop: 16,
  },
  modalTitulo: { fontSize: 20, fontWeight: '700', color: COLORS.textoBlanco },
  modalProducto: { fontSize: 22, fontWeight: '600', color: COLORS.textoBlanco, marginBottom: 4 },
  modalPrecio: { fontSize: 16, color: COLORS.textoGris, marginBottom: 32 },
  campoLabel: { fontSize: 13, color: COLORS.textoGris, marginBottom: 12 },
  selectorCantidad: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 32, marginBottom: 24,
  },
  btnCantidad: {
    backgroundColor: COLORS.secundario, width: 48, height: 48,
    borderRadius: 24, justifyContent: 'center', alignItems: 'center',
  },
  cantidadNumero: { fontSize: 36, fontWeight: '700', color: COLORS.textoBlanco },
  totalTexto: {
    fontSize: 20, fontWeight: '600', color: COLORS.textoBlanco,
    textAlign: 'center', marginBottom: 32,
  },
  botonVender: {
    backgroundColor: COLORS.acento, borderRadius: 14,
    padding: 18, alignItems: 'center',
  },
  botonVenderTexto: { fontSize: 17, fontWeight: '600', color: COLORS.textoBlanco },
});