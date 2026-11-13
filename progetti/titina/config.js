// 1. config.js - Configurazione tariffe, dettagli proprietà e servizi extra per Casa Vacanze Titina
window.PROPERTY_CONFIG = {
  name: "Casa Vacanze Titina",
  location: "Capoterra, Sardegna",
  ratesPerNight: { 1: 60, 2: 155, 3: 200, 4: 250 },
  cleaningFee: 50,
  weeklyDiscountRate: 0.10, // 10% di sconto per 7+ notti
  extras: {
    breakfast: { label: "Cesto Colazione Tipica", price: 15, perNight: true },
    ebike: { label: "Noleggio 2 E-Bike", price: 40, perNight: false },
    pets: { label: "Supplemento Igienizzazione Animali", price: 25, perNight: false }
  },
  whatsapp: '393421944222',
  defaultBookings: []
};
