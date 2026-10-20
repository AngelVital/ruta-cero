export const inspectionItems = [
  { key: 'tires', title: '1. ESTADO DE LLANTAS', desc: 'Desgaste, presión y birlos', icon: 'tire_repair' },
  { key: 'fluids', title: '2. ACEITE DE MOTOR', desc: 'Aceite de motor, anticongelante y dirección', icon: 'oil_barrel' },
  { key: 'hydraulics', title: '3. LÍQUIDO REFRIGERANTE', desc: 'Mangueras de alta presión y pistones sin fugas', icon: 'device_thermostat' },
  { key: 'lights', title: '4. SISTEMA DE LUCES', desc: 'Luces, faros y reversa con alarma', icon: 'highlight' },
  { key: 'brakes', title: '5. SISTEMA DE FRENOS', desc: 'Frenos de aire, líquido de frenos y parking', icon: 'health_and_safety' },
  { key: 'wipers', title: '6. LIMPIAPARABRISAS', desc: 'Plumas y aspersores', icon: 'water_drop' },
  { key: 'mirrors', title: '7. ESPEJOS RETROVISORES', desc: 'Espejos y viseras', icon: 'visibility' },
  { key: 'safetyGear', title: '8. EQUIPO DE SEGURIDAD', desc: 'Chalecos, conos y botiquín', icon: 'security' },
  { key: 'extinguisher', title: '9. EXTINTOR DE INCENDIOS', desc: 'Extintor con vigencia', icon: 'fire_extinguisher' }
];

export const inspectionKeys = inspectionItems.map((item) => item.key);
