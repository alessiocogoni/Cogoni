// 3. pricing.js - Modulo di calcolo preventivo e notti
window.PricingService = {
  calculateQuote(checkInStr, checkOutStr, guests, selectedExtras) {
    if (!checkInStr || !checkOutStr) return null;

    const cfg = window.PROPERTY_CONFIG;
    const start = new Date(checkInStr);
    const end = new Date(checkOutStr);
    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const today = new Date(); today.setHours(0,0,0,0);
    const localStart = new Date(checkInStr + 'T00:00:00');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInStr) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOutStr)) return null;
    if (!Number.isFinite(nights) || nights <= 0 || localStart < today || !Number.isInteger(guests) || guests < 1 || guests > 4) return null;
    if (start.toISOString().slice(0,10) !== checkInStr || end.toISOString().slice(0,10) !== checkOutStr) return null;

    const nightlyRate = cfg.ratesPerNight[guests];
    if (!Number.isFinite(nightlyRate)) return null;
    const baseStay = nights * nightlyRate;
    const extraGuestsCost = 0;

    let extrasCost = 0;
    selectedExtras.forEach(key => {
      const item = cfg.extras[key];
      if (item) {
        extrasCost += item.perNight ? item.price * nights : item.price;
      }
    });

    const subtotal = baseStay + extraGuestsCost;
    const discount = nights >= 7 ? Math.round(subtotal * cfg.weeklyDiscountRate) : 0;
    const total = subtotal - discount + extrasCost + cfg.cleaningFee;

    return {
      nights,
      nightlyRate,
      baseStay,
      extraGuestsCost,
      extrasCost,
      discount,
      cleaningFee: cfg.cleaningFee,
      total
    };
  }
};
