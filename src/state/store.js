/**
 * Store reactivo central para Ruta Cero
 * Coordina las 6 pantallas tácticas y datos compartidos de la operación
 */

class TacticalStore {
  constructor() {
    this.state = {
      currentScreen: 'dispatch',
      screenTransition: null,
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
          latitude: 24.123721,
          longitude: -110.316029,
          status: 'active'
        },
        {
          id: 'CONT-02',
          code: 'CREE',
          address: 'Carretera al Norte, El Conchalito',
          latitude: 24.137975,
          longitude: -110.337452,
          status: 'pending'
        },
        {
          id: 'CONT-03',
          code: 'PARQUE MORELOS',
          address: 'Blvd. Gral. Agustín Olachea',
          latitude: 24.142479,
          longitude: -110.312830,
          status: 'pending'
        },
        {
          id: 'CONT-04',
          code: 'MALECÓN',
          address: 'Paseo Álvaro Obregón 12, Col. Centro',
          latitude: 24.158041,
          longitude: -110.319819,
          status: 'pending'
        },
        {
          id: 'CONT-05',
          code: 'UABCS',
          address: 'Blvd. Forjadores',
          latitude: 24.098210,
          longitude: -110.316907,
          status: 'pending'
        },
        {
          id: 'CONT-06',
          code: 'CAMINO REAL',
          address: 'Circuito los Bledales',
          latitude: 24.061530,
          longitude: -110.298913,
          status: 'pending'
        },
        {
          id: 'CONT-07',
          code: 'SEP',
          address: 'Luis Donaldo Colosio, Las Arboledas',
          latitude: 24.134313,
          longitude: -110.328148,
          status: 'pending'
        },
        {
          id: 'CONT-08',
          code: 'EL CENTENARIO',
          address: 'El Centenario',
          latitude: 24.102749,
          longitude: -110.413680,
          status: 'pending'
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
        odometerPhotoEvidence: false,
        completed: false
      },
      inspectionComments: {},
      fuelLevel: {
        preset: null,
        liters: 0,
        odometer: 148920
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

  setScreen(screenName, transition = 'slide-left') {
    this.state.currentScreen = screenName;
    this.state.screenTransition = transition;
    this.notify();
  }

  selectContainer(id) {
    this.state.activeContainerId = id;
    this.state.stops.forEach((stop) => {
      if (stop.status !== 'completed') {
        stop.status = stop.id === id ? 'active' : 'pending';
      }
    });
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
    if (this.state.fuelLevel) {
      this.state.fuelLevel.odometer = this.state.unit.odometer;
    }
  }

  updateFuelLiters(delta) {
    this.state.fuelLevel.liters = Math.max(0, +(this.state.fuelLevel.liters + delta).toFixed(1));
    this.notify();
  }

  setFuelPreset(preset, liters, shouldNotify = true) {
    this.state.fuelLevel.preset = preset;
    this.state.fuelLevel.liters = liters;
    if (shouldNotify) {
      this.notify();
    }
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
      if (reportData.photoEvidence) {
        stop.photoEvidence = { ...reportData.photoEvidence };
      }
      if (reportData.incidents) {
        stop.incidents = { ...reportData.incidents };
      }
      if (reportData.incidentComments !== undefined) {
        stop.incidentComments = reportData.incidentComments;
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
