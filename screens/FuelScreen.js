import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, C, Meter, ScreenHeader, SectionTitle, styles } from './ScreenKit.js';

const presets = [[25, 'VACÍO / CRÍTICO'], [62.5, 'RESERVA'], [125, 'MEDIO TANQUE'], [187.5, '3/4 TANQUE'], [250, 'LLENO']];

export default function FuelScreen({ state, go, store }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader kicker="PANTALLA 03" title="Registro de combustible" icon="fuel" go={go} />
      <Card accent>
        <Text style={styles.label}>NIVEL EN TANQUE SELECCIONADO</Text>
        <View style={styles.grid}><Text style={styles.display}>{state.fuelLog.liters.toFixed(1)} <Text style={styles.displayUnit}>L</Text></Text><Text style={[styles.routeId, { color: state.fuelLog.preset ? C.green : C.muted }]}>{state.fuelLog.preset || 'SIN REGISTRAR'}</Text></View>
        <Meter value={state.fuelLog.liters} max={250} />
      </Card>
      <Card>
        <SectionTitle icon="tune">AJUSTE MANUAL · PASO ± 5 LITROS</SectionTitle>
        <View style={styles.stepper}><Button secondary onPress={() => store.updateFuelLiters(-5)} icon="minus">5 L</Button><Button secondary onPress={() => store.updateFuelLiters(5)} icon="plus">5 L</Button></View>
      </Card>
      <Card>
        <Text style={styles.label}>NIVEL VISUAL RÁPIDO</Text>
        {presets.map(([liters, label]) => <Pressable key={liters} style={[styles.routeBox, state.fuelLog.liters === liters && styles.presetSelected]} onPress={() => store.setFuelPreset(label, liters)}><View><Text style={styles.routeId}>{label}</Text><Text style={styles.caption}>{liters} LITROS</Text></View><Text style={{ color: state.fuelLog.liters === liters ? C.green : C.muted, fontSize: 24 }}>{state.fuelLog.liters === liters ? '✓' : '○'}</Text></Pressable>)}
      </Card>
      <Card><Text style={styles.label}>ESTACIÓN DE SERVICIO AUTORIZADA</Text><TextInput value={state.fuelLog.fuelStation} editable={false} style={styles.input} /><Button secondary icon="receipt">FOTOGRAFIAR TICKET / VOUCHER</Button></Card>
      <Button onPress={() => { store.showToast('Registro de combustible guardado'); go('dispatch'); }} icon="content-save">GUARDAR REGISTRO DE COMBUSTIBLE</Button>
    </ScrollView>
  );
}
