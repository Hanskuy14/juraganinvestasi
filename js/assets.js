/* =========================================================================
   assets.js — Physical Asset dealership.
   Catalog: 3 properties, 12 cars (5 brands), 10 motorcycles (4 brands).
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* =========================================================================
     PROPERTIES (Determines HRD Capacity)
     ========================================================================= */
  const PROPERTIES = [
    {
      key: 'coworking',
      name: 'Coworking Space',
      blurb: 'Ruangan fleksibel untuk merintis tim kecil di hub kota.',
      capacity: 1,
      price: 150_000_000,
      icon: '🏢',
      tier: 'Pemula',
    },
    {
      key: 'ruko-2-lantai',
      name: 'Ruko 2 Lantai',
      blurb: 'Ruko strategis 2 lantai di kawasan komersial yang ramai.',
      capacity: 2,
      price: 1_500_000_000,
      icon: '🏬',
      tier: 'Berkembang',
    },
    {
      key: 'gedung-scbd',
      name: 'Gedung Perkantoran SCBD',
      blurb: 'Office tower premium di SCBD, prestise tertinggi di Jakarta.',
      capacity: 3,
      price: 15_000_000_000,
      icon: '🏙',
      tier: 'Elite',
    },
  ];

  /* =========================================================================
     CARS — grouped by brand
     ========================================================================= */
  const CAR_BRANDS = [
    {
      brand: 'TOYOTA',
      tagline: 'Moving Forward',
      flag: '🇯🇵',
      isElectric: false,
      models: [
        { key: 'toyota-agya',    name: 'Agya',         price:   170_000_000, tier: 'City Car' },
        { key: 'toyota-avanza',  name: 'Avanza',       price:   250_000_000, tier: 'MPV Keluarga' },
        { key: 'toyota-alphard', name: 'Alphard',      price: 1_400_000_000, tier: 'Premium MPV' },
      ],
    },
    {
      brand: 'HONDA',
      tagline: 'The Power of Dreams',
      flag: '🇯🇵',
      isElectric: false,
      models: [
        { key: 'honda-brio',          name: 'Brio',          price:   165_000_000, tier: 'City Car' },
        { key: 'honda-hrv',           name: 'HR-V',          price:   380_000_000, tier: 'Compact SUV' },
        { key: 'honda-civic-type-r',  name: 'Civic Type R',  price: 1_400_000_000, tier: 'Hot Hatch' },
      ],
    },
    {
      brand: 'HYUNDAI',
      tagline: 'New Thinking. New Possibilities.',
      flag: '🇰🇷',
      isElectric: true,
      label: 'Mobil Listrik',
      models: [
        { key: 'hyundai-ioniq-5', name: 'Ioniq 5', price:   800_000_000, tier: 'EV Crossover' },
        { key: 'hyundai-ioniq-6', name: 'Ioniq 6', price: 1_200_000_000, tier: 'EV Sedan' },
      ],
    },
    {
      brand: 'TESLA',
      tagline: 'Accelerating the World',
      flag: '🇺🇸',
      isElectric: true,
      label: 'Mobil Listrik',
      models: [
        { key: 'tesla-model-3', name: 'Model 3', price: 1_500_000_000, tier: 'EV Sedan' },
        { key: 'tesla-model-x', name: 'Model X', price: 2_500_000_000, tier: 'EV SUV Premium' },
      ],
    },
    {
      brand: 'PORSCHE',
      tagline: 'There is No Substitute',
      flag: '🇩🇪',
      isElectric: false,
      models: [
        { key: 'porsche-macan',        name: 'Macan',        price: 2_500_000_000, tier: 'Sport SUV' },
        { key: 'porsche-911-carrera',  name: '911 Carrera',  price: 4_000_000_000, tier: 'Sports Car Ikonik' },
      ],
    },
  ];

  /* =========================================================================
     MOTORCYCLES — grouped by brand
     ========================================================================= */
  const MOTORCYCLE_BRANDS = [
    {
      brand: 'HONDA',
      flag: '🇯🇵',
      models: [
        { key: 'honda-beat',   name: 'Beat',   price: 18_000_000, tier: 'Matic Harian' },
        { key: 'honda-scoopy', name: 'Scoopy', price: 22_000_000, tier: 'Matic Stylish' },
        { key: 'honda-pcx',    name: 'PCX',    price: 33_000_000, tier: 'Matic Premium' },
      ],
    },
    {
      brand: 'YAMAHA',
      flag: '🇯🇵',
      models: [
        { key: 'yamaha-mio',   name: 'Mio',   price: 17_000_000, tier: 'Matic Ringan' },
        { key: 'yamaha-nmax',  name: 'NMAX',  price: 32_000_000, tier: 'Maxi Matic' },
        { key: 'yamaha-xmax',  name: 'XMAX',  price: 66_000_000, tier: 'Maxi Touring' },
      ],
    },
    {
      brand: 'KAWASAKI',
      flag: '🇯🇵',
      models: [
        { key: 'kawasaki-ninja-250', name: 'Ninja 250', price:  67_000_000, tier: 'Sport 250cc' },
        { key: 'kawasaki-zx-25r',    name: 'ZX-25R',    price: 135_000_000, tier: 'Sport 4-Cyl' },
      ],
    },
    {
      brand: 'VESPA',
      flag: '🇮🇹',
      models: [
        { key: 'vespa-lx-125', name: 'LX 125', price: 45_000_000, tier: 'Klasik Italia' },
        { key: 'vespa-sprint', name: 'Sprint', price: 55_000_000, tier: 'Sporty Klasik' },
      ],
    },
  ];

  /* ---------- Flat catalog & lookup ---------- */
  function allProperties() { return PROPERTIES; }

  function allCars() {
    const out = [];
    CAR_BRANDS.forEach(b => {
      b.models.forEach(m => out.push({
        ...m,
        brand: b.brand,
        flag: b.flag,
        isElectric: b.isElectric,
        tagline: b.tagline,
      }));
    });
    return out;
  }

  function allMotorcycles() {
    const out = [];
    MOTORCYCLE_BRANDS.forEach(b => {
      b.models.forEach(m => out.push({
        ...m,
        brand: b.brand,
        flag: b.flag,
      }));
    });
    return out;
  }

  function findPropertyDef(key) { return PROPERTIES.find(p => p.key === key); }
  function findCarDef(key)      { return allCars().find(c => c.key === key); }
  function findMotorcycleDef(key){ return allMotorcycles().find(m => m.key === key); }

  /* =========================================================================
     Office capacity recompute
     Sum of all owned property capacities.
     ========================================================================= */
  function recomputeOfficeCapacity(state) {
    const props = (state.physicalAssets && state.physicalAssets.properties) || [];
    const cap = props.reduce((a, p) => a + (p.capacity || 0), 0);
    state.physicalAssets.officeCapacity = cap;
    return cap;
  }

  /* =========================================================================
     Buy logic
     payment: { method: 'bank'|'credit', bankId }
     kind: 'property'|'car'|'motorcycle'
     ========================================================================= */
  let _instanceCounter = 1;
  function _newInstanceId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${(_instanceCounter++).toString(36)}`;
  }

  function buyPhysicalAsset(state, kind, key, payment) {
    let def, listKey, prefix;
    if (kind === 'property') {
      def = findPropertyDef(key); listKey = 'properties'; prefix = 'prop';
    } else if (kind === 'car') {
      def = findCarDef(key); listKey = 'cars'; prefix = 'car';
    } else if (kind === 'motorcycle') {
      def = findMotorcycleDef(key); listKey = 'motorcycles'; prefix = 'moto';
    } else {
      return { ok: false, error: 'Kategori aset tidak dikenal.' };
    }
    if (!def) return { ok: false, error: 'Item tidak ditemukan di katalog.' };

    const charged = JI.charge(state, def.price, payment);
    if (!charged.ok) return { ok: false, error: charged.error };

    const item = {
      instanceId: _newInstanceId(prefix),
      key: def.key,
      name: def.name,
      value: def.price,
      purchaseDay: state.totalDays,
    };
    if (kind === 'property') {
      item.capacity = def.capacity;
      item.tier = def.tier;
    } else {
      item.brand = def.brand;
      item.tier = def.tier;
      item.isElectric = !!def.isElectric;
    }

    state.physicalAssets[listKey].push(item);

    if (kind === 'property') {
      recomputeOfficeCapacity(state);
    }

    JI.recomputeNetWorth(state);
    JI.awardXP(state, Math.min(200, Math.floor(def.price / 50_000_000)));

    return { ok: true, kind, item, payment: charged };
  }

  /* ---------- Helpers for UI ---------- */
  function ownedCount(state, kind, key) {
    const map = { property: 'properties', car: 'cars', motorcycle: 'motorcycles' };
    const list = state.physicalAssets[map[kind]] || [];
    return list.filter(x => x.key === key).length;
  }

  function totalPhysicalValue(state) {
    const phys = state.physicalAssets || {};
    const sum = arr => (arr || []).reduce((a, x) => a + (x.value || 0), 0);
    return sum(phys.properties) + sum(phys.cars) + sum(phys.motorcycles);
  }

  /* =========================================================================
     Asset revaluation (Phase 3) — called once per month change.
       Vehicles (cars + motorcycles): -2%
       Properties: +1%
     Returns summary { vehiclesDepreciated, propertiesAppreciated,
                       vehicleDelta, propertyDelta }.
     ========================================================================= */
  const VEHICLE_DEPRECIATION = 0.02;
  const PROPERTY_APPRECIATION = 0.01;

  function revalueAssets(state) {
    const phys = state.physicalAssets || {};
    const summary = { vehiclesDepreciated: 0, propertiesAppreciated: 0,
                      vehicleDelta: 0, propertyDelta: 0 };
    const apply = (arr, factor, kind) => {
      (arr || []).forEach(item => {
        const before = item.value || 0;
        const after  = Math.max(1, Math.round(before * factor));
        const delta  = after - before;
        item.value = after;
        if (kind === 'vehicle') {
          summary.vehiclesDepreciated += 1;
          summary.vehicleDelta += delta;
        } else {
          summary.propertiesAppreciated += 1;
          summary.propertyDelta += delta;
        }
      });
    };
    apply(phys.cars,        1 - VEHICLE_DEPRECIATION,  'vehicle');
    apply(phys.motorcycles, 1 - VEHICLE_DEPRECIATION,  'vehicle');
    apply(phys.properties,  1 + PROPERTY_APPRECIATION, 'property');
    return summary;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    PROPERTIES,
    CAR_BRANDS,
    MOTORCYCLE_BRANDS,
    allProperties,
    allCars,
    allMotorcycles,
    findPropertyDef,
    findCarDef,
    findMotorcycleDef,
    recomputeOfficeCapacity,
    buyPhysicalAsset,
    ownedCount,
    totalPhysicalValue,
    // Phase 3
    revalueAssets,
    VEHICLE_DEPRECIATION,
    PROPERTY_APPRECIATION,
  });
})(window);
