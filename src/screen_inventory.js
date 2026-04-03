// ============================================
// SCREEN_INVENTORY.JS - Pantalla de inventario con imágenes
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Modal, TextInput,
  Alert, ScrollView, ActivityIndicator,
  Image, ActionSheetIOS, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from './colors_config';
import { getProductos, agregarNuevoProducto, eliminarProducto, calcularGanancia } from './logic_inventory';
import { seleccionarDeGaleria, tomarFoto } from './image_manager';

export default function InventarioScreen() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [imagenes, setImagenes] = useState([]);
  const [form, setForm] = useState({
    nombre: '',
    precioCompra: '',
    precioVenta: '',
    cantidad: '',
    linkProveedor: '',
  });

  useFocusEffect(
    useCallback(() => {
      cargarProductos();
    }, [])
  );

  async function cargarProductos() {
    setCargando(true);
    const data = await getProductos();
    setProductos(data);
    setCargando(false);
  }

  // Mostrar opciones para agregar imagen
  function abrirSelectorImagen() {
    Alert.alert(
      'Agregar imagen',
      'Elige una opción',
      [
        { text: 'Cámara', onPress: async () => {
          const uri = await tomarFoto();
          if (uri) setImagenes(prev => [...prev, uri]);
        }},
        { text: 'Galería', onPress: async () => {
          const uri = await seleccionarDeGaleria();
          if (uri) setImagenes(prev => [...prev, uri]);
        }},
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  function eliminarImagen(index) {
    setImagenes(prev => prev.filter((_, i) => i !== index));
  }

  async function guardarProducto() {
    if (!form.nombre || !form.precioCompra || !form.precioVenta || !form.cantidad) {
      Alert.alert('Campos incompletos', 'Completa nombre, precios y cantidad.');
      return;
    }
    await agregarNuevoProducto({ ...form, imagenes });
    setModalVisible(false);
    setForm({ nombre: '', precioCompra: '', precioVenta: '', cantidad: '', linkProveedor: '' });
    setImagenes([]);
    cargarProductos();
  }

  async function confirmarEliminar(id, nombre) {
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar "${nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await eliminarProducto(id);
          cargarProductos();
        }},
      ]
    );
  }

  function renderProducto({ item }) {
    const ganancia = calcularGanancia(item.precioCompra, item.precioVenta);
    return (
      <View style={styles.tarjeta}>

        {/* Imagen del producto si tiene */}
        {item.imagenes && item.imagenes.length > 0 && (
          <Image
            source={{ uri: item.imagenes[0] }}
            style={styles.imagenProducto}
            resizeMode="cover"
          />
        )}

        <View style={styles.tarjetaFila}>
          <Text style={styles.nombreProducto}>{item.nombre}</Text>
          <TouchableOpacity onPress={() => confirmarEliminar(item.id, item.nombre)}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.tarjetaFila}>
          <View style={styles.dato}>
            <Text style={styles.datoLabel}>Compra</Text>
            <Text style={styles.datoValor}>Bs {item.precioCompra}</Text>
          </View>
          <View style={styles.dato}>
            <Text style={styles.datoLabel}>Venta</Text>
            <Text style={styles.datoValor}>Bs {item.precioVenta}</Text>
          </View>
          <View style={styles.dato}>
            <Text style={styles.datoLabel}>Ganancia</Text>
            <Text style={[styles.datoValor, { color: COLORS.exito }]}>Bs {ganancia}</Text>
          </View>
          <View style={styles.dato}>
            <Text style={styles.datoLabel}>Stock</Text>
            <Text style={[styles.datoValor, {
              color: item.cantidad <= 2 ? COLORS.advertencia : COLORS.textoBlanco
            }]}>{item.cantidad}</Text>
          </View>
        </View>

      </View>
    );
  }

  return (
    <View style={styles.fondo}>

      {cargando ? (
        <ActivityIndicator color={COLORS.acento} style={{ marginTop: 40 }} />
      ) : productos.length === 0 ? (
        <View style={styles.vacio}>
          <Ionicons name="cube-outline" size={60} color={COLORS.textoGris} />
          <Text style={styles.vacioTexto}>Sin productos aún</Text>
          <Text style={styles.vacioSub}>Toca + para agregar el primero</Text>
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={item => item.id}
          renderItem={renderProducto}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      {/* Botón flotante */}
      <TouchableOpacity style={styles.botonFlotante} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color={COLORS.textoBlanco} />
      </TouchableOpacity>

      {/* Modal agregar producto */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>Nuevo Producto</Text>
            <TouchableOpacity onPress={() => {
              setModalVisible(false);
              setImagenes([]);
            }}>
              <Ionicons name="close" size={24} color={COLORS.textoGris} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Selector de imágenes */}
            <Text style={styles.campoLabel}>Imágenes del producto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {/* Imágenes agregadas */}
              {imagenes.map((uri, index) => (
                <View key={index} style={styles.imagenPreviewContainer}>
                  <Image source={{ uri }} style={styles.imagenPreview} />
                  <TouchableOpacity
                    style={styles.eliminarImagen}
                    onPress={() => eliminarImagen(index)}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Botón agregar imagen */}
              <TouchableOpacity style={styles.botonAgregarImagen} onPress={abrirSelectorImagen}>
                <Ionicons name="camera-outline" size={28} color={COLORS.textoGris} />
                <Text style={styles.botonAgregarImagenTexto}>Agregar</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Campos del formulario */}
            {[
              { key: 'nombre', label: 'Nombre del producto', placeholder: 'Ej: Sincronizador 3ra' },
              { key: 'precioCompra', label: 'Precio de compra (Bs)', placeholder: '0', keyboard: 'numeric' },
              { key: 'precioVenta', label: 'Precio de venta (Bs)', placeholder: '0', keyboard: 'numeric' },
              { key: 'cantidad', label: 'Cantidad en stock', placeholder: '0', keyboard: 'numeric' },
              { key: 'linkProveedor', label: 'Link del proveedor (opcional)', placeholder: 'https://...' },
            ].map(campo => (
              <View key={campo.key} style={styles.campo}>
                <Text style={styles.campoLabel}>{campo.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={campo.placeholder}
                  placeholderTextColor={COLORS.textoGris}
                  keyboardType={campo.keyboard || 'default'}
                  value={form[campo.key]}
                  onChangeText={val => setForm({ ...form, [campo.key]: val })}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.botonGuardar} onPress={guardarProducto}>
              <Text style={styles.botonGuardarTexto}>Guardar Producto</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORS.fondo },

  // Tarjeta producto
  tarjeta: {
    backgroundColor: COLORS.tarjeta, borderRadius: 14,
    marginBottom: 12, overflow: 'hidden',
  },
  imagenProducto: { width: '100%', height: 160 },
  tarjetaFila: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12, paddingHorizontal: 16, paddingTop: 12,
  },
  nombreProducto: { fontSize: 16, fontWeight: '600', color: COLORS.textoBlanco },
  dato: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  datoLabel: { fontSize: 11, color: COLORS.textoGris, marginBottom: 2 },
  datoValor: { fontSize: 15, fontWeight: '600', color: COLORS.textoBlanco },

  // Estado vacío
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  vacioTexto: { fontSize: 18, fontWeight: '600', color: COLORS.textoBlanco, marginTop: 16 },
  vacioSub: { fontSize: 14, color: COLORS.textoGris, marginTop: 6 },

  // Botón flotante
  botonFlotante: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: COLORS.acento, width: 58, height: 58,
    borderRadius: 29, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.acento, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },

  // Modal
  modal: { flex: 1, backgroundColor: COLORS.fondo, padding: 20 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24, marginTop: 16,
  },
  modalTitulo: { fontSize: 20, fontWeight: '700', color: COLORS.textoBlanco },

  // Imágenes
  imagenPreviewContainer: { position: 'relative', marginRight: 10 },
  imagenPreview: { width: 90, height: 90, borderRadius: 10 },
  eliminarImagen: { position: 'absolute', top: -6, right: -6 },
  botonAgregarImagen: {
    width: 90, height: 90, borderRadius: 10,
    backgroundColor: COLORS.tarjeta, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.borde,
    borderStyle: 'dashed',
  },
  botonAgregarImagenTexto: { fontSize: 11, color: COLORS.textoGris, marginTop: 4 },

  // Formulario
  campo: { marginBottom: 16 },
  campoLabel: { fontSize: 13, color: COLORS.textoGris, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.tarjeta, borderRadius: 10,
    padding: 14, fontSize: 16, color: COLORS.textoBlanco,
  },
  botonGuardar: {
    backgroundColor: COLORS.acento, borderRadius: 12,
    padding: 18, alignItems: 'center', marginTop: 8, marginBottom: 40,
  },
  botonGuardarTexto: { fontSize: 17, fontWeight: '600', color: COLORS.textoBlanco },
});