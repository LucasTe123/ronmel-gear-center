// ============================================
// NumeroRuleta.js - TRAGAPERRAS REAL
// Cada dígito gira por separado
// ============================================

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated } from 'react-native';

// Un solo dígito que gira
function Digito({ valor, style, delay = 0 }) {
  const translateViejo = useRef(new Animated.Value(0)).current;
  const translateNuevo = useRef(new Animated.Value(30)).current;
  const opacidadViejo = useRef(new Animated.Value(1)).current;
  const opacidadNuevo = useRef(new Animated.Value(0)).current;

  const [displayViejo, setDisplayViejo] = useState(valor);
  const [displayNuevo, setDisplayNuevo] = useState(valor);
  const [animando, setAnimando] = useState(false);
  const valorRef = useRef(valor);

  useEffect(() => {
    if (valor === valorRef.current) return;

    const anterior = valorRef.current;
    valorRef.current = valor;

    setDisplayViejo(anterior);
    setDisplayNuevo(valor);
    setAnimando(true);

    translateViejo.setValue(0);
    translateNuevo.setValue(30);
    opacidadViejo.setValue(1);
    opacidadNuevo.setValue(0);

    // Cada dígito arranca con su propio delay
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateViejo, {
          toValue: -28,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacidadViejo, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateNuevo, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacidadNuevo, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setAnimando(false));
    }, delay);

  }, [valor]);

  return (
    <View style={{ overflow: 'hidden', height: 28, justifyContent: 'center', alignItems: 'center' }}>
      {animando ? (
        <>
          <Animated.Text style={[
            style,
            {
              position: 'absolute',
              opacity: opacidadViejo,
              transform: [{ translateY: translateViejo }],
            }
          ]}>
            {displayViejo}
          </Animated.Text>
          <Animated.Text style={[
            style,
            {
              opacity: opacidadNuevo,
              transform: [{ translateY: translateNuevo }],
            }
          ]}>
            {displayNuevo}
          </Animated.Text>
        </>
      ) : (
        <Text style={style}>{valor}</Text>
      )}
    </View>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function NumeroRuleta({ valor, style, prefix = '', suffix = '' }) {
  const valorStr = String(Number(valor) || 0);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>

      {/* Prefix fijo — no anima */}
      {prefix ? <Text style={style}>{prefix}</Text> : null}

      {/* Cada dígito por separado con delay escalonado */}
      {valorStr.split('').map((digito, index) => (
        <Digito
          key={index}
          valor={digito}
          style={style}
          delay={index * 80} // ← cada dígito arranca 80ms después del anterior
        />
      ))}

      {suffix ? <Text style={style}>{suffix}</Text> : null}

    </View>
  );
}