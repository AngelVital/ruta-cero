import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, C, Card, Icon, ScreenHeader, SectionTitle, styles } from './ScreenKit.js';

export default function ReportScreen({ state, go, store }) {
  const stop = state.stops.find(item => item.id === state.activeContainerId) || state.stops[0];
  const [kg, setKg] = useState(String(stop.collectedKg || ''));
  const [fill, setFill] = useState(stop.fillLevel || 50);
  const materialColor = stop.material === 'carton' ? '#d97706' : stop.material === 'papel' ? '#4f46e5' : '#0284c7';

  const save = () => {
    store.completeContainerReport(stop.id, { fillLevel: fill, collectedKg: Number(kg) || 0 });
    store.showToast('Reporte de contenedor guardado');
    go('map');
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader kicker="PANTALLA 06" title="Reporte de contenedor" icon="clipboard-text-outline" go={go} backTo="map" />
      <Card accent><Text style={styles.kicker}>{stop.id}</Text><Text style={styles.display}>{stop.code}</Text><Text style={styles.caption}>{stop.address}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}><View style={[styles.badge, { backgroundColor: materialColor }]}><Text style={styles.badgeText}>{(stop.material || 'plastico').toUpperCase()}</Text></View><Text style={styles.caption}>{stop.time}</Text></View></Card>
      <Card><SectionTitle icon="gauge">NIVEL DE LLENADO ESTIMADO</SectionTitle><View style={styles.fillRow}>{[20, 55, 90, 100].map(level => <Pressable key={level} onPress={() => setFill(level)} style={[styles.fillOption, fill === level && styles.fillSelected]}><Text style={styles.fillText}>{level}%</Text></Pressable>)}</View><View style={styles.routeBox}><View><Text style={styles.label}>ESTADO OPERATIVO</Text><Text style={[styles.routeId, { color: fill > 75 ? C.critical : fill > 50 ? C.amber : C.green }]}>{fill > 75 ? 'LLENO · CRÍTICO' : fill > 50 ? 'MEDIO · ALERTA' : 'BAJO · ÓPTIMO'}</Text></View><Icon name={fill > 75 ? 'alert' : 'check-circle'} color={fill > 75 ? C.critical : C.green} size={26} /></View></Card>
      <Card><SectionTitle icon="scale">KILOS RECOLECTADOS</SectionTitle><TextInput value={kg} onChangeText={setKg} keyboardType="numeric" placeholder="0" placeholderTextColor={C.muted} style={styles.input} /><View style={{ flexDirection: 'row', gap: 8 }}><Button secondary icon="camera">FOTO EXTERIOR</Button><Button secondary icon="camera-outline">FOTO INTERIOR</Button></View></Card>
      <Card><SectionTitle icon="alert-circle-outline">INCIDENCIAS</SectionTitle><Text style={styles.caption}>Registra cualquier anomalía observada durante la recolección.</Text><Button secondary icon="note-edit-outline">AÑADIR OBSERVACIÓN</Button></Card>
      <Button onPress={save} icon="check-decagram">GUARDAR REPORTE</Button>
    </ScrollView>
  );
}
