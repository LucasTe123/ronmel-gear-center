// ============================================
// SCREEN_SALES.JS - Pantalla de ventas
// Aquí se registran ventas y se ve el historial
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Modal, ScrollView,
  Alert, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from './colors_config';
import { getProductos } from './logic_inventory';
import { venderProducto, getVentasHoy, getResumenVentas } from './logic_sales';

export default function VentasScreen() {
  const [productos, setProductos] = useState([]);
  const [ventasHoy, setVentasHoy] = useState([]);
  const [resumen, setResumen] = useState({ cantidadHoy: 0, gananciaHoy: 0, gananciaMes: 0 });
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);

  // Recargar datos cada vez que entras a esta pantalla
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
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
      'Venta registrada',
      `${cantidad}x ${productoSeleccionado.nombre}\nGanancia: Bs ${resultado.venta.ganancia}`
    );
    cargarDatos();
  }

  function renderProducto({ item }) {
    return (
      <TouchableOpacity style={styles.tarjeta} onPress={() => abrirModal(item)}>
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
    );
  }

  function renderVenta({ item }) {
    const fecha = new Date(item.fecha);
    const hora = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={styles.ventaFila}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ventaNombre}>{item.nombreProducto}</Text>
          <Text style={styles.ventaHora}>{hora} · {item.cantidad} unidad{item.cantidad > 1 ? 'es' : ''}</Text>
        </View>
        <Text style={styles.ventaGanancia}>+Bs {item.ganancia}</Text>
      </View>
    );
  }

  if (cargando) return <ActivityIndicator color={COLORS.acento} style={{ marginTop: 40 }} />;

  return (
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

        {/* Productos disponibles */}
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

        {/* Historial de hoy */}
        {ventasHoy.length > 0 && (
          <>
            <Text style={styles.seccionTitulo}>Ventas de hoy</Text>
            {ventasHoy.map(item => (
              <View key={item.id} style={styles.ventaFila}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ventaNombre}>{item.nombreProducto}</Text>
                  <Text style={styles.ventaHora}>
                    {new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    · {item.cantidad} unidad{item.cantidad > 1 ? 'es' : ''}
                  </Text>
                </View>
                <Text style={styles.ventaGanancia}>+Bs {item.ganancia}</Text>
              </View>
            ))}
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

              {/* Selector de cantidad */}
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
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORS.fondo },
  contenedor: { padding: 16, paddingBottom: 40 },

  // Resumen
  filaTarjetas: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  tarjetaResumen: {
    backgroundColor: COLORS.tarjeta,
    borderRadius: 14,
    padding: 14,
    width: '31%',
    alignItems: 'center',
  },
  resumenLabel: { fontSize: 11, color: COLORS.textoGris, marginBottom: 6 },
  resumenNumero: { fontSize: 18, fontWeight: '700', color: COLORS.textoBlanco },

  // Productos
  seccionTitulo: {
    fontSize: 18, fontWeight: '600', color: COLORS.textoBlanco,
    marginBottom: 12, marginTop: 8, letterSpacing: -0.3,
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

  // Historial
  ventaFila: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.borde,
  },
  ventaNombre: { fontSize: 15, fontWeight: '500', color: COLORS.textoBlanco },
  ventaHora: { fontSize: 12, color: COLORS.textoGris, marginTop: 2 },
  ventaGanancia: { fontSize: 16, fontWeight: '600', color: COLORS.exito },

  // Modal
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