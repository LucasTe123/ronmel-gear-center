// ============================================
// SCREEN_INVENTORY.JS
// Tarjeta delgada + swipe borrar + visor imagen con zoom
// ============================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Modal, TextInput,
  Alert, ScrollView, ActivityIndicator,
  Image, Linking, Animated, Dimensions,
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
import { getProductos, agregarNuevoProducto, eliminarProducto, calcularGanancia } from './logic_inventory';
import { seleccionarDeGaleria, tomarFoto } from './image_manager';
import { getVentas } from './storage_manager';

const { width: ANCHO, height: ALTO } = Dimensions.get('window');

// ============================================
// VISOR DE IMAGEN CON ZOOM Y ARRASTRE
// Pellizca para zoom hasta 4x
// Arrastra para mover
// Doble tap para resetear
// ============================================
function VisorImagen({ uri, visible, onCerrar }) {
  const escala = useRef(new Animated.Value(1)).current;
  const escalaBase = useRef(1);
  const traduccionX = useRef(new Animated.Value(0)).current;
  const traduccionY = useRef(new Animated.Value(0)).current;
  const posicionBase = useRef({ x: 0, y: 0 });
  const ultimoTap = useRef(0);

  function cerrar() {
    escala.setValue(1);
    escalaBase.current = 1;
    traduccionX.setValue(0);
    traduccionY.setValue(0);
    posicionBase.current = { x: 0, y: 0 };
    onCerrar();
  }

  function manejarTap() {
    const ahora = Date.now();
    if (ahora - ultimoTap.current < 300) {
      // Doble tap: resetea zoom y posición
      Animated.spring(escala, { toValue: 1, useNativeDriver: true }).start();
      Animated.spring(traduccionX, { toValue: 0, useNativeDriver: true }).start();
      Animated.spring(traduccionY, { toValue: 0, useNativeDriver: true }).start();
      escalaBase.current = 1;
      posicionBase.current = { x: 0, y: 0 };
    }
    ultimoTap.current = ahora;
  }

  const manejarPellizco = Animated.event(
    [{ nativeEvent: { scale: escala } }],
    { useNativeDriver: true }
  );

  function alSoltarPellizco(event) {
    if (event.nativeEvent.state === State.END) {
      const nuevaEscala = escalaBase.current * event.nativeEvent.scale;
      const escalaFinal = Math.min(Math.max(nuevaEscala, 1), 4);
      escalaBase.current = escalaFinal;
      escala.setValue(escalaFinal);
    }
  }

  const manejarArrastre = Animated.event(
    [{ nativeEvent: { translationX: traduccionX, translationY: traduccionY } }],
    { useNativeDriver: true }
  );

  function alSoltarArrastre(event) {
    if (event.nativeEvent.state === State.END) {
      posicionBase.current = {
        x: posicionBase.current.x + event.nativeEvent.translationX,
        y: posicionBase.current.y + event.nativeEvent.translationY,
      };
      traduccionX.setValue(posicionBase.current.x);
      traduccionY.setValue(posicionBase.current.y);
    }
  }

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={visorEstilos.fondo}>

        {/* Botón cerrar */}
        <TouchableOpacity style={visorEstilos.botonCerrar} onPress={cerrar}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        {/* Texto ayuda abajo */}
        <Text style={visorEstilos.ayuda}>Pellizca · Arrastra · Doble tap para resetear</Text>

        {/* Imagen con zoom y arrastre */}
        <PanGestureHandler
          onGestureEvent={manejarArrastre}
          onHandlerStateChange={alSoltarArrastre}
        >
          <Animated.View>
            <PinchGestureHandler
              onGestureEvent={manejarPellizco}
              onHandlerStateChange={alSoltarPellizco}
            >
              <Animated.Image
                source={{ uri }}
                style={[
                  visorEstilos.imagen,
                  {
                    transform: [
                      { scale: escala },
                      { translateX: traduccionX },
                      { translateY: traduccionY },
                    ],
                  },
                ]}
                resizeMode="contain"
              />
            </PinchGestureHandler>
          </Animated.View>
        </PanGestureHandler>

        {/* Zona invisible para detectar doble tap */}
        <TouchableOpacity
          style={visorEstilos.zonaTap}
          onPress={manejarTap}
          activeOpacity={1}
        />

      </View>
    </Modal>
  );
}

const visorEstilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.97)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonCerrar: {
    position: 'absolute', top: 56, right: 20, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, padding: 8,
  },
  ayuda: {
    position: 'absolute', bottom: 48,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12, zIndex: 10,
  },
  imagen: {
    width: ANCHO,
    height: ALTO * 0.75,
  },
  zonaTap: {
    position: 'absolute',
    width: ANCHO,
    height: ALTO * 0.75,
    zIndex: 1,
  },
});

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

  // Estado visor imagen
  const [imagenVisor, setImagenVisor] = useState(null);
  const [visorVisible, setVisorVisible] = useState(false);

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
      Alert.alert('Campos incompletos', 'Completa nombre, precios y cantidad.');
      return;
    }
    await agregarNuevoProducto({ ...form, imagenes });
    setModalAgregar(false);
    setForm({ nombre: '', precioCompra: '', precioVenta: '', cantidad: '', linkProveedor: '' });
    setImagenes([]);
    cargarProductos();
  }

  async function eliminarItem(id, nombre) {
    Alert.alert('Eliminar', `¿Eliminar "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await eliminarProducto(id);
        setModalDetalle(false);
        cargarProductos();
      }},
    ]);
  }

  function totalUnidades(ventas) {
    return ventas.reduce((sum, v) => sum + (Number(v.cantidad) || 0), 0);
  }

  function totalRecaudado(ventas) {
    return ventas.reduce((sum, v) => sum + (Number(v.total) || 0), 0).toFixed(0);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
            renderItem={({ item }) => (
              <TarjetaProducto
                item={item}
                onEliminar={eliminarItem}
                onVerDetalle={verDetalle}
              />
            )}
            contentContainerStyle={styles.lista}
            scrollEventThrottle={16}
            directionalLockEnabled={true}
            ItemSeparatorComponent={() => <View style={styles.separador} />}
          />
        )}

        {/* Botón flotante */}
        <TouchableOpacity style={styles.botonFlotante} onPress={() => setModalAgregar(true)}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        {/* ===================== MODAL DETALLE ===================== */}
        <Modal visible={modalDetalle} animationType="slide" presentationStyle="pageSheet">
          {productoSeleccionado && (
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitulo} numberOfLines={1}>
                  {productoSeleccionado.nombre}
                </Text>
                <TouchableOpacity onPress={() => setModalDetalle(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textoGris} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>

                {/* Galería — toca para ver en grande con zoom */}
                {productoSeleccionado.imagenes?.length > 0 && (
                  <>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 20 }}
                    >
                      {productoSeleccionado.imagenes.map((uri, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => {
                            setImagenVisor(uri);
                            setVisorVisible(true);
                          }}
                          activeOpacity={0.85}
                        >
                          <Image
                            source={{ uri }}
                            style={styles.imagenDetalle}
                            resizeMode="cover"
                          />
                          {/* Ícono lupa en esquina */}
                          <View style={styles.lupaOverlay}>
                            <Ionicons name="expand-outline" size={14} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Visor pantalla completa */}
                    <VisorImagen
                      uri={imagenVisor}
                      visible={visorVisible}
                      onCerrar={() => setVisorVisible(false)}
                    />
                  </>
                )}

                {/* Grid de datos */}
                <View style={styles.datosGrid}>
                  <View style={styles.datoBloque}>
                    <Text style={styles.datoLabel}>Compra</Text>
                    <Text style={styles.datoValor}>Bs {productoSeleccionado.precioCompra}</Text>
                  </View>
                  <View style={styles.datoBloque}>
                    <Text style={styles.datoLabel}>Venta</Text>
                    <Text style={styles.datoValor}>Bs {productoSeleccionado.precioVenta}</Text>
                  </View>
                  <View style={styles.datoBloque}>
                    <Text style={styles.datoLabel}>Ganancia unit.</Text>
                    <Text style={[styles.datoValor, { color: COLORS.exito }]}>
                      Bs {calcularGanancia(productoSeleccionado.precioCompra, productoSeleccionado.precioVenta)}
                    </Text>
                  </View>
                  <View style={styles.datoBloque}>
                    <Text style={styles.datoLabel}>Stock actual</Text>
                    <Text style={[styles.datoValor, {
                      color: productoSeleccionado.cantidad <= 2 ? COLORS.advertencia : COLORS.textoBlanco
                    }]}>
                      {productoSeleccionado.cantidad}
                    </Text>
                  </View>
                </View>

                {/* Ventas — solo totales, sin lista detallada */}
                <View style={styles.seccionVentas}>
                  <Text style={styles.seccionTitulo}>📦 Ventas de este producto</Text>

                  {ventasProducto.length === 0 ? (
                    <Text style={styles.sinVentas}>Aún no hay ventas registradas</Text>
                  ) : (
                    <View style={styles.resumenVentas}>
                      <View style={styles.resumenBloque}>
                        <Text style={styles.datoLabel}>Unidades vendidas</Text>
                        <Text style={[styles.datoValor, { color: COLORS.acento }]}>
                          {totalUnidades(ventasProducto)}
                        </Text>
                      </View>
                      <View style={styles.resumenBloque}>
                        <Text style={styles.datoLabel}>Total recaudado</Text>
                        <Text style={[styles.datoValor, { color: COLORS.exito }]}>
                          Bs {totalRecaudado(ventasProducto)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Link proveedor */}
                {productoSeleccionado.linkProveedor ? (
                  <TouchableOpacity
                    style={styles.botonLink}
                    onPress={() => Linking.openURL(productoSeleccionado.linkProveedor)}
                  >
                    <Ionicons name="link-outline" size={18} color={COLORS.acento} />
                    <Text style={styles.botonLinkTexto}>Ver proveedor</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Eliminar */}
                <TouchableOpacity
                  style={styles.botonEliminar}
                  onPress={() => eliminarItem(productoSeleccionado.id, productoSeleccionado.nombre)}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.botonEliminarTexto}>Eliminar producto</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>
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

            <ScrollView showsVerticalScrollIndicator={false}>
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

  // Ícono lupa encima de cada foto
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

  // Sección ventas
  seccionVentas: {
    backgroundColor: COLORS.tarjeta,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  seccionTitulo: {
    fontSize: 15, fontWeight: '700',
    color: COLORS.textoBlanco, marginBottom: 12,
  },
  sinVentas: {
    fontSize: 13, color: COLORS.textoGris,
    textAlign: 'center', paddingVertical: 12,
  },
  resumenVentas: {
    flexDirection: 'row',
  },
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