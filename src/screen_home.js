// ============================================
// SCREEN_HOME.JS - con animación de venta conectada
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  Modal, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from './colors_config';
import BigButton from './component_big_button';
import { getResumenInventario, getProductos } from './logic_inventory';
import { getResumenVentas, venderProducto } from './logic_sales';
import SuccessPayment from './SuccessPayment';
import NumeroRuleta from './NumeroRuleta';

export default function HomeScreen({ navigation }) {
  const [inventario, setInventario] = useState({
    totalProductos: 0, totalInvertido: 0, totalGanancia: 0,
  });
  const [ventas, setVentas] = useState({
    cantidadHoy: 0, gananciaHoy: 0, gananciaMes: 0,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [productos, setProductos] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [datosVenta, setDatosVenta] = useState({
    ganancia: 0, totalVenta: 0, nombreProducto: '', cantidad: 1,
  });

  useFocusEffect(
    useCallback(() => { cargarDatos(); }, [])
  );

  async function cargarDatos() {
    const [resInv, resVentas, prods] = await Promise.all([
      getResumenInventario(),
      getResumenVentas(),
      getProductos(),
    ]);
    setInventario(resInv);
    setVentas(resVentas);
    setProductos(prods);
  }

  function getSaludo() {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
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

    setDatosVenta({
      ganancia: resultado.venta.ganancia,
      totalVenta: productoSeleccionado.precioVenta * cantidad,
      nombreProducto: productoSeleccionado.nombre,
      cantidad: cantidad,
    });

    setShowSuccess(true);
    cargarDatos();
  }

  return (
    <ScrollView style={styles.fondo} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />
      <View style={styles.contenedor}>

        <Text style={styles.saludo}>{getSaludo()}</Text>
        <Text style={styles.titulo}>Ronmel Gear Center</Text>

        {/* Tarjetas inventario */}
        <Text style={styles.seccionTitulo}>Inventario</Text>
        <View style={styles.filaTarjetas}>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Productos</Text>
            <NumeroRuleta
              valor={inventario.totalProductos}
              style={styles.tarjetaNumero}
            />
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Invertido</Text>
            <NumeroRuleta
              valor={inventario.totalInvertido}
              prefix="Bs "
              style={styles.tarjetaNumero}
            />
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Ganancia pot.</Text>
            <NumeroRuleta
              valor={inventario.totalGanancia}
              prefix="Bs "
              style={[styles.tarjetaNumero, { color: COLORS.exito }]}
            />
          </View>
        </View>

        {/* Tarjetas ventas */}
        <Text style={styles.seccionTitulo}>Ventas</Text>
        <View style={styles.filaTarjetas}>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Ventas hoy</Text>
            <NumeroRuleta
              valor={ventas.cantidadHoy}
              style={styles.tarjetaNumero}
            />
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Ganancia hoy</Text>
            <NumeroRuleta
              valor={ventas.gananciaHoy}
              prefix="Bs "
              style={[styles.tarjetaNumero, { color: COLORS.exito }]}
            />
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaLabel}>Este mes</Text>
            <NumeroRuleta
              valor={ventas.gananciaMes}
              prefix="Bs "
              style={[styles.tarjetaNumero, { color: COLORS.acento }]}
            />
          </View>
        </View>

        <Text style={styles.seccionTitulo}>Acciones</Text>
        <BigButton
          titulo="Ver Inventario"
          onPress={() => navigation.navigate('Inventario')}
          variante="glass"
        />
        <BigButton
          titulo="Registrar Venta"
          onPress={() => setModalVisible(true)}
          variante="solido"
          color={COLORS.acento}
        />

      </View>

      {/* Modal de selección de producto */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>Registrar venta</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.textoGris} />
            </TouchableOpacity>
          </View>

          {productoSeleccionado ? (
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

              <TouchableOpacity
                style={styles.botonVolver}
                onPress={() => setProductoSeleccionado(null)}
              >
                <Text style={styles.botonVolverTexto}>← Cambiar producto</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.botonVender} onPress={confirmarVenta}>
                <Text style={styles.botonVenderTexto}>Confirmar venta</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {productos.length === 0 ? (
                <Text style={styles.textoVacio}>Agrega productos desde Inventario primero</Text>
              ) : (
                productos.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.tarjetaProducto}
                    onPress={() => abrirModal(item)}
                  >
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
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Animación de éxito */}
      <SuccessPayment
        visible={showSuccess}
        ganancia={datosVenta.ganancia}
        totalVenta={datosVenta.totalVenta}
        nombreProducto={datosVenta.nombreProducto}
        cantidad={datosVenta.cantidad}
        onFinish={() => setShowSuccess(false)}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORS.fondo },
  contenedor: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  saludo: { fontSize: 15, color: COLORS.textoGris, fontWeight: '400', marginBottom: 4 },
  titulo: { fontSize: 28, fontWeight: '700', color: COLORS.textoBlanco, marginBottom: 28, letterSpacing: -0.5 },
  seccionTitulo: { fontSize: 18, fontWeight: '600', color: COLORS.textoBlanco, marginBottom: 12, marginTop: 8, letterSpacing: -0.3 },
  filaTarjetas: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tarjeta: { backgroundColor: COLORS.tarjeta, borderRadius: 14, padding: 14, width: '31%' },
  tarjetaLabel: { fontSize: 11, color: COLORS.textoGris, marginBottom: 6 },
  tarjetaNumero: { fontSize: 16, fontWeight: '600', color: COLORS.textoBlanco, letterSpacing: -0.3 },

  modal: { flex: 1, backgroundColor: COLORS.fondo, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 16 },
  modalTitulo: { fontSize: 20, fontWeight: '700', color: COLORS.textoBlanco },
  modalProducto: { fontSize: 22, fontWeight: '600', color: COLORS.textoBlanco, marginBottom: 4 },
  modalPrecio: { fontSize: 16, color: COLORS.textoGris, marginBottom: 32 },
  campoLabel: { fontSize: 13, color: COLORS.textoGris, marginBottom: 12 },
  selectorCantidad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 24 },
  btnCantidad: { backgroundColor: COLORS.secundario, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  cantidadNumero: { fontSize: 36, fontWeight: '700', color: COLORS.textoBlanco },
  totalTexto: { fontSize: 20, fontWeight: '600', color: COLORS.textoBlanco, textAlign: 'center', marginBottom: 16 },
  botonVolver: { alignItems: 'center', marginBottom: 16 },
  botonVolverTexto: { fontSize: 14, color: COLORS.textoGris },
  botonVender: { backgroundColor: COLORS.acento, borderRadius: 14, padding: 18, alignItems: 'center' },
  botonVenderTexto: { fontSize: 17, fontWeight: '600', color: COLORS.textoBlanco },
  tarjetaProducto: { backgroundColor: COLORS.tarjeta, borderRadius: 14, padding: 16, marginBottom: 10 },
  tarjetaFila: { flexDirection: 'row', alignItems: 'center' },
  nombreProducto: { fontSize: 16, fontWeight: '600', color: COLORS.textoBlanco },
  precioTexto: { fontSize: 13, color: COLORS.textoGris, marginTop: 2 },
  stockBadge: { backgroundColor: COLORS.secundario, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  stockTexto: { fontSize: 12, color: COLORS.textoGris },
  textoVacio: { color: COLORS.textoGris, fontSize: 14, marginTop: 8 },
});