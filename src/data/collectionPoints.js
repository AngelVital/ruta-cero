/**
 * Catálogo único de puntos de recolección, compartido por campo y administración.
 * `lastCollectedOn` es la última visita conocida cuando aún no hay reportes en Supabase.
 */
export const collectionPoints = [
  { id: 'CONT-01', code: 'AYUNTAMIENTO', name: 'Ayuntamiento', address: 'Av. de los Deportistas', latitude: 24.123721, longitude: -110.316029, lastCollectedOn: '2026-09-30' },
  { id: 'CONT-02', code: 'CREE', name: 'CREE', address: 'Carretera al Norte, El Conchalito', latitude: 24.137975, longitude: -110.337452, lastCollectedOn: '2026-09-23' },
  { id: 'CONT-03', code: 'PARQUE MORELOS', name: 'Parque Morelos', address: 'Blvd. Gral. Agustín Olachea', latitude: 24.142479, longitude: -110.312830, lastCollectedOn: '2026-09-30' },
  { id: 'CONT-04', code: 'MALECÓN', name: 'Malecón', address: 'Paseo Álvaro Obregón 12, Col. Centro', latitude: 24.158041, longitude: -110.319819, lastCollectedOn: '2026-09-21' },
  { id: 'CONT-05', code: 'UABCS', name: 'UABCS', address: 'Blvd. Forjadores', latitude: 24.098210, longitude: -110.316907, lastCollectedOn: '2026-09-25' },
  { id: 'CONT-06', code: 'CAMINO REAL', name: 'Camino Real', address: 'Circuito los Bledales', latitude: 24.061530, longitude: -110.298913, lastCollectedOn: '2026-09-18' },
  { id: 'CONT-07', code: 'SEP', name: 'SEP', address: 'Luis Donaldo Colosio, Las Arboledas', latitude: 24.134313, longitude: -110.328148, lastCollectedOn: '2026-09-26' },
  { id: 'CONT-08', code: 'EL CENTENARIO', name: 'El Centenario', address: 'El Centenario', latitude: 24.102749, longitude: -110.413680, lastCollectedOn: '2026-09-15' }
];

export const returnStation = {
  id: 'ESTACION-01',
  code: 'ESTACIÓN DE REGRESO',
  address: 'Boulevard Pino Payas',
  latitude: 24.106111,
  longitude: -110.344054,
  status: 'pending',
  type: 'return-station'
};
