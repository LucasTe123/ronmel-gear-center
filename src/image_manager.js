// ============================================
// IMAGE_MANAGER.JS - Manejo y compresión de imágenes
// Aquí se controla la cámara, galería y compresión
// ============================================

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

// --- Cambia estos valores para ajustar la compresión ---
const CONFIG = {
  calidad: 0.4,      // 0.1 = máxima compresión, 1.0 = sin compresión
  anchoMaximo: 800,  // ancho máximo en píxeles
};

// Comprimir imagen antes de guardar
async function comprimirImagen(uri) {
  const resultado = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: CONFIG.anchoMaximo } }],
    { compress: CONFIG.calidad, format: ImageManipulator.SaveFormat.JPEG }
  );
  return resultado.uri;
}

// Abrir galería y comprimir
export async function seleccionarDeGaleria() {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    alert('Necesitamos permiso para acceder a tu galería.');
    return null;
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (resultado.canceled) return null;

  const uriComprimida = await comprimirImagen(resultado.assets[0].uri);
  return uriComprimida;
}

// Abrir cámara y comprimir
export async function tomarFoto() {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) {
    alert('Necesitamos permiso para acceder a tu cámara.');
    return null;
  }

  const resultado = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (resultado.canceled) return null;

  const uriComprimida = await comprimirImagen(resultado.assets[0].uri);
  return uriComprimida;
}