// 5. app.js - Controller principale dell'applicazione (Casa Vacanze Titina)
document.addEventListener('DOMContentLoaded', async () => {
  const checkInInput = document.getElementById('checkIn');
  const checkOutInput = document.getElementById('checkOut');
  const guestsInput = document.getElementById('guests');
  const extraCheckboxes = document.querySelectorAll('.extra-checkbox');
  const priceSummaryEl = document.getElementById('priceSummary');
  const bookingForm = document.getElementById('bookingForm');
  const voucherContainer = document.getElementById('voucherContainer');

  const today = new Date();
  const todayISO = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
  checkInInput.min = todayISO;
  checkOutInput.min = todayISO;
  const message = document.getElementById('formMessage');
  const calendar = new window.CalendarWidget(
    document.getElementById('calendarGrid'),
    document.getElementById('calendarMonthTitle'),
    (start, end) => {
      checkInInput.value = start || '';
      checkOutInput.value = end || '';
      updatePriceUI();
    }
  );

  document.getElementById('prevMonthBtn').addEventListener('click', () => calendar.changeMonth(-1));
  document.getElementById('nextMonthBtn').addEventListener('click', () => calendar.changeMonth(1));

  function getSelectedExtras() {
    return Array.from(extraCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
  }

  function updatePriceUI() {
    const selectedGuests=Number(guestsInput.value);
    const selectedRate=window.PROPERTY_CONFIG.ratesPerNight[selectedGuests];
    document.querySelector('#prenota .rate').textContent=`€${selectedRate} / notte · per ${selectedGuests} ${selectedGuests===1?'ospite':'ospiti'}`;
    checkOutInput.min = checkInInput.value ? new Date(Date.parse(checkInInput.value)+86400000).toISOString().slice(0,10) : todayISO;
    const quote = window.PricingService.calculateQuote(
      checkInInput.value,
      checkOutInput.value,
      parseInt(guestsInput.value, 10),
      getSelectedExtras()
    );

    if (!quote) {
      const count=Number(guestsInput.value);
      const nightly=window.PROPERTY_CONFIG.ratesPerNight[count];
      priceSummaryEl.innerHTML = `<div class="price-row"><span>${count} ${count===1?'ospite':'ospiti'} · Tariffa per notte</span><strong>€${nightly}</strong></div><p class="calendar-note">Scegli date valide per calcolare il totale con pulizia finale ed eventuali extra.</p>`;
      return;
    }

    priceSummaryEl.innerHTML = `
      <div class="price-row"><span>Soggiorno (${quote.nights} notti × €${quote.nightlyRate})</span><span>€${quote.baseStay}</span></div>
      ${quote.extraGuestsCost > 0 ? `<div class="price-row"><span>Ospiti extra</span><span>€${quote.extraGuestsCost}</span></div>` : ''}
      ${quote.extrasCost > 0 ? `<div class="price-row"><span>Servizi extra</span><span>€${quote.extrasCost}</span></div>` : ''}
      ${quote.discount > 0 ? `<div class="price-row" style="color:#16a34a;"><span>Sconto 7+ notti (10%)</span><span>-€${quote.discount}</span></div>` : ''}
      <div class="price-row"><span>Pulizia finale</span><span>€${quote.cleaningFee}</span></div>
      <div class="price-total"><span>Totale Preventivo</span><span>€${quote.total}</span></div>
    `;
  }

  [checkInInput, checkOutInput].forEach(el => {
    el.addEventListener('change', () => {
      if(el===checkInInput && checkOutInput.value<=checkInInput.value)checkOutInput.value='';
      calendar.setRange(checkInInput.value, checkOutInput.value);
      updatePriceUI();
    });
  });

  guestsInput.addEventListener('input', updatePriceUI);
  guestsInput.addEventListener('change', updatePriceUI);
  extraCheckboxes.forEach(cb => cb.addEventListener('change', updatePriceUI));

  let requestKey = null, lastPayload = '', submitting = false;
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;
    const checkIn = checkInInput.value;
    const checkOut = checkOutInput.value;

    message.textContent = '';
    if (!window.StorageService.isDateRangeAvailable(checkIn, checkOut)) {
      message.textContent = 'Controlla le date: l’intervallo non è valido oppure si sovrappone a una prenotazione confermata.';
      return;
    }

    const quote = window.PricingService.calculateQuote(checkIn, checkOut, parseInt(guestsInput.value, 10), getSelectedExtras());
    if (!quote) {
      message.textContent = 'Scegli una data di arrivo da oggi in poi e una partenza successiva.';
      return;
    }

    const name = document.getElementById('guestName').value.trim();
    if (!name) { message.textContent = 'Inserisci il tuo nome.'; return; }
    const payload = {guestName:name, guestEmail:document.getElementById('guestEmail').value.trim(), checkIn, checkOut, guests:Number(guestsInput.value), extras:getSelectedExtras()};
    const fingerprint = JSON.stringify(payload);
    if (fingerprint !== lastPayload) { requestKey = crypto.randomUUID(); lastPayload = fingerprint; }
    const submit = bookingForm.querySelector('button[type=submit]');
    submitting = true; submit.disabled = true; submit.textContent='Invio della richiesta…';
    let saved;
    try {
      const response = await fetch('/api/bookings', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestKey})});
      saved = await response.json();
      if (!response.ok) throw new Error(saved.error || 'Non siamo riusciti a inviare la richiesta. Riprova tra poco.');
    } catch(error) { message.textContent = error instanceof TypeError || error instanceof SyntaxError ? 'Non siamo riusciti a inviare la richiesta. Riprova tra poco oppure contattaci su WhatsApp.' : error.message; return; }
    finally { submitting = false; submit.disabled = !window.StorageService.ready; submit.textContent='Invia richiesta di disponibilità'; }
    const extras = getSelectedExtras().map(key => window.PROPERTY_CONFIG.extras[key].label);
    const text = `Buongiorno! Ho inviato la richiesta ${saved.id} per Casa Vacanze Titina.\nNome: ${name}\nEmail: ${document.getElementById('guestEmail').value.trim()}\nArrivo: ${checkIn}\nPartenza: ${checkOut}\nOspiti: ${guestsInput.value}\nExtra: ${extras.join(', ') || 'Nessuno'}\nPreventivo indicativo: €${saved.total} (${quote.nights} notti, pulizia finale inclusa).\nPotete confermare disponibilità, servizi e prezzo finale?`;
    const url = 'https://wa.me/' + window.PROPERTY_CONFIG.whatsapp + '?text=' + encodeURIComponent(text);
    voucherContainer.classList.remove('hidden');
    voucherContainer.replaceChildren();
    const box = document.createElement('div'); box.className = 'voucher-box';
    const heading = document.createElement('h3'); heading.textContent = 'Richiesta ricevuta.';
    const note = document.createElement('p'); note.textContent = 'Grazie! Abbiamo ricevuto la tua richiesta. Ti risponderemo per confermare disponibilità e prezzo. Se vuoi, puoi contattarci anche su WhatsApp.';
    const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.className = 'btn-primary'; link.textContent = 'Apri la richiesta su WhatsApp';
    const code = document.createElement('p'); code.textContent = 'Codice richiesta: ' + saved.id;
    const receipt = document.createElement('button'); receipt.type='button'; receipt.className='btn-outline'; receipt.textContent='Scarica riepilogo';
    receipt.onclick=()=>{const file=new Blob([text+'\n\nLa richiesta non costituisce conferma di prenotazione.\nControlla lo stato dal sito con il codice e la tua email.'],{type:'text/plain;charset=utf-8'});const href=URL.createObjectURL(file);const a=document.createElement('a');a.href=href;a.download='richiesta-titina.txt';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);};
    document.getElementById('requestId').value=saved.id;document.getElementById('requestEmail').value=payload.guestEmail;
    box.append(heading, note, code, receipt, link); voucherContainer.append(box);

  });

  const availabilityNote=document.createElement('p');availabilityNote.className='calendar-note';availabilityNote.setAttribute('role','status');document.getElementById('calendarGrid').after(availabilityNote);
  document.getElementById('clearDatesBtn').onclick=()=>{checkInInput.value='';checkOutInput.value='';calendar.setRange('','');message.textContent='';updatePriceUI();};
  const retry=document.getElementById('retryCalendarBtn');
  async function refreshCalendar(){
    if(retry.disabled)return;retry.disabled=true;retry.textContent='Verifica in corso…';availabilityNote.textContent='Verifica della disponibilità…';
    try {await window.StorageService.refresh();availabilityNote.textContent='Disponibilità aggiornata. Scegli le date nel calendario.';}
    catch {availabilityNote.textContent='Date da verificare';}
    finally{retry.disabled=false;retry.textContent=window.StorageService.ready?'Aggiorna disponibilità':'Verifica disponibilità';}
    calendar.render();bookingForm.querySelector('button[type=submit]').disabled=!window.StorageService.ready || submitting;
    if(checkInInput.value&&checkOutInput.value&&!window.StorageService.isDateRangeAvailable(checkInInput.value,checkOutInput.value))message.textContent='Le date selezionate non sono disponibili o non sono ancora verificabili. Aggiorna o scegli un altro periodo.';
    else message.textContent='';
  }
  retry.onclick=refreshCalendar;
  calendar.render();updatePriceUI();
  await refreshCalendar();
  setInterval(refreshCalendar,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCalendar();});
  calendar.render();
  updatePriceUI();
});

document.getElementById('statusForm').onsubmit=async e=>{
 e.preventDefault();const button=e.submitter,result=document.getElementById('requestResult');button.disabled=true;result.textContent='Verifica in corso…';
 try{const r=await fetch('/api/request-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:document.getElementById('requestId').value.trim(),email:document.getElementById('requestEmail').value.trim()})});const b=await r.json();if(!r.ok)throw Error(b.error);result.replaceChildren();const title=document.createElement('h3');title.textContent=b.status;const detail=document.createElement('p');detail.textContent=`${b.checkIn} - ${b.checkOut} · ${b.guests} ospiti · Preventivo €${b.total}`;const note=document.createElement('p');note.textContent=b.status==='Da confermare'?'La struttura deve ancora confermare il soggiorno. Per informazioni contattaci su WhatsApp.':b.status==='Confermata'?'La struttura ha confermato il soggiorno. Contattaci per accordare arrivo e pagamento.':'La richiesta è stata annullata. Puoi richiedere un altro soggiorno.';result.append(title,detail,note);}catch(err){result.textContent=err instanceof TypeError?'Connessione non disponibile. Riprova quando sei online.':err.message;}finally{button.disabled=false;}
};
