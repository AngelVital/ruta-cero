export const fuelTankCapacityLiters = 250;

export const fuelPresets = [
  { label: 'RESERVA (25%)', liters: 62.5 },
  { label: 'MEDIO TANQUE (50%)', liters: 125.0 },
  { label: '3/4 TANQUE (75%)', liters: 187.5 },
  { label: 'LLENO (100%)', liters: 250.0 }
];

export const getFuelPercent = (liters) => liters / fuelTankCapacityLiters * 100;

export const getFuelLevelClass = (liters) => {
  const percent = getFuelPercent(liters);
  if (!percent) return '';
  return percent <= 25 ? 'is-reserve' : percent <= 50 ? 'is-half' : '';
};
