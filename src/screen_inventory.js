// ============================================
// SCREEN_INVENTORY.JS — CORREGIDO
// - Input de stock inline (sin modal anidado)
// - KeyboardAvoidingView para que no tape el teclado
// - Scroll automático al input cuando se abre
// ============================================
import ImageView from 'react-native-image-viewing';
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Modal, TextInput,
  Alert, ScrollView, ActivityIndicator,
  Image, Linking, Animated, Dimensions,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import {
  GestureHandlerRootView,
  Swipeable,
  PinchGestureHandler,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from './colors_config';
import { getProductos, agregarNuevoProducto, eliminarProducto, calcularGanancia, sumarStockProducto } from './logic_inventory';
import { seleccionarDeGaleria, tomarFoto } from './image_manager';
import { getVentas } from './storage_manager';

const { width: ANCHO, height: ALTO } = Dimensions.get('window');


// ============================================
// TARJETA CON SWIPE PARA BORRAR
// ============================================
function TarjetaProducto({ item, onEliminar, onVerDetalle }) {
  const swipeableRef = useRef(null);

  const renderBotonBorrar = (progress, dragX) => {
    const escalaX = dragX.interpolate({
      inputRange: [-160, -80, 0],
      outputRange: [1.6, 1, 1],
      extrapolate: 'clamp',
    });
    const escalaY = dragX.interpolate({
      inputRange: [-160, -80, 0],
      outputRange: [1.15, 1, 1],
      extrapolate: 'clamp',
    });
    const moverIcono = dragX.interpolate({
      inputRange: [-160, -80, 0],
      outputRange: [-20, 0, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.contenedorBorrar}>
        <Animated.View style={[
          styles.circuloBorrar,
          { transform: [{ scaleX: escalaX }, { scaleY: escalaY }] }
        ]}>
          <Animated.View style={{ transform: [{ translateX: moverIcono }] }}>
            <TouchableOpacity
              onPress={() => {
                swipeableRef.current?.close();
                onEliminar(item.id, item.nombre);
              }}
              style={styles.botonInterior}
            >
              <Ionicons name="trash" size={22} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    );
  };

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
      <TouchableOpacity
        onPress={() => onVerDetalle(item)}
        activeOpacity={0.85}
        style={styles.tarjeta}
      >
        {item.imagenes && item.imagenes.length > 0 ? (
          <Image
            source={{ uri: item.imagenes[0] }}
            style={styles.fotoMiniatura}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fotoPlaceholder}>
            <Ionicons name="cube-outline" size={26} color={COLORS.textoGris} />
          </View>
        )}
        <View style={styles.tarjetaInfo}>
          <Text style={styles.nombreProducto} numberOfLines={2}>{item.nombre}</Text>
          <Text style={[
            styles.stockTexto,
            { color: item.cantidad <= 2 ? COLORS.advertencia : COLORS.textoGris }
          ]}>
            Stock: {item.cantidad}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textoGris} />
      </TouchableOpacity>
    </Swipeable>
  );
}

// ============================================
// PANTALLA PRINCIPAL
// ============================================
export default function InventarioScreen() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [ventasProducto, setVentasProducto] = useState([]);
  const [imagenes, setImagenes] = useState([]);

  // Estado visor imagen — ahora maneja lista e índice
const [visorVisible, setVisorVisible] = useState(false);
const [visorImagenes, setVisorImagenes] = useState([]);
const [visorIndice, setVisorIndice] = useState(0);
  // ============================================
  // ESTADO PARA AÑADIR STOCK — AHORA ES INLINE
  // No hay modal separado, se expande dentro del detalle
  // ============================================
  const [stockPanelVisible, setStockPanelVisible] = useState(false);
  const [cantidadAAnadir, setCantidadAAnadir] = useState('');
  const inputStockRef = useRef(null);
  const scrollDetalleRef = useRef(null);

  const [form, setForm] = useState({
    nombre: '', precioCompra: '', precioVenta: '',
    cantidad: '', linkProveedor: '',
  });

  useFocusEffect(
    useCallback(() => { cargarProductos(); }, [])
  );

  async function cargarProductos() {
    setCargando(true);
    const data = await getProductos();
    setProductos(data);
    setCargando(false);
  }

  async function verDetalle(item) {
    // Resetea el panel de stock al abrir un nuevo detalle
    setStockPanelVisible(false);
    setCantidadAAnadir('');
    setProductoSeleccionado(item);
    setModalDetalle(true);
    const todasLasVentas = await getVentas();
    const ventasDeEste = todasLasVentas.filter(
      v => v.productoId === item.id || v.nombreProducto === item.nombre
    );
    setVentasProducto(ventasDeEste);
  }

  function abrirSelectorImagen() {
    Alert.alert('Agregar imagen', 'Elige una opción', [
      { text: 'Cámara', onPress: async () => {
        const uri = await tomarFoto();
        if (uri) setImagenes(prev => [...prev, uri]);
      }},
      { text: 'Galería', onPress: async () => {
        const uri = await seleccionarDeGaleria();
        if (uri) setImagenes(prev => [...prev, uri]);
      }},
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function guardarProducto() {
    if (!form.nombre || !form.precioCompra || !form.precioVenta || !form.cantidad) {
      Alert.alert('Error', 'Completa los campos obligatorios');
      return;
    }
    await agregarNuevoProducto({ ...form, imagenes });
    setForm({ nombre: '', precioCompra: '', precioVenta: '', cantidad: '', linkProveedor: '' });
    setImagenes([]);
    setModalAgregar(false);
    cargarProductos();
  }

 async function confirmarEliminar(id, nombre) {
  Alert.alert(
    'Eliminar producto',
    `¿Eliminar "${nombre}"?`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await eliminarProducto(id);

          cerrarPanelStock();
          setModalDetalle(false);
          setProductoSeleccionado(null);
          setVentasProducto([]);

          await cargarProductos();
        },
      },
    ]
  );
}

  // ============================================
  // ABRIR PANEL DE STOCK INLINE
  // Muestra el input dentro del ScrollView del detalle
  // ============================================
  function abrirPanelStock() {
    setStockPanelVisible(true);
    setCantidadAAnadir('');
    // Pequeño delay para que el panel se renderice antes de hacer focus
    setTimeout(() => {
      inputStockRef.current?.focus();
      // Scroll hacia abajo para que el input quede visible sobre el teclado
      scrollDetalleRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }

  function cerrarPanelStock() {
    Keyboard.dismiss();
    setStockPanelVisible(false);
    setCantidadAAnadir('');
  }

  // ============================================
  // FUNCIÓN AÑADIR STOCK
  // ============================================
  async function handleAnadirStock() {
    const cantidad = parseInt(cantidadAAnadir);

    if (isNaN(cantidad) || cantidad <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida mayor a 0');
      return;
    }

    Keyboard.dismiss();

    await sumarStockProducto(productoSeleccionado.id, cantidad);

    const productoActualizado = {
      ...productoSeleccionado,
      cantidad: productoSeleccionado.cantidad + cantidad,
    };
    setProductoSeleccionado(productoActualizado);

    cargarProductos();

    setStockPanelVisible(false);
    setCantidadAAnadir('');

    Alert.alert('✅ Listo', `Se añadieron ${cantidad} unidades al stock`);
  }

  if (cargando) {
    return (
      <View style={[styles.fondo, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.acento} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.fondo}>

        

        {/* Lista de productos o estado vacío */}
        {productos.length === 0 ? (
          <View style={styles.vacio}>
            <Ionicons name="cube-outline" size={56} color={COLORS.textoGris} />
            <Text style={styles.vacioTexto}>Sin productos aún</Text>
            <Text style={styles.vacioSub}>Toca + para agregar tu primer repuesto</Text>
          </View>
        ) : (
          <FlatList
            data={productos}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TarjetaProducto
                item={item}
                onEliminar={confirmarEliminar}
                onVerDetalle={verDetalle}
              />
            )}
            contentContainerStyle={styles.lista}
            ItemSeparatorComponent={() => <View style={styles.separador} />}
          />
        )}

        {/* Botón flotante para agregar producto */}
        <TouchableOpacity
          style={styles.botonFlotante}
          onPress={() => setModalAgregar(true)}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>

        {/* ===================== MODAL DETALLE ===================== */}
        <Modal
          visible={modalDetalle}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            cerrarPanelStock();
            setModalDetalle(false);
          }}
        >
          {/* Visor de imagen a pantalla completa */}
        <ImageView
  images={visorImagenes}
  imageIndex={visorIndice}
  visible={visorVisible}
  onRequestClose={() => setVisorVisible(false)}
  swipeToCloseEnabled={true}
  doubleTapToZoomEnabled={true}
/>
          {productoSeleccionado && (
            /*
              KeyboardAvoidingView evita que el teclado tape el contenido.
              En iOS usa 'padding', en Android usa 'height'.
            */
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              <View style={styles.modal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitulo} numberOfLines={2}>
                    {productoSeleccionado.nombre}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    cerrarPanelStock();
                    setModalDetalle(false);
                  }}>
                    <Ionicons name="close" size={24} color={COLORS.textoGris} />
                  </TouchableOpacity>
                </View>

                {/* ref en el ScrollView para poder hacer scrollToEnd */}
                <ScrollView
                  ref={scrollDetalleRef}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >

                  {/* Fotos del producto */}
                  {productoSeleccionado.imagenes && productoSeleccionado.imagenes.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                      {productoSeleccionado.imagenes.map((uri, index) => (
                        <TouchableOpacity
                          key={index}
                          style={{ position: 'relative', marginRight: 10 }}
                          onPress={() => {
  setVisorImagenes(
    productoSeleccionado.imagenes.map(i => ({ uri: i }))
  );
  setVisorIndice(index);
  setVisorVisible(true);
}}
                          activeOpacity={0.85}
                        >
                          <Image source={{ uri }} style={styles.imagenDetalle} resizeMode="cover" />
                          <View style={styles.lupaOverlay}>
                            <Ionicons name="search" size={14} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Grid de datos */}
                  <View style={styles.datosGrid}>
                    <View style={styles.datoBloque}>
                      <Text style={styles.datoLabel}>Stock actual</Text>
                      <Text style={[
                        styles.datoValor,
                        { color: productoSeleccionado.cantidad <= 2 ? COLORS.advertencia : COLORS.textoBlanco }
                      ]}>
                        {productoSeleccionado.cantidad}
                      </Text>
                    </View>
                    <View style={styles.datoBloque}>
                      <Text style={styles.datoLabel}>Ganancia unitaria</Text>
                      <Text style={[styles.datoValor, { color: COLORS.acento }]}>
                        Bs {calcularGanancia(productoSeleccionado.precioCompra, productoSeleccionado.precioVenta).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.datoBloque}>
                      <Text style={styles.datoLabel}>Precio compra</Text>
                      <Text style={styles.datoValor}>Bs {productoSeleccionado.precioCompra}</Text>
                    </View>
                    <View style={styles.datoBloque}>
                      <Text style={styles.datoLabel}>Precio venta</Text>
                      <Text style={styles.datoValor}>Bs {productoSeleccionado.precioVenta}</Text>
                    </View>
                  </View>

                  {/* ============================================ */}
                  {/* BOTÓN AÑADIR STOCK — abre panel inline       */}
                  {/* ============================================ */}
                  {!stockPanelVisible ? (
                    <TouchableOpacity
                      style={styles.botonAnadirStock}
                      onPress={abrirPanelStock}
                    >
                      <Ionicons name="add-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.textoBotonStock}>Añadir Stock</Text>
                    </TouchableOpacity>
                  ) : (
                    /* ============================================ */
                    /* PANEL INLINE DE STOCK                        */
                    /* Aparece en lugar del botón, dentro del       */
                    /* ScrollView, visible sin tapar nada           */
                    /* ============================================ */
                    <View style={styles.panelStock}>
                      <Text style={styles.panelStockTitulo}>¿Cuántas unidades llegaron?</Text>

                      <View style={styles.panelStockFila}>
                        <TextInput
                          ref={inputStockRef}
                          style={styles.inputStockInline}
                          placeholder="0"
                          placeholderTextColor={COLORS.textoGris}
                          keyboardType="number-pad"
                          value={cantidadAAnadir}
                          onChangeText={setCantidadAAnadir}
                          returnKeyType="done"
                          onSubmitEditing={handleAnadirStock}
                        />

                        <TouchableOpacity
                          style={styles.botonConfirmarInline}
                          onPress={handleAnadirStock}
                        >
                          <Ionicons name="checkmark" size={22} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.botonCancelarInline}
                          onPress={cerrarPanelStock}
                        >
                          <Ionicons name="close" size={22} color={COLORS.textoGris} />
                        </TouchableOpacity>
                      </View>

                      {/* Muestra el nuevo total en tiempo real */}
                      {cantidadAAnadir !== '' && !isNaN(parseInt(cantidadAAnadir)) && parseInt(cantidadAAnadir) > 0 && (
                        <Text style={styles.panelStockPreview}>
                          Nuevo stock: {productoSeleccionado.cantidad + parseInt(cantidadAAnadir)} unidades
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Historial de ventas de este producto */}
                  <View style={styles.seccionVentas}>
                    <Text style={styles.seccionTitulo}>Ventas de este producto</Text>
                    {ventasProducto.length === 0 ? (
                      <Text style={styles.sinVentas}>Sin ventas registradas aún</Text>
                    ) : (
                      <>
                        <View style={styles.resumenVentas}>
                          <View style={styles.resumenBloque}>
                            <Text style={styles.datoLabel}>Unidades vendidas</Text>
                            <Text style={styles.datoValor}>
                              {ventasProducto.reduce((acc, v) => acc + v.cantidad, 0)}
                            </Text>
                          </View>
                          <View style={styles.resumenBloque}>
                            <Text style={styles.datoLabel}>Total generado</Text>
                            <Text style={[styles.datoValor, { color: COLORS.acento }]}>
                              Bs {ventasProducto.reduce((acc, v) => acc + (v.precioVenta * v.cantidad), 0).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Link proveedor */}
                  {productoSeleccionado.linkProveedor ? (
                    <TouchableOpacity
                      style={styles.botonLink}
                      onPress={() => Linking.openURL(productoSeleccionado.linkProveedor)}
                    >
                      <Ionicons name="link-outline" size={20} color={COLORS.acento} />
                      <Text style={styles.botonLinkTexto}>Ver proveedor</Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Botón eliminar */}
                  <TouchableOpacity
                    style={styles.botonEliminar}
                    onPress={() => confirmarEliminar(productoSeleccionado.id, productoSeleccionado.nombre)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.botonEliminarTexto}>Eliminar producto</Text>
                  </TouchableOpacity>

                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          )}
        </Modal>

        {/* ===================== MODAL AGREGAR ===================== */}
        <Modal visible={modalAgregar} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Nuevo Producto</Text>
              <TouchableOpacity onPress={() => { setModalAgregar(false); setImagenes([]); }}>
                <Ionicons name="close" size={24} color={COLORS.textoGris} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.campoLabel}>Imágenes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {imagenes.map((uri, index) => (
                  <View key={index} style={styles.imagenPreviewContainer}>
                    <Image source={{ uri }} style={styles.imagenPreview} />
                    <TouchableOpacity
                      style={styles.eliminarImagen}
                      onPress={() => setImagenes(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.botonAgregarImagen} onPress={abrirSelectorImagen}>
                  <Ionicons name="camera-outline" size={28} color={COLORS.textoGris} />
                  <Text style={styles.botonAgregarImagenTexto}>Agregar</Text>
                </TouchableOpacity>
              </ScrollView>

              {[
                { key: 'nombre', label: 'Nombre del producto', placeholder: 'Ej: Sincronizador 3ra' },
                { key: 'precioCompra', label: 'Precio de compra (Bs)', placeholder: '0', keyboard: 'numeric' },
                { key: 'precioVenta', label: 'Precio de venta (Bs)', placeholder: '0', keyboard: 'numeric' },
                { key: 'cantidad', label: 'Cantidad en stock', placeholder: '0', keyboard: 'numeric' },
                { key: 'linkProveedor', label: 'Link proveedor (opcional)', placeholder: 'https://...' },
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
    </GestureHandlerRootView>
  );
}

// ============================================
// ESTILOS
// ============================================
const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORS.fondo },
  lista: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  separador: { height: 8 },

  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.tarjeta,
    borderRadius: 14,
    gap: 12,
  },
  fotoMiniatura: { width: 56, height: 56, borderRadius: 10 },
  fotoPlaceholder: {
    width: 56, height: 56, borderRadius: 10,
    backgroundColor: COLORS.fondo,
    justifyContent: 'center', alignItems: 'center',
  },
  tarjetaInfo: { flex: 1 },
  nombreProducto: { fontSize: 15, fontWeight: '600', color: COLORS.textoBlanco, marginBottom: 3 },
  stockTexto: { fontSize: 13 },

  contenedorBorrar: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fondo,
  },
  circuloBorrar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
  },
  botonInterior: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },

  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  vacioTexto: { fontSize: 18, fontWeight: '600', color: COLORS.textoBlanco, marginTop: 16 },
  vacioSub: { fontSize: 14, color: COLORS.textoGris, marginTop: 6 },

  botonFlotante: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: COLORS.acento, width: 58, height: 58,
    borderRadius: 29, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.acento, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },

  modal: { flex: 1, backgroundColor: COLORS.fondo, padding: 20 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24, marginTop: 16,
  },
  modalTitulo: { fontSize: 20, fontWeight: '700', color: COLORS.textoBlanco, flex: 1, marginRight: 12 },
  imagenDetalle: { width: 220, height: 160, borderRadius: 12, marginRight: 10 },
  lupaOverlay: {
    position: 'absolute', bottom: 8, right: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, padding: 4,
  },

  datosGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: COLORS.tarjeta, borderRadius: 14,
    marginBottom: 16, padding: 4,
  },
  datoBloque: { width: '50%', alignItems: 'center', paddingVertical: 16 },
  datoLabel: { fontSize: 12, color: COLORS.textoGris, marginBottom: 4 },
  datoValor: { fontSize: 18, fontWeight: '700', color: COLORS.textoBlanco },

  // ============================================
  // BOTÓN AÑADIR STOCK (cuando el panel está cerrado)
  // ============================================
  botonAnadirStock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.acento,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  textoBotonStock: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // ============================================
  // PANEL INLINE DE STOCK
  // Reemplaza el modal flotante — vive dentro del ScrollView
  // ============================================
  panelStock: {
    backgroundColor: COLORS.tarjeta,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  panelStockTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textoBlanco,
    marginBottom: 12,
    textAlign: 'center',
  },
  panelStockFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputStockInline: {
    flex: 1,
    backgroundColor: COLORS.fondo,
    borderRadius: 10,
    padding: 14,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textoBlanco,
    textAlign: 'center',
  },
  botonConfirmarInline: {
    backgroundColor: COLORS.acento,
    borderRadius: 10,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCancelarInline: {
    backgroundColor: COLORS.tarjeta,
    borderRadius: 10,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borde,
  },
  panelStockPreview: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.acento,
    fontWeight: '500',
  },

  seccionVentas: {
    backgroundColor: COLORS.tarjeta,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  seccionTitulo: { fontSize: 15, fontWeight: '700', color: COLORS.textoBlanco, marginBottom: 12 },
  sinVentas: { fontSize: 13, color: COLORS.textoGris, textAlign: 'center', paddingVertical: 12 },
  resumenVentas: { flexDirection: 'row' },
  resumenBloque: { flex: 1, alignItems: 'center' },

  botonLink: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.tarjeta, borderRadius: 12,
    padding: 16, marginBottom: 12, gap: 8,
  },
  botonLinkTexto: { color: COLORS.acento, fontSize: 15, fontWeight: '500' },
  botonEliminar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ff3b30', borderRadius: 12,
    padding: 16, marginBottom: 40, gap: 8,
  },
  botonEliminarTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },

  imagenPreviewContainer: { position: 'relative', marginRight: 10 },
  imagenPreview: { width: 90, height: 90, borderRadius: 10 },
  eliminarImagen: { position: 'absolute', top: -6, right: -6 },
  botonAgregarImagen: {
    width: 90, height: 90, borderRadius: 10,
    backgroundColor: COLORS.tarjeta, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.borde, borderStyle: 'dashed',
  },
  botonAgregarImagenTexto: { fontSize: 11, color: COLORS.textoGris, marginTop: 4 },
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