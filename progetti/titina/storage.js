// Never show unverified dates as available.
window.StorageService = {
 bookings: [], ready: false, pending: null,
 refresh() {
  if(this.pending)return this.pending;
  this.pending=(async()=>{try{const response=await fetch('/api/availability',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Calendario non disponibile');const dates=await response.json();if(!Array.isArray(dates)||dates.some(b=>typeof b.checkIn!=='string'||typeof b.checkOut!=='string'))throw Error('Risposta non valida');this.bookings=dates;this.ready=true;}catch(e){this.ready=false;throw e;}finally{this.pending=null;}})();return this.pending;
 },
 isRangeSelectable(start,end){return !!window.PricingService.calculateQuote(start,end,2,[])&&!this.bookings.some(b=>start<b.checkOut&&end>b.checkIn);},
 isDateRangeAvailable(start,end){return this.ready&&this.isRangeSelectable(start,end);},
 isSingleDateBooked(date){return this.bookings.some(b=>date>=b.checkIn&&date<b.checkOut);}
};
