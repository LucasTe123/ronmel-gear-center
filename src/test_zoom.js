// OPCION 3 — react-native-image-viewing
// Zoom, doble tap y swipe para cerrar incluidos
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import ImageView from 'react-native-image-viewing';

const IMAGENES_TEST = [
  { uri: 'https://picsum.photos/seed/repuesto1/800/600' },
  { uri: 'https://picsum.photos/seed/repuesto2/800/600' },
  { uri: 'https://picsum.photos/seed/repuesto3/800/600' },
];

export default function TestZoom3() {
  const [visible, setVisible] = useState(false);
  const [indice, setIndice] = useState(0);

  return (
    <View style={styles.fondo}>
      {IMAGENES_TEST.map((img, i) => (
        <TouchableOpacity
          key={i}
          style={styles.boton}
          onPress={() => {
            setIndice(i);
            setVisible(true);
          }}
        >
          <Text style={styles.texto}>Abrir imagen {i + 1}</Text>
        </TouchableOpacity>
      ))}

      <ImageView
        images={IMAGENES_TEST}
        imageIndex={indice}
        visible={visible}
        onRequestClose={() => setVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', gap: 12 },
  boton: { backgroundColor: '#333', padding: 16, borderRadius: 10 },
  texto: { color: '#fff', fontSize: 16 },
});