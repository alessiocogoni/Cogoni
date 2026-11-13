if(location.protocol==='file:'){
 const notice=document.createElement('div');notice.className='connection-notice';
 const text=document.createElement('p');text.textContent='Questa è una copia del file: per usare calendario e prenotazioni apri APRI-SITO.cmd nella cartella Casa Titina.';
 const link=document.createElement('a');link.className='btn-primary';link.href='http://127.0.0.1:3100'+(document.getElementById('loginPanel')?'/gestione':'/');link.textContent='Apri l’app attiva';notice.append(text,link);document.body.prepend(notice);
}
