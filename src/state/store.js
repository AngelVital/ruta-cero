/**
 * Store reactivo central para Ruta Cero
 * Coordina las 6 pantallas tácticas y datos compartidos de la operación
 */

class TacticalStore {
  constructor() {
    this.state = {
      currentScreen: 'dispatch',
      fullscreenMode: false,
      unit: {
        id: 'U-14',
        model: 'Freightliner M2 Econovo',
        plates: 'CDMX-982-Z',
        compactorCapacity: '12 Toneladas',
        odometer: 148920,
        status: 'OPERATIVO'
      },
      operator: {
        name: 'Carlos Mendoza #402',
        license: 'B-883491 (Vigente)',
        shift: 'Matutino • 06:00 - 14:00',
        depot: 'Base Norte Pantaco'
      },
      route: {
        id: 'R-04',
        name: 'Centro Histórico - Sector Norte',
        totalStops: 8,
        completedCount: 0,
        currentStopIndex: 0,
        status: 'PENDIENTE',
        startTime: '--:-- AM'
      },
      stops: [
        {
          id: 'CONT-01',
          code: 'AYUNTAMIENTO',
          address: 'Av. de los Deportistas',
          material: 'plastico',
          fillLevel: 0,
          status: 'active',
          time: '06:45 AM',
          collectedKg: 0
        },
        {
          id: 'CONT-02',
          code: 'CREE',
          address: 'Carretera al Norte, El Conchalito',
          material: 'carton',
          fillLevel: 0,
          status: 'pending',
          time: '07:18 AM',
          collectedKg: 0
        },
        {
          id: 'CONT-03',
          code: 'PARQUE MORELOS',
          address: 'Blvd. Gral. Agustín Olachea',
          material: 'papel',
          fillLevel: 0,
          status: 'pending',
          time: '08:00 AM',
          collectedKg: 0
        },
        {
          id: 'CONT-04',
          code: 'MALECÓN',
          address: 'Paseo Álvaro Obregón 12, Col. Centro',
          material: 'plastico',
          fillLevel: 0,
          status: 'pending',
          time: '08:45 AM',
          collectedKg: 0
        },
        {
          id: 'CONT-05',
          code: 'UABCS',
          address: 'Blvd. Forjadores',
          material: 'carton',
          fillLevel: 0,
          status: 'pending',
          time: '09:30 AM',
          collectedKg: 0
        },
        {
          id: 'CONT-06',
          code: 'CAMINO REAL',
          address: 'Circuito los Bledales',
          material: 'plastico',
          fillLevel: 0,
          status: 'pending',
          time: '10:15 AM',
          collectedKg: 0
        },
        {
          id: 'CONT-07',
          code: 'SEP',
          address: 'Luis Donaldo Colosio, Las Arboledas',
          material: 'papel',
          fillLevel: 0,
          status: 'pending',
          time: '11:00 AM',
          collectedKg: 0
        },
        {
          id: 'CONT-08',
          code: 'EL CENTENARIO',
          address: 'El Centenario',
          material: 'carton',
          fillLevel: 0,
          status: 'pending',
          time: '11:45 AM',
          collectedKg: 0
        }
      ],
      activeContainerId: 'CONT-01',
      inspection360: {
        tires: null,
        fluids: null,
        hydraulics: null,
        lights: null,
        brakes: null,
        wipers: null,
        mirrors: null,
        safetyGear: null,
        extinguisher: null,
        completed: false
      },
      inspectionComments: {},
      fuelLog: {
        preset: null,
        liters: 0,
        odometer: 148920,
        fuelStation: 'PEMEX Estación 0442 Norte'
      },
      toast: null
    };

    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.state));
  }

  setScreen(screenName) {
    this.state.currentScreen = screenName;
    this.notify();
  }

  toggleFullscreen() {
    this.state.fullscreenMode = !this.state.fullscreenMode;
    this.notify();
  }

  selectContainer(id) {
    this.state.activeContainerId = id;
    this.notify();
  }

  updateInspectionItem(key, value) {
    this.state.inspection360[key] = value;
    this.notify();
  }

  updateInspectionComment(key, comment) {
    if (!this.state.inspectionComments) {
      this.state.inspectionComments = {};
    }
    this.state.inspectionComments[key] = comment;
  }

  updateOdometer(val) {
    this.state.unit.odometer = Math.max(0, parseInt(val, 10) || 0);
    if (this.state.fuelLog) {
      this.state.fuelLog.odometer = this.state.unit.odometer;
    }
  }

  updateFuelLiters(delta) {
    this.state.fuelLog.liters = Math.max(0, +(this.state.fuelLog.liters + delta).toFixed(1));
    this.notify();
  }

  setFuelPreset(preset, liters) {
    this.state.fuelLog.preset = preset;
    this.state.fuelLog.liters = liters;
    this.notify();
  }

  completeContainerReport(containerId, reportData) {
    const stop = this.state.stops.find(s => s.id === containerId);
    if (stop) {
      stop.status = 'completed';
      stop.fillLevel = reportData.fillLevel;
      stop.collectedKg = reportData.collectedKg;
      if (reportData.materialWeights) {
        stop.materialWeights = { ...reportData.materialWeights };
      }
      if (reportData.materials) {
        stop.materials = reportData.materials;
        stop.material = reportData.materials[0] || stop.material;
      }
      this.state.route.completedCount = this.state.stops.filter(s => s.status === 'completed').length;

      // Select next pending stop
      const nextPending = this.state.stops.find(s => s.status === 'pending');
      if (nextPending) {
        nextPending.status = 'active';
        this.state.activeContainerId = nextPending.id;
      }
    }
    this.notify();
  }

  showToast(message, type = 'success') {
    this.state.toast = { message, type };
    this.notify();
    setTimeout(() => {
      if (this.state.toast && this.state.toast.message === message) {
        this.state.toast = null;
        this.notify();
      }
    }, 3500);
  }
}

export const store = new TacticalStore();
