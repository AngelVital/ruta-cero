/**
 * Catálogo único de puntos de recolección, compartido por campo y administración.
 */
export const collectionPoints = [
  { id: 'CONT-01', code: 'AYUNTAMIENTO', name: 'Ayuntamiento', address: 'Av. de los Deportistas', latitude: 24.123721, longitude: -110.316029 },
  { id: 'CONT-02', code: 'CREE', name: 'CREE', address: 'Carretera al Norte, El Conchalito', latitude: 24.137975, longitude: -110.337452 },
  { id: 'CONT-03', code: 'PARQUE MORELOS', name: 'Parque Morelos', address: 'Blvd. Gral. Agustín Olachea', latitude: 24.142479, longitude: -110.312830 },
  { id: 'CONT-04', code: 'MALECÓN', name: 'Malecón', address: 'Paseo Álvaro Obregón 12, Col. Centro', latitude: 24.158041, longitude: -110.319819 },
  { id: 'CONT-05', code: 'UABCS', name: 'UABCS', address: 'Blvd. Forjadores', latitude: 24.098210, longitude: -110.316907 },
  { id: 'CONT-06', code: 'CAMINO REAL', name: 'Camino Real', address: 'Circuito los Bledales', latitude: 24.061530, longitude: -110.298913 },
  { id: 'CONT-07', code: 'SEP', name: 'SEP', address: 'Luis Donaldo Colosio, Las Arboledas', latitude: 24.134313, longitude: -110.328148 },
  { id: 'CONT-08', code: 'EL CENTENARIO', name: 'El Centenario', address: 'El Centenario', latitude: 24.102749, longitude: -110.413680 },
  // Without exact coordinates the map searches by address.
  { id: 'CONT-09', code: 'TODOS SANTOS', name: 'Todos Santos', address: 'Todos Santos, Baja California Sur', latitude: 23.446289, longitude: -110.222389 }
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
