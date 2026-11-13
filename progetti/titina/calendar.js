// 4. calendar.js - Modulo per la generazione e interazione con il calendario visivo
window.CalendarWidget = class CalendarWidget {
  constructor(gridEl, titleEl, onSelectRange) {
    this.gridEl = gridEl;
    this.titleEl = titleEl;
    this.onSelectRange = onSelectRange;
    this.currentDate = new Date();
    this.currentDate.setDate(1);
    this.startDate = null;
    this.endDate = null;
  }

  changeMonth(delta) {
    const next = new Date(this.currentDate.getFullYear(),this.currentDate.getMonth()+delta,1);
    const today = new Date(); if(next < new Date(today.getFullYear(),today.getMonth(),1))return;
    this.currentDate = next;
    this.render();
  }

  setRange(startStr, endStr) {
    this.startDate = startStr;
    this.endDate = endStr;
    if(startStr && /^\d{4}-\d{2}-\d{2}$/.test(startStr))this.currentDate=new Date(Number(startStr.slice(0,4)),Number(startStr.slice(5,7))-1,1);
    this.render();
  }

  formatISO(year, month, day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  handleDayClick(dateStr) {
    const today = new Date();
    if (dateStr < this.formatISO(today.getFullYear(), today.getMonth(), today.getDate())) return;
    if (this.startDate && !this.endDate && dateStr > this.startDate) {
      if (!window.StorageService.isRangeSelectable(this.startDate, dateStr)) return;
    } else if (window.StorageService.isSingleDateBooked(dateStr)) return;

    if (!this.startDate || (this.startDate && this.endDate)) {
      this.startDate = dateStr;
      this.endDate = null;
    } else if (dateStr > this.startDate) {
      this.endDate = dateStr;
    } else {
      this.startDate = dateStr;
      this.endDate = null;
    }

    this.render();
    this.onSelectRange(this.startDate, this.endDate);
  }

  render() {
    this.gridEl.innerHTML = '';
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const monthNames = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    this.titleEl.textContent = `${monthNames[month]} ${year}`;
    const now=new Date();document.getElementById('prevMonthBtn').disabled=year===now.getFullYear()&&month===now.getMonth();
    const hint=document.getElementById('calendarSelection');
    if(hint)hint.textContent=this.startDate&&this.endDate?`Dal ${this.startDate.split('-').reverse().join('/')} al ${this.endDate.split('-').reverse().join('/')} · ${Math.round((Date.parse(this.endDate)-Date.parse(this.startDate))/86400000)} notti`:this.startDate?'Ora scegli il giorno di partenza.':'1. Scegli l’arrivo · 2. Scegli la partenza';
    const reset=document.getElementById('clearDatesBtn');if(reset)reset.disabled=!this.startDate&&!this.endDate;

    const dayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    dayLabels.forEach(d => {
      const el = document.createElement('div');
      el.className = 'day-name';
      el.textContent = d;
      this.gridEl.appendChild(el);
    });

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      this.gridEl.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatISO(year, month, day);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.setAttribute('aria-label', `${day} ${monthNames[month]} ${year}`);
      cell.className = 'cal-day';
      cell.setAttribute('aria-pressed',String(dateStr===this.startDate||dateStr===this.endDate));
      cell.textContent = day;
      if(!window.StorageService.ready){cell.classList.add('unverified');cell.setAttribute('aria-label',`${day} ${monthNames[month]} ${year} · Date da verificare`);}

      const today = new Date();
      const past = dateStr < this.formatISO(today.getFullYear(), today.getMonth(), today.getDate());
      const selectingEnd = this.startDate && !this.endDate && dateStr > this.startDate;
      const selectedCheckout = dateStr===this.endDate && window.StorageService.isRangeSelectable(this.startDate,this.endDate);
      const blocked = selectedCheckout ? false : selectingEnd ? !window.StorageService.isRangeSelectable(this.startDate, dateStr) : window.StorageService.isSingleDateBooked(dateStr);
      if (past || blocked) {
        cell.disabled = true;
        cell.classList.add(past ? 'past' : !window.StorageService.ready ? 'unavailable' : 'booked');
        cell.setAttribute('aria-label', `${day} ${monthNames[month]} ${year} · ${past ? 'Data passata' : !window.StorageService.ready ? 'Disponibilità da verificare' : 'Non disponibile'}`);
      } else {
        if (dateStr === this.startDate || dateStr === this.endDate) {
          cell.classList.add('selected');
        } else if (this.startDate && this.endDate && dateStr > this.startDate && dateStr < this.endDate) {
          cell.classList.add('in-range');
        }
        cell.addEventListener('click', () => this.handleDayClick(dateStr));
      }

      this.gridEl.appendChild(cell);
    }
  }
};
