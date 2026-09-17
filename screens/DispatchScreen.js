import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, C, Card, Icon, Info, Meter, ScreenHeader, SectionTitle, styles } from './ScreenKit.js';

export default function DispatchScreen({ state, go, store }) {
  const reviewed = Object.values(state.inspection360).filter(value => typeof value === 'string').length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader kicker="PANTALLA 01" title="Despacho" icon="truck" go={go} action={<View style={styles.status}><Text style={styles.statusText}>PRE-OPERATIVO</Text></View>} />
      <View style={styles.telemetry}>
        <View style={styles.telemetryCell}><Text style={styles.telemetryLabel}>TURNO ACTIVO</Text><Text style={styles.telemetryValue}>{state.operator.shift}</Text></View>
        <View style={[styles.telemetryCell, styles.telemetryDivider]}><Text style={styles.telemetryLabel}>BASE DE SALIDA</Text><Text style={styles.telemetryValue}>{state.operator.depot}</Text></View>
        <View style={[styles.telemetryCell, styles.telemetryDivider]}><Text style={styles.telemetryLabel}>CAPACIDAD</Text><Text style={styles.telemetryValue}>{state.unit.compactorCapacity}</Text></View>
      </View>
      <View style={styles.grid}>
        <Pressable style={styles.halfCard} onPress={() => go('fuel')}>
          <SectionTitle icon="fuel">COMBUSTIBLE</SectionTitle>
          <Text style={styles.metric}>{state.fuelLog.preset ? `${state.fuelLog.liters} L` : 'PENDIENTE'}</Text>
          <Text style={styles.caption}>{state.fuelLog.preset ? `${Math.round(state.fuelLog.liters / 250 * 100)}% DE TANQUE` : 'SELECCIONA NIVEL'}</Text>
          <Meter value={state.fuelLog.liters} max={250} />
        </Pressable>
        <Pressable style={styles.halfCard} onPress={() => go('inspection')}>
          <SectionTitle icon="clipboard-check-outline">INSPECCIÓN 360°</SectionTitle>
          <Text style={[styles.metric, state.inspection360.completed && { color: C.green }]}>{state.inspection360.completed ? 'COMPLETO' : 'PENDIENTE'}</Text>
          <Text style={styles.caption}>{reviewed} / 9 PUNTOS REVISADOS</Text>
        </Pressable>
      </View>
      <Card>
        <SectionTitle icon="assignment-outline">DATOS DE ASIGNACIÓN TÁCTICA</SectionTitle>
        <Info label="UNIDAD" value={`${state.unit.id} · ${state.unit.model}`} />
        <Info label="OPERADOR" value={state.operator.name} />
        <Info label="BASE" value={state.operator.depot} />
        <View style={styles.routeBox}><View><Text style={styles.routeId}>{state.route.id}: CENTRO HISTÓRICO</Text><Text style={styles.caption}>{state.stops.length} PUNTOS DE RECOLECCIÓN PROGRAMADOS</Text></View><Icon name="map-outline" color={C.blue} size={30} /></View>
        <View style={styles.grid}><Info label="HORA SALIDA" value="06:00 HRS" /><Info label="LLEGADA EST." value="10:00 HRS" /></View>
        <Button onPress={() => { store.showToast('Ruta R-04 iniciada'); go('map'); }} icon="play">INICIAR RUTA Y MONITOREO</Button>
      </Card>
    </ScrollView>
  );
}
