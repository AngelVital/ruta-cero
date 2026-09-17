import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, C, Card, Icon, ScreenHeader, styles } from './ScreenKit.js';

export default function ScannerScreen({ state, go, store }) {
  const current = state.stops.find(stop => stop.id === state.activeContainerId) || state.stops[0];
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader kicker="PANTALLA 05" title="Escanear código QR" icon="qrcode-scan" go={go} backTo="map" />
      <View style={styles.scanner}>
        <Text style={{ position: 'absolute', top: 14, left: 14, color: C.bright, fontSize: 10, fontWeight: '800' }}>SISTEMA ÓPTICO ACTIVO · 60 FPS</Text>
        <View style={styles.scannerFrame}><View style={styles.scanLine} /><Icon name="qrcode-scan" color={C.bright} size={76} /></View>
        <Text style={styles.scannerTitle}>LISTO PARA ESCANEAR</Text>
        <Text style={[styles.caption, { color: '#cbd5e1', textAlign: 'center' }]}>APUNTA LA CÁMARA AL CÓDIGO QR DEL CONTENEDOR</Text>
      </View>
      <Card accent><Text style={styles.label}>CONTENEDOR DETECTADO / EN RETÍCULA</Text><Text style={styles.routeId}>{current.id} · {current.code}</Text><Text style={styles.caption}>{current.address}</Text><Button onPress={() => go('report')} icon="clipboard-text-outline">INICIAR REPORTE DE ESTADO</Button></Card>
      <Card><Text style={styles.label}>SELECCIÓN RÁPIDA</Text><View style={{ gap: 8 }}>{state.stops.slice(0, 5).map(stop => <Pressable key={stop.id} onPress={() => { store.selectContainer(stop.id); store.showToast(`Contenedor seleccionado: ${stop.id}`); }} style={[styles.routeBox, stop.id === current.id && styles.presetSelected]}><Text style={styles.routeId}>{stop.id} · {stop.code}</Text><Icon name={stop.id === current.id ? 'check-circle' : 'chevron-right'} color={stop.id === current.id ? C.green : C.muted} /></Pressable>)}</View></Card>
    </ScrollView>
  );
}
