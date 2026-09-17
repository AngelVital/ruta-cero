import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, C, Card, Icon, ScreenHeader, styles } from './ScreenKit.js';

const items = [
  ['tires', 'ESTADO DE LLANTAS', 'Desgaste, presión y birlos', 'tire'],
  ['fluids', 'ACEITE DE MOTOR', 'Aceite, anticongelante y dirección', 'oil'],
  ['hydraulics', 'LÍQUIDO REFRIGERANTE', 'Mangueras y pistones sin fugas', 'water'],
  ['lights', 'SISTEMA DE LUCES', 'Luces, faros y reversa', 'lightbulb-outline'],
  ['brakes', 'SISTEMA DE FRENOS', 'Frenos de aire y parking', 'shield-check'],
  ['wipers', 'LIMPIAPARABRISAS', 'Plumas y aspersores', 'water-drop'],
  ['mirrors', 'ESPEJOS RETROVISORES', 'Espejos y viseras', 'eye-outline'],
  ['safetyGear', 'EQUIPO DE SEGURIDAD', 'Chalecos, conos y botiquín', 'security'],
  ['extinguisher', 'EXTINTOR DE INCENDIOS', 'Extintor con vigencia', 'fire-extinguisher']
];

export default function InspectionScreen({ state, go, store }) {
  const confirm = () => {
    items.forEach(([key]) => store.updateInspectionItem(key, 'OK'));
    store.state.inspection360.completed = true;
    store.notify();
    go('dispatch');
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader kicker="PANTALLA 02" title="Inspección 360°" icon="clipboard-check-outline" go={go} />
      <Card accent>
        <View style={styles.grid}><View style={{ flex: 1 }}><Text style={styles.label}>UNIDAD BAJO INSPECCIÓN</Text><Text style={styles.routeId}>{state.unit.id} · {state.unit.plates}</Text></View><View style={[styles.status, { backgroundColor: C.bright }]}><Text style={styles.statusText}>{state.unit.status}</Text></View></View>
        <View style={styles.routeBox}><View><Text style={styles.label}>ODÓMETRO INICIAL DE SALIDA</Text><Text style={styles.display}>{state.unit.odometer.toLocaleString('es-MX')} <Text style={styles.displayUnit}>KM</Text></Text></View><Icon name="speedometer" color={C.green} size={30} /></View>
        <Button secondary icon="camera">FOTO EVIDENCIA DEL ODÓMETRO</Button>
      </Card>
      <Card>
        {items.map(([key, label, description, icon]) => {
          const checked = Boolean(state.inspection360[key]);
          return <Pressable key={key} style={styles.checkRow} onPress={() => store.updateInspectionItem(key, checked ? 'OBSERVAR' : 'OK')}><View style={{ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' }}><Icon name={icon} color={checked ? C.green : '#94a3b8'} size={24} /><View><Text style={styles.infoValue}>{label}</Text><Text style={styles.caption}>{description}</Text></View></View><View style={[styles.check, checked && (state.inspection360[key] === 'OBSERVAR' ? styles.checkWarn : styles.checkDone)]}><Icon name={checked ? 'check' : 'minus'} color={checked ? '#fff' : C.muted} size={20} /></View></Pressable>;
        })}
        <Button onPress={confirm} icon="check-decagram">CONFIRMAR Y FIRMAR INSPECCIÓN</Button>
      </Card>
    </ScrollView>
  );
}
