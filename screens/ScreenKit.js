import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const C = {
  ink: '#0d1c2e',
  slate: '#132238',
  muted: '#526174',
  canvas: '#eaf1ff',
  panel: '#ffffff',
  green: '#006d43',
  bright: '#00a86b',
  blue: '#359ade',
  cyan: '#38bdf8',
  border: '#0f172a',
  amber: '#d97706',
  warning: '#eab308',
  critical: '#e11d48',
  line: '#cbd5e1'
};

export function Icon({ name, color = C.ink, size = 22 }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export function Button({ children, onPress, secondary = false, icon, danger = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, danger && styles.dangerButton, pressed && styles.pressed]}
    >
      {icon && <Icon name={icon} color={secondary ? C.ink : '#fff'} size={20} />}
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{children}</Text>
    </Pressable>
  );
}

export function SectionTitle({ icon, children }) {
  return (
    <View style={styles.sectionTitle}>
      <Icon name={icon} color={C.green} size={20} />
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

export function Card({ children, accent = false, style }) {
  return <View style={[styles.card, accent && styles.accentCard, style]}>{children}</View>;
}

export function Meter({ value, max = 100, critical = false }) {
  const percentage = Math.min(100, Math.max(0, value / max * 100));
  return (
    <View style={styles.meter}>
      <View style={[styles.meterFill, critical && styles.meterCritical, { width: `${percentage}%` }]} />
    </View>
  );
}

export function Info({ label, value }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function ScreenHeader({ kicker, title, icon, go, backTo = 'dispatch', action }) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.screenHeaderTitle}>
        <Icon name={icon} color={C.green} size={22} />
        <View>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      {action || (
        <Pressable onPress={() => go(backTo)} style={styles.back}>
          <Icon name="arrow-left" size={19} />
          <Text style={styles.backText}>VOLVER</Text>
        </Pressable>
      )}
    </View>
  );
}

export const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 30 },
  screenHeader: { padding: 14, backgroundColor: C.panel, borderBottomWidth: 2, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  screenHeaderTitle: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  kicker: { color: C.green, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: C.ink, fontSize: 23, fontWeight: '800', marginTop: 2 },
  back: { minHeight: 44, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: C.ink, fontSize: 10, fontWeight: '800' },
  telemetry: { backgroundColor: C.slate, borderBottomWidth: 2, borderBottomColor: C.border, padding: 10, flexDirection: 'row', gap: 10 },
  telemetryCell: { flex: 1, gap: 3 },
  telemetryDivider: { borderLeftWidth: 1, borderLeftColor: '#334155', paddingLeft: 9 },
  telemetryLabel: { color: '#7dd3fc', fontSize: 9, fontWeight: '800' },
  telemetryValue: { color: '#fff', fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', gap: 10 },
  card: { backgroundColor: C.panel, borderWidth: 2, borderColor: C.border, padding: 14, gap: 13, shadowColor: C.border, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  accentCard: { borderTopWidth: 5, borderTopColor: C.bright },
  halfCard: { flex: 1, minHeight: 130, backgroundColor: C.panel, borderWidth: 2, borderColor: C.border, padding: 12, gap: 9, shadowColor: C.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: 2, borderBottomColor: C.border, paddingBottom: 8 },
  sectionText: { color: C.muted, fontSize: 11, fontWeight: '800', flex: 1 },
  metric: { color: C.ink, fontSize: 21, fontWeight: '800' },
  display: { color: C.ink, fontSize: 43, fontWeight: '800' },
  displayUnit: { color: C.muted, fontSize: 14, fontWeight: '700' },
  caption: { color: C.muted, fontSize: 11, fontWeight: '700', lineHeight: 16 },
  meter: { height: 11, backgroundColor: C.line, borderWidth: 1, borderColor: C.border },
  meterFill: { height: '100%', backgroundColor: C.bright },
  meterCritical: { backgroundColor: C.critical },
  info: { borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 8, gap: 3 },
  label: { color: C.muted, fontSize: 10, fontWeight: '800' },
  infoValue: { color: C.ink, fontSize: 16, fontWeight: '700' },
  routeBox: { backgroundColor: '#eff4ff', borderWidth: 2, borderColor: C.border, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeId: { color: C.ink, fontSize: 16, fontWeight: '800' },
  button: { minHeight: 54, backgroundColor: C.green, borderWidth: 2, borderColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, shadowColor: C.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
  secondaryButton: { backgroundColor: C.panel },
  dangerButton: { backgroundColor: C.critical },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  secondaryButtonText: { color: C.ink },
  pressed: { opacity: 0.72, transform: [{ translateX: 2 }, { translateY: 2 }] },
  input: { height: 54, borderWidth: 2, borderColor: C.border, paddingHorizontal: 14, fontSize: 20, color: C.ink, backgroundColor: C.panel },
  status: { backgroundColor: C.bright, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  checkRow: { minHeight: 65, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  check: { width: 40, height: 40, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: C.green },
  checkWarn: { backgroundColor: C.warning },
  presetRow: { flexDirection: 'row', gap: 8 },
  preset: { flex: 1, minHeight: 64, borderWidth: 2, borderColor: C.border, padding: 10, alignItems: 'center', justifyContent: 'center' },
  presetSelected: { backgroundColor: '#d1fae5', borderColor: C.green },
  presetValue: { color: C.ink, fontSize: 16, fontWeight: '800' },
  stepper: { flexDirection: 'row', gap: 8 },
  mapPanel: { backgroundColor: '#dce9ff', borderWidth: 2, borderColor: C.border, padding: 14, gap: 4 },
  mapLine: { position: 'absolute', left: 31, top: 30, bottom: 30, width: 4, backgroundColor: C.blue },
  stopRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stopDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.panel, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  stopActive: { backgroundColor: C.cyan },
  stopDone: { backgroundColor: C.bright },
  stopNumber: { color: C.ink, fontWeight: '800' },
  stopDetails: { flex: 1, gap: 3 },
  stopState: { color: C.amber, fontSize: 10, fontWeight: '800' },
  doneText: { color: C.green },
  scanner: { minHeight: 270, backgroundColor: '#09121d', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, borderWidth: 2, borderColor: C.border, overflow: 'hidden' },
  scannerFrame: { width: 190, height: 150, borderWidth: 3, borderColor: C.bright, alignItems: 'center', justifyContent: 'center' },
  scanLine: { position: 'absolute', left: 0, right: 0, top: 72, height: 3, backgroundColor: C.bright },
  scannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  fillRow: { flexDirection: 'row', gap: 8 },
  fillOption: { flex: 1, minHeight: 54, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  fillSelected: { backgroundColor: C.bright },
  fillText: { color: C.ink, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: C.border },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' }
});
