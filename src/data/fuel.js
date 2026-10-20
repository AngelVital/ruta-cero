export const fuelTankCapacityLiters = 250;

export const fuelPresets = [
  { label: 'VACÍO (0-15%)', liters: 25.0, desc: 'Nivel Crítico < 35 L' },
  { label: 'RESERVA (25%)', liters: 62.5, desc: '62.5 Litros' },
  { label: 'MEDIO TANQUE (50%)', liters: 125.0, desc: '125.0 Litros' },
  { label: '3/4 TANQUE (75%)', liters: 187.5, desc: '187.5 Litros' },
  { label: 'LLENO (100%)', liters: 250.0, desc: '250.0 Litros Capacidad Total' }
];

export const getFuelPercent = (liters) => liters / fuelTankCapacityLiters * 100;
