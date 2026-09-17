import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, C, Card, Icon, ScreenHeader, styles } from './ScreenKit.js';

export default function RouteMapScreen({ state, go, store }) {
  const activeStop = state.stops.find(stop => stop.status === 'active') || state.stops[0];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
      <ScreenHeader kicker="PANTALLA 04 / R-04" title="Ruta R-04 · Centro" icon="map-marker-path" go={go} action={<View style={[styles.status, { backgroundColor: C.bright }]}><Text style={styles.statusText}>{state.route.completedCount}/{state.stops.length} HECHO</Text></View>} />
      <View style={styles.telemetry}><View style={styles.telemetryCell}><Text style={styles.telemetryLabel}>SIGUIENTE PUNTO</Text><Text style={[styles.telemetryValue, { color: C.cyan }]}>{activeStop.id}</Text></View><View style={[styles.telemetryCell, styles.telemetryDivider]}><Text style={styles.telemetryLabel}>VELOCIDAD</Text><Text style={[styles.telemetryValue, { color: '#4ade80' }]}>28 KM/H</Text></View><View style={[styles.telemetryCell, styles.telemetryDivider]}><Text style={styles.telemetryLabel}>TIEMPO APROX.</Text><Text style={[styles.telemetryValue, { color: '#fbbf24' }]}>4 MIN</Text></View></View>
      <View style={{ height: 250, backgroundColor: '#09121d', padding: 16, justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: C.border }}>
        <View style={{ position: 'absolute', left: 24, right: 24, top: 26, bottom: 26, borderWidth: 1, borderColor: 'rgba(0,168,107,0.24)', borderStyle: 'dashed' }} />
        <View style={{ gap: 14 }}>
          {state.stops.slice(0, 5).map((stop, index) => <Pressable key={stop.id} onPress={() => { store.selectContainer(stop.id); go('report'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={[styles.stopDot, stop.status === 'completed' ? styles.stopDone : stop.status === 'active' ? styles.stopActive : null]}><Text style={styles.stopNumber}>{index + 1}</Text></View><View style={{ flex: 1 }}><Text style={{ color: stop.status === 'active' ? C.cyan : '#f8fafc', fontSize: 13, fontWeight: '800' }}>{stop.id} · {stop.code}</Text><Text style={{ color: '#94a3b8', fontSize: 11 }}>{stop.address}</Text></View><Icon name={stop.status === 'completed' ? 'check-circle' : stop.status === 'active' ? 'navigation-variant' : 'circle-outline'} color={stop.status === 'completed' ? C.bright : stop.status === 'active' ? C.cyan : '#64748b'} size={20} /></Pressable>)}
        </View>
        <Text style={{ position: 'absolute', left: 14, top: 10, color: C.bright, fontSize: 10, fontWeight: '700' }}>LAT 19.4326° N · LON -99.1332° W</Text>
      </View>
      <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.panel, borderBottomWidth: 2, borderBottomColor: C.border }}><Text style={styles.routeId}>PUNTOS PROGRAMADOS ({state.stops.length})</Text><Button onPress={() => go('scanner')} icon="qrcode-scan">ESCANEAR</Button></View>
      <View style={{ padding: 12, gap: 10, backgroundColor: '#f1f5f9' }}>{state.stops.map((stop, index) => { const completed = stop.status === 'completed'; const active = stop.status === 'active'; return <Pressable key={stop.id} onPress={() => { store.selectContainer(stop.id); go('report'); }}><Card style={active ? { borderColor: '#0284c7' } : null}><View style={styles.grid}><View style={{ flex: 1 }}><Text style={styles.routeId}>[{String(index + 1).padStart(2, '0')}] {stop.id} · {stop.code}</Text><Text style={styles.caption}>{stop.address}</Text></View><View style={[styles.badge, { backgroundColor: completed ? C.bright : active ? C.warning : '#94a3b8' }]}><Text style={styles.badgeText}>{completed ? 'COMPLETADO' : active ? 'EN CURSO' : 'PENDIENTE'}</Text></View></View><Text style={[styles.caption, { marginTop: 8, color: active ? '#0284c7' : C.muted }]}>{completed ? `${stop.collectedKg || 0} KG REGISTRADOS` : active ? 'REGISTRAR AHORA' : stop.time}</Text></Card></Pressable>; })}</View>
    </ScrollView>
  );
}
