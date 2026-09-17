import { useEffect, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { store } from './src/state/store.js';
import DispatchScreen from './screens/DispatchScreen.js';
import InspectionScreen from './screens/InspectionScreen.js';
import FuelScreen from './screens/FuelScreen.js';
import RouteMapScreen from './screens/RouteMapScreen.js';
import ScannerScreen from './screens/ScannerScreen.js';
import ReportScreen from './screens/ReportScreen.js';
import { C } from './screens/ScreenKit.js';

const tabs = [
  ['dispatch', 'Despacho', 'truck'],
  ['map', 'Mapa R-04', 'map-marker-path'],
  ['scanner', 'Escáner QR', 'qrcode-scan'],
  ['report', 'Reporte', 'clipboard-text-outline']
];

function Icon({ name, color = '#fff', size = 22 }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

function AppHeader({ state }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>RUTA CERO</Text>
        <Text style={styles.headerSub}>FIELD-SPEC HUD / OPERACIONES DE CAMPO</Text>
      </View>
      <View style={styles.connection}>
        <View style={styles.connectionLine}><Icon name="crosshairs-gps" color={C.bright} size={18} /><Text style={styles.connectionText}>GPS ACTIVO</Text></View>
        <Text style={styles.unit}>{state.unit.id} · {state.route.id}</Text>
      </View>
    </View>
  );
}

function Navigation({ state, go }) {
  return (
    <View style={styles.nav}>
      {tabs.map(([id, label, icon]) => <Pressable key={id} onPress={() => go(id)} style={[styles.navItem, state.currentScreen === id && styles.navActive]}><Icon name={icon} color={state.currentScreen === id ? C.bright : '#b9c8dc'} size={22} /><Text style={[styles.navLabel, state.currentScreen === id && styles.navLabelActive]}>{label}</Text></Pressable>)}
    </View>
  );
}

export default function App() {
  const [, refresh] = useState(0);
  useEffect(() => store.subscribe(() => refresh(value => value + 1)), []);
  const state = store.state;
  const go = screen => store.setScreen(screen);
  const screens = {
    dispatch: <DispatchScreen state={state} go={go} store={store} />,
    inspection: <InspectionScreen state={state} go={go} store={store} />,
    fuel: <FuelScreen state={state} go={go} store={store} />,
    map: <RouteMapScreen state={state} go={go} store={store} />,
    scanner: <ScannerScreen state={state} go={go} store={store} />,
    report: <ReportScreen state={state} go={go} store={store} />
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.ink} />
        <AppHeader state={state} />
        <View style={styles.body}>{screens[state.currentScreen] || screens.dispatch}</View>
        <Navigation state={state} go={go} />
        {state.toast && <View style={styles.toast}><Icon name={state.toast.type === 'info' ? 'information' : 'check-circle'} color={C.bright} size={20} /><Text style={styles.toastText}>{state.toast.message}</Text></View>}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ink },
  header: { minHeight: 76, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: C.ink, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#30445f' },
  brand: { color: '#fff', fontSize: 25, fontWeight: '800', letterSpacing: 1 },
  headerSub: { color: '#9db0c8', fontSize: 9, fontWeight: '700', marginTop: 2 },
  connection: { alignItems: 'flex-end', gap: 3 },
  connectionLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  connectionText: { color: C.bright, fontSize: 10, fontWeight: '800' },
  unit: { color: '#fff', fontSize: 12, fontWeight: '800' },
  body: { flex: 1, backgroundColor: C.canvas },
  nav: { minHeight: 70, backgroundColor: C.ink, flexDirection: 'row', borderTopWidth: 3, borderTopColor: C.bright },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, borderTopWidth: 3, borderTopColor: 'transparent' },
  navActive: { borderTopColor: C.bright, backgroundColor: '#182b42' },
  navLabel: { color: '#b9c8dc', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  navLabelActive: { color: '#fff' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 84, minHeight: 52, paddingHorizontal: 14, backgroundColor: C.ink, borderWidth: 2, borderColor: C.bright, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toastText: { color: '#fff', flex: 1, fontSize: 13, fontWeight: '700' }
});
