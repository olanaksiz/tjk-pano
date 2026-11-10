function tjkdBaslat() {
// TJK Detay — yalnız "sıradaki koşu" vurgusu (sayfa içeriği HTML'de hazırdır)
(function () {
  var kosular = document.querySelectorAll('.kosu[data-bas]');
  if (!kosular.length) return;
  var gun = document.body.getAttribute('data-gun');
  var simdi;
  try {
    var p = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false}).formatToParts(new Date());
    var g = {}; p.forEach(function (x) { g[x.type] = x.value; });
    if (g.year + '-' + g.month + '-' + g.day !== gun) return;
    simdi = Number(g.hour) * 60 + Number(g.minute);
  } catch (e) { return; }
  function siradaki(kapsam) {
    var s = null;
    [].forEach.call(kapsam, function (k) {
      if (k.getAttribute('data-bitti') === '1') return;
      var t = k.getAttribute('data-bas').split(':');
      var dk = Number(t[0]) * 60 + Number(t[1]);
      if (dk + 3 >= simdi && (!s || dk < s.dk)) s = {el: k, dk: dk};
    });
    return s;
  }
  var sec = siradaki(kosular);
  // Sayfaya bir hipodrom (#adana) ya da koşu (#adana-3) bağlantısıyla gelindiyse oraya git; hipodromsa o hipodromun sıradaki koşusuna.
  // Kilitli içerik açılınca sayfa uzadığı için tarayıcının ilk atlaması kayar; bu yüzden içerik açıldıktan sonra yeniden kaydırılır.
  var hedef = null, hs = decodeURIComponent(location.hash.slice(1));
  if (hs) {
    var he = document.getElementById(hs);
    if (he && he.classList.contains('hip-bolum')) {
      var hsec = siradaki(he.querySelectorAll('.kosu[data-bas]'));
      hedef = hsec ? hsec.el : he;
    } else if (he) hedef = he;
  } else if (sec && sec.el.matches('article.kx')) hedef = sec.el;
  if (hedef) {
    var elle = false;
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (e) { window.addEventListener(e, function () { elle = true; }, {once: true, passive: true}); });
    var git = function () { if (!elle) hedef.scrollIntoView({block: 'start'}); };
    git(); setTimeout(git, 400); setTimeout(git, 1200);
  }
  // Sayfa içindeki hipodrom adına (İstanbul / Adana) tıklayınca o hipodromun sıradaki koşusuna git
  [].forEach.call(document.querySelectorAll('a.ks-serit-ad[href^="#"]'), function (a) {
    a.addEventListener('click', function (e) {
      var bol = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); if (!bol) return;
      var s2 = siradaki(bol.querySelectorAll('.kosu[data-bas]')); if (!s2) return;
      e.preventDefault();
      try { history.replaceState(null, '', '#' + s2.el.id); } catch (er) {}
      s2.el.scrollIntoView({block: 'start', behavior: 'smooth'});
    });
  });
  if (!sec) return;
  sec.el.classList.add('sirada');
  var cip = document.querySelector('.ks-c[data-ks="' + sec.el.id + '"]'); if (cip) { cip.classList.add('sirada'); if (cip.parentNode.scrollTo) cip.parentNode.scrollTo({left: cip.offsetLeft - 80}); }
  var kutu = document.querySelector('.siradaki');
  if (kutu && kutu.classList.contains('sra')) {
    var no = sec.el.querySelector('.kx-no'), hp = sec.el.querySelector('.kx-hip'), mt = sec.el.querySelector('.kx-meta');
    kutu.querySelector('.sra-no').textContent = no ? no.textContent : '';
    kutu.querySelector('.sra-hip').textContent = hp ? hp.textContent : '';
    kutu.querySelector('.sra-meta').textContent = mt ? mt.textContent.replace(/\s+/g, ' ').trim() : '';
    kutu.querySelector('.sra-saat b').textContent = sec.el.getAttribute('data-bas');
    kutu.querySelector('.sra-git').href = '#' + sec.el.id;
    var sonra = null;
    kosular.forEach(function (k) {
      if (k === sec.el || k.getAttribute('data-bitti') === '1') return;
      var t = k.getAttribute('data-bas').split(':'), dk = Number(t[0]) * 60 + Number(t[1]);
      if (dk >= sec.dk && (!sonra || dk < sonra.dk)) sonra = {el: k, dk: dk};
    });
    if (sonra) kutu.querySelector('.sra-sonra').innerHTML = 'Sonra: <a href="#' + sonra.el.id + '">' + ((sonra.el.querySelector('.kx-hip') || {}).textContent || '') + ' ' + ((sonra.el.querySelector('.kx-no') || {}).textContent || '') + ' · ' + sonra.el.getAttribute('data-bas') + '</a>';
    kutu.setAttribute('data-hedef', sec.el.id);
    kutu.classList.add('var');
    document.dispatchEvent(new Event('tjkd-sra'));
  } else if (kutu) {
    var a = kutu.querySelector('a');
    a.href = '#' + sec.el.id;
    a.textContent = sec.el.getAttribute('data-ad');
    kutu.classList.add('var');
  }
})();

// Hipodrom saat şeridi (mobil ana sayfa): sıradaki koşu saati, 15 dk kala kırmızı
(function () {
  var cipler = document.querySelectorAll('.hs[data-saatler]');
  if (!cipler.length) return;
  var gun = document.body.getAttribute('data-gun'), bugun, simdi;
  try {
    var p = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false}).formatToParts(new Date());
    var g = {}; p.forEach(function (x) { g[x.type] = x.value; });
    bugun = g.year + '-' + g.month + '-' + g.day;
    simdi = Number(g.hour) * 60 + Number(g.minute);
  } catch (e) { return; }
  cipler.forEach(function (c) {
    var rozet = c.querySelector('.hs-saat');
    if (gun < bugun) { rozet.textContent = 'Sonuçlandı'; rozet.classList.add('bitti'); return; }
    if (gun > bugun) return;
    var sira = null;
    c.getAttribute('data-saatler').split(',').some(function (s) {
      var t = s.split(':'), dk = Number(t[0]) * 60 + Number(t[1]);
      if (dk + 3 >= simdi) { sira = {s: s, dk: dk}; return true; }
      return false;
    });
    if (!sira) { rozet.textContent = 'Sonuçlandı'; rozet.classList.add('bitti'); return; }
    rozet.textContent = sira.s;
    if (sira.dk - simdi <= 15) rozet.classList.add('yakin');
    var idler = (c.getAttribute('data-idler') || '').split(','), sa = c.getAttribute('data-saatler').split(',');
    var i = sa.indexOf(sira.s); if (i >= 0 && idler[i]) c.href = c.href.split('#')[0] + '#' + idler[i];
  });
})();

// Mobil menü: dışarı dokununca ya da Esc ile kapanır
(function () {
  var m = document.querySelector('.mmenu');
  if (!m) return;
  document.addEventListener('click', function (e) { if (m.open && !m.contains(e.target)) m.open = false; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && m.open) { m.open = false; m.querySelector('summary').focus(); } });
  m.querySelectorAll('.mm-panel a').forEach(function (a) { a.addEventListener('click', function () { m.open = false; }); });
})();

/* ---- Canlı yayın sayfası: tıkla-oynat (youtube-nocookie), sekmeler, admin listesi ---- */
(function () {
  var kok = document.querySelector('[data-canli]');
  if (!kok) return;
  var oy = document.querySelector('[data-oynatici]');
  var veri = {};
  try { veri = JSON.parse(document.getElementById('canli-veri').textContent || '{}'); } catch (e) { veri = {}; }
  function idAl(x) {
    if (!x) return '';
    if (/^[\w-]{11}$/.test(x)) return x;
    var m = String(x).match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/)([\w-]{11})/);
    return m ? m[1] : '';
  }
  function el(t, c, yazi) { var e = document.createElement(t); if (c) e.className = c; if (yazi != null) e.textContent = yazi; return e; }
  function resim(id) { var i = el('img'); i.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; i.alt = ''; i.width = 480; i.height = 360; i.loading = 'lazy'; return i; }
  function poster(y) {
    if (!oy || !y || oy.classList.contains('oynuyor')) return;
    var b = el('button', 'cy-poster'); b.type = 'button';
    b.dataset.yayin = y.id; b.dataset.gomulu = y.gomulu ? '1' : '0'; b.dataset.baslik = y.baslik + ' · ' + y.yer;
    b.setAttribute('aria-label', y.baslik + ', ' + y.yer + (y.gomulu ? ' yayınını oynat' : " yayınını YouTube'da aç"));
    b.appendChild(resim(y.id));
    b.appendChild(el('i', 'cy-oynat buyuk'));
    var ic = el('span', 'cy-poster-ic');
    ic.appendChild(el('b', '', y.baslik + ' · ' + y.yer));
    ic.appendChild(el('small', '', y.gomulu ? 'Oynatmak için dokun' : "TJK bu yayını yalnızca YouTube'da açıyor · dokun"));
    b.appendChild(ic); oy.textContent = ''; oy.appendChild(b);
  }
  function oynat(id, gomulu, baslik) {
    if (!gomulu) { window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener'); return; }
    var f = el('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
    f.title = baslik || 'TJK TV canlı yayın';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.setAttribute('allowfullscreen', '');
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    oy.textContent = ''; oy.appendChild(f); oy.classList.add('oynuyor');
    var r = oy.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) oy.scrollIntoView({behavior: 'smooth', block: 'center'});
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-yayin]');
    if (!a || !kok.parentNode) return;
    var g = a.getAttribute('data-gomulu') === '1';
    if (!g && a.tagName === 'A') return; // yeni sekmede YouTube
    e.preventDefault();
    oynat(a.getAttribute('data-yayin'), g, a.getAttribute('data-baslik'));
  });
  function sekme() {
    var b = location.hash === '#yurt-disi' ? 'yurtdisi' : 'yurtici';
    document.querySelectorAll('[data-sekme]').forEach(function (s) { if (s.getAttribute('data-sekme') === b) s.setAttribute('aria-current', 'true'); else s.removeAttribute('aria-current'); });
    var L = veri[b] || [];
    if (L.length) poster(L[0]);
  }
  addEventListener('hashchange', function () { if (oy && /^#yurt-(ici|disi)$/.test(location.hash)) oy.classList.remove('oynuyor'); sekme(); });
  sekme();
  // Admin → "Canlı yayın" modülünde girilen liste varsa onu kullan
  function listeCiz(bolum, L) {
    var ul = document.querySelector('#' + (bolum === 'yurtici' ? 'yurt-ici' : 'yurt-disi') + ' .cy-kartlar');
    if (!ul) return;
    ul.textContent = '';
    L.forEach(function (y) {
      var li = el('li', 'cy-kart'), a = el('a');
      a.href = 'https://www.youtube.com/watch?v=' + y.id; a.target = '_blank'; a.rel = 'noopener';
      a.dataset.yayin = y.id; a.dataset.gomulu = y.gomulu ? '1' : '0'; a.dataset.baslik = y.baslik + ' · ' + y.yer;
      var r = el('span', 'cy-resim'); r.appendChild(resim(y.id)); r.appendChild(el('i', 'cy-oynat'));
      if (!y.gomulu) r.appendChild(el('em', '', "YouTube'da açılır"));
      var t = el('span', 'cy-yazi'); t.appendChild(el('b', '', y.baslik)); t.appendChild(el('small', '', y.yer || ''));
      a.appendChild(r); a.appendChild(t); li.appendChild(a); ul.appendChild(li);
    });
  }
  document.addEventListener('DOMContentLoaded', function () { if (window.TJKD && TJKD.ayarlar) TJKD.ayarlar().then(function (m) {
    var c = m && m.canli_yayin;
    if (!c) return;
    var degisti = false;
    ['yurtici', 'yurtdisi'].forEach(function (b) {
      var L = (Array.isArray(c[b]) ? c[b] : []).map(function (y) { return {id: idAl(y.url || y.id), baslik: String(y.baslik || 'TJK TV'), yer: String(y.yer || ''), gomulu: y.gomulu !== false}; }).filter(function (y) { return y.id; });
      if (L.length) { veri[b] = L; listeCiz(b, L); degisti = true; }
    });
    if (degisti) sekme();
  }); });
})();

/* ---- Kampanyalar: admin duyurusu sayfada da görünsün ---- */
document.addEventListener('DOMContentLoaded', function () {
  var k = document.querySelector('[data-kamp-duyuru]');
  if (!k || !window.TJKD || !TJKD.ayarlar) return;
  TJKD.ayarlar().then(function (m) {
    var d = (m && m.site) || {};
    if (!d.duyuru_aktif || !d.duyuru) return;
    var b = document.createElement('b'); b.textContent = 'Güncel duyuru';
    var p = document.createElement('p'); p.textContent = d.duyuru;
    k.appendChild(b); k.appendChild(p);
    if (d.duyuru_link && /^(https?:)?\/\//.test(d.duyuru_link) || /^\//.test(d.duyuru_link || '')) { var a = document.createElement('a'); a.href = d.duyuru_link; a.textContent = 'Ayrıntı'; a.className = 'dugme dugme-mavi'; k.appendChild(a); }
    k.hidden = false;
  });
});

/* ---- Çerez politikası: bu tarayıcıda ziyaret sayacını kapat/aç ---- */
(function () {
  var b = document.querySelector('[data-sayac-kapat]'); if (!b) return;
  var d = document.querySelector('[data-sayac-durum]');
  function kapali() { try { return localStorage.getItem('tjkd-z-kapali') === '1'; } catch (e) { return false; } }
  function ciz() { var k = kapali(); b.textContent = k ? 'Sayacı yeniden aç' : 'Bu tarayıcıda sayacı kapat'; if (d) d.textContent = k ? 'Bu tarayıcıda ziyaret sayacı kapalı; sayfa açılışlarınız sayılmıyor.' : 'Sayılmak istemiyorsanız aşağıdaki düğmeyle bu tarayıcıda sayacı kapatabilirsiniz.'; }
  b.addEventListener('click', function () { try { if (kapali()) { localStorage.removeItem('tjkd-z-kapali'); } else { localStorage.setItem('tjkd-z-kapali', '1'); try { localStorage.removeItem('tjkd-z-gordu'); sessionStorage.removeItem('tjkd-z'); } catch (e) {} } } catch (e) {} ciz(); });
  ciz();
})();

/* ---- Sözlük: arama ve kategori ---- */
(function () {
  var ara = document.querySelector('[data-sz-ara]'); if (!ara) return;
  var kat = '', terimler = Array.prototype.slice.call(document.querySelectorAll('.sz-terim')), bos = document.querySelector('[data-sz-bos]');
  function kucuk(s) { return String(s || '').replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase(); }
  function suz() {
    var q = kucuk(ara.value.trim()), n = 0;
    terimler.forEach(function (t) { var ok = (!kat || t.getAttribute('data-kat') === kat) && (!q || t.getAttribute('data-ara').indexOf(q) >= 0); t.hidden = !ok; if (ok) n++; });
    document.querySelectorAll('.sz-harf').forEach(function (h) { h.hidden = !h.querySelector('.sz-terim:not([hidden])'); });
    if (bos) bos.hidden = n > 0;
  }
  ara.addEventListener('input', suz);
  document.querySelectorAll('[data-sz-kat]').forEach(function (b) {
    b.addEventListener('click', function () { kat = b.getAttribute('data-sz-kat'); document.querySelectorAll('[data-sz-kat]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); suz(); });
  });
})();

/* ---- Jokeyler: arama ve tür filtresi ---- */
(function () {
  var ara = document.querySelector('[data-jk-ara]'); if (!ara) return;
  var tur = '', satirlar = Array.prototype.slice.call(document.querySelectorAll('.jk-tablo tbody tr'));
  function kucuk(s) { return String(s || '').replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase(); }
  function suz() { var q = kucuk(ara.value.trim()); satirlar.forEach(function (r) { r.hidden = !((!tur || r.getAttribute('data-tur') === tur) && (!q || r.getAttribute('data-ara').indexOf(q) >= 0)); }); }
  ara.addEventListener('input', function () { suz(); if (ara.value.trim()) { var t = document.getElementById('tum-b'); if (t && t.getBoundingClientRect().top > innerHeight) t.scrollIntoView({behavior: 'smooth'}); } });
  document.querySelectorAll('[data-jk-tur]').forEach(function (b) {
    b.addEventListener('click', function () { tur = b.getAttribute('data-jk-tur'); document.querySelectorAll('[data-jk-tur]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); suz(); });
  });
})();

/* ---- Jokey fotoğrafı: admin'den yüklenen izinli fotoğraf varsa çizimin yerine geçer ---- */
document.addEventListener('DOMContentLoaded', function () {
  var alanlar = document.querySelectorAll('[data-jokey-foto]');
  if (!alanlar.length || !window.TJKD || !TJKD.ayarlar) return;
  TJKD.ayarlar().then(function (m) {
    var F = (m && m.jokey_foto) || {};
    alanlar.forEach(function (a) {
      var f = F[a.getAttribute('data-jokey-foto')]; if (!f || !f.url || !/^https:\/\//.test(f.url)) return;
      var img = document.createElement('img'); img.src = f.url; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      img.onload = function () { a.classList.add('fotolu'); }; a.appendChild(img);
      var fig = a.closest('figure'); var cap = fig && fig.querySelector('[data-jokey-foto-kaynak]');
      if (cap && f.kaynak) { cap.textContent = 'Fotoğraf: ' + f.kaynak; cap.hidden = false; }
    });
  });
});

// Hazır kuponlar: kuponu panoya kopyala
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-kopya]');
  if (!b) return;
  var t = b.getAttribute('data-kopya');
  var bitti = function () { var eski = b.textContent; b.textContent = 'Kopyalandı'; b.classList.add('ok'); setTimeout(function () { b.textContent = eski; b.classList.remove('ok'); }, 1800); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(bitti, function () {});
  else { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); bitti(); } catch (x) {} a.remove(); }
});

/* ---- Sonuçlar: tarih şeridi + TJK arşivinden günün tüm sonuçları (sayfa içinde) ---- */
(function () {
  var bar = document.querySelector('[data-sonuc-tarih]');
  if (!bar) return;
  var AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var AYK = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  var GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  var GUNK = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  var canli = bar.getAttribute('data-bugun');
  var sayfa = bar.getAttribute('data-sayfa') || canli;
  var ist = ''; try { ist = new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Istanbul'}); } catch (x) {}
  var bugun = [canli, sayfa, /^\d{4}-\d\d-\d\d$/.test(ist) ? ist : ''].sort().pop();
  var anaSayfa = location.pathname === '/sonuclar/';
  var analizli = (bar.getAttribute('data-analizli') || '').split(',').filter(Boolean);
  var inp = bar.querySelector('input[type=date]');
  var yaziEl = bar.querySelector('[data-st-yazi]'), hgunEl = bar.querySelector('[data-st-hgun]');
  var seri = document.querySelector('[data-st-seri]');
  var durum = document.querySelector('[data-st-durum]');
  var icerik = document.querySelector('[data-st-icerik]');
  var ustTarih = document.querySelector('.bas .tarih');
  var bugunHTML = icerik ? icerik.innerHTML : '';
  var bugunUst = ustTarih ? ustTarih.textContent : '';
  var gunler = [], hipler = {}, secili = sayfa, onbellek = {};

  function d(t) { var p = t.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function uzun(t) { var x = d(t); return x.getUTCDate() + ' ' + AY[x.getUTCMonth()] + ' ' + x.getUTCFullYear(); }
  function hg(t) { return GUN[d(t).getUTCDay()]; }
  function tjk(t) { var p = t.split('-'); return 'https://www.tjk.org/TR/YarisSever/Info/Page/GunlukYarisSonuclari?QueryParameter_Tarih=' + p[2] + '%2F' + p[1] + '%2F' + p[0]; }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function tl(x) { return x ? x + ' ₺' : ''; }

  function seriCiz() {
    if (!seri) return;
    seri.innerHTML = '';
    var tum = gunler.slice();
    if (tum.indexOf(bugun) < 0) tum.push(bugun);
    var i = tum.indexOf(secili); if (i < 0) i = tum.length - 1;
    var bas = Math.max(0, Math.min(i - 7, tum.length - 12));
    tum.slice(bas, bas + 12).forEach(function (t) {
      var x = d(t), b = el('button', 'st-cip');
      b.type = 'button'; b.setAttribute('data-t', t);
      if (t === secili) b.setAttribute('aria-current', 'date');
      b.appendChild(el('span', 'st-cip-g', GUNK[x.getUTCDay()]));
      b.appendChild(el('b', '', String(x.getUTCDate())));
      b.appendChild(el('span', 'st-cip-a', AYK[x.getUTCMonth()]));
      var h = hipler[t]; if (h) b.title = h;
      b.addEventListener('click', function () { git(t); });
      seri.appendChild(b);
    });
    var akt = seri.querySelector('[aria-current]');
    if (akt && seri.scrollTo) seri.scrollTo({left: akt.offsetLeft - seri.clientWidth / 2 + akt.clientWidth / 2});
  }

  function basliklar(t) {
    if (yaziEl) yaziEl.textContent = uzun(t);
    if (hgunEl) hgunEl.textContent = hg(t) + (t === bugun ? ' · bugün' : '');
    if (inp) inp.value = t;
    if (ustTarih) ustTarih.textContent = t === sayfa ? bugunUst : uzun(t) + ', ' + hg(t);
  }

  function kilo(k) { var m = /^([\d,\.]+)\+([\d,\.]+)Fazla Kilo/i.exec(k || ''); return m ? m[1] + ' +' + m[2].replace('.', ',') : (k || ''); }
  function jk(x) { return (x || '').replace(/\s*AP\s*Apranti.*$/i, ' (AP)').replace(/\s*Apranti.*$/i, ' (AP)'); }
  function agf(a) { var m = /%(\d+)/.exec(a || ''); return m ? '%' + m[1] : ''; }
  var COK = /(6'LI|5'Lİ|4'LÜ|3'LÜ|7'Lİ) (GANYAN|PLASE)/;

  function medya(t, sid, no, hipAd) {
    if (!t || !sid || !no) return null;
    var kod = t.slice(2, 4) + t.slice(5, 7) + t.slice(8, 10) + String(sid) + String(no);
    var foto = 'https://foto-cdn.tjk.org/fotoftp/' + t.slice(0, 4) + '/' + kod + '.jpg';
    var mp4 = 'https://video-cdn.tjk.org/videoftp/' + t.slice(0, 4) + '/' + t.slice(5, 7) + '/' + kod + '.mp4';
    var w = el('div', 'sk-medya');
    var a = el('a', 'sk-ff'); a.href = foto; a.target = '_blank'; a.rel = 'noopener';
    var im = el('img'); im.loading = 'lazy'; im.decoding = 'async'; im.width = 1920; im.height = 1080; im.alt = hipAd + ' ' + no + '. koşu foto finiş'; im.src = foto;
    im.onerror = function () { if (w.parentNode) w.parentNode.removeChild(w); };
    a.appendChild(im); a.appendChild(el('span', '', 'Foto finiş')); w.appendChild(a);
    var d = el('details', 'sk-vid'); var sm = el('summary', '', '▶  Koşu videosunu izle'); d.appendChild(sm);
    d.addEventListener('toggle', function () { if (d.open && !d.querySelector('video')) { var v = el('video'); v.controls = true; v.preload = 'metadata'; v.playsInline = true; v.setAttribute('playsinline', ''); v.src = mp4 + '#t=3'; d.appendChild(v); } });
    w.appendChild(d); w.appendChild(el('small', '', 'Kaynak: TJK'));
    return w;
  }

  function kosuKart(k, hipAd, sid, t) {
    var art = el('article', 'sk');
    var bas = el('header', 'sk-bas');
    var no = el('div', 'sk-no'); no.appendChild(el('b', '', String(k.no))); no.appendChild(el('span', '', 'Koşu')); bas.appendChild(no);
    var bil = el('div', 'sk-bilgi');
    var cfg = (k.cfg || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var eid = ''; cfg = cfg.filter(function (x) { if (/^E\.İ\.D/.test(x)) { eid = x.replace(/\s*:\s*/, ' '); return false; } return true; });
    var msf = cfg.length ? cfg[cfg.length - 1] : '';
    bil.appendChild(el('p', 'sk-ust', [k.saat, cfg[0], msf].filter(Boolean).join(' · ')));
    var alt = cfg.slice(1, -1).join(', '); if (eid) alt = (alt ? alt + ' · ' : '') + eid;
    if (alt) bil.appendChild(el('p', 'sk-alt', alt));
    if (k.ozel) bil.appendChild(el('p', 'sk-ozel', k.ozel));
    bas.appendChild(bil);
    var g = (k.o || []).filter(function (o) { return o[0] === 'GANYAN'; })[0];
    if (g) { var gy = el('div', 'sk-gny'); gy.appendChild(el('span', '', 'Ganyan')); gy.appendChild(el('b', '', tl(g[2]))); bas.appendChild(gy); }
    art.appendChild(bas);

    var ol = el('ol', 'sk-liste');
    (k.a || []).forEach(function (a) {
      var li = el('li', 'sk-at' + (a[0] === '1' ? ' p1' : a[0] === '2' ? ' p2' : a[0] === '3' ? ' p3' : '') + (a[0] ? '' : ' kosmadi'));
      li.appendChild(el('span', 'sk-s', a[0] || '–'));
      li.appendChild(el('span', 'sk-atno', String(a[1] || '')));
      var ad = el('div', 'sk-ad');
      var nm = el('b', '', a[2]); if (a[3]) nm.appendChild(el('i', '', ' ' + a[3])); ad.appendChild(nm);
      ad.appendChild(el('small', '', [jk(a[7]), kilo(a[6]) ? kilo(a[6]) + ' kg' : '', a[9] ? 'Ant. ' + a[9] : ''].filter(Boolean).join(' · ')));
      li.appendChild(ad);
      var dr = el('div', 'sk-der'); dr.appendChild(el('b', '', a[10] || '')); if (a[14]) dr.appendChild(el('small', '', a[14])); li.appendChild(dr);
      var gy2 = el('div', 'sk-g'); gy2.appendChild(el('b', '', a[11] || '')); if (agf(a[12])) gy2.appendChild(el('small', '', 'AGF ' + agf(a[12]))); li.appendChild(gy2);
      ol.appendChild(li);
    });
    art.appendChild(ol);
    var md = medya(t, sid, k.no, hipAd); if (md) art.appendChild(md);

    var ayr = el('details', 'sk-ayr'); ayr.appendChild(el('summary', '', 'Ayrıntılar: orijin, sahip, start, HP'));
    var kay = el('div', 'tablo-kaydir'); var tb = el('table', 'tablo sk-tablo');
    var th = el('tr'); ['S', 'No', 'At', 'Yaş', 'Orijin (Baba - Anne)', 'Sıklet', 'Jokey', 'Sahip', 'Antrenör', 'Derece', 'Gny', 'AGF', 'St', 'Fark', 'G.Çık.', 'HP'].forEach(function (x) { th.appendChild(el('th', '', x)); });
    var thd = el('thead'); thd.appendChild(th); tb.appendChild(thd); var tbd = el('tbody');
    (k.a || []).forEach(function (a) { var tr = el('tr'); [a[0], a[1], a[2] + (a[3] ? ' ' + a[3] : ''), a[4], a[5], kilo(a[6]), jk(a[7]), a[8], a[9], a[10], a[11], agf(a[12]), a[13], a[14], a[15], a[16]].forEach(function (x) { tr.appendChild(el('td', '', x == null ? '' : String(x))); }); tbd.appendChild(tr); });
    tb.appendChild(tbd); kay.appendChild(tb); ayr.appendChild(kay); art.appendChild(ayr);

    var od = (k.o || []).filter(function (o) { return o[0] !== 'GANYAN' && o.length >= 3; });
    if (od.length) {
      var ow = el('div', 'sk-odeme');
      od.sort(function (x, y) { return (COK.test(y[0]) ? 1 : 0) - (COK.test(x[0]) ? 1 : 0); });
      od.forEach(function (o) {
        var c = el('div', 'sk-o' + (COK.test(o[0]) ? ' cok' : ''));
        c.appendChild(el('span', 'sk-o-ad', o[0])); c.appendChild(el('span', 'sk-o-k', o[1])); c.appendChild(el('b', 'sk-o-t', tl(o[2])));
        ow.appendChild(c);
      });
      art.appendChild(ow);
    }
    var notlar = (k.n || []).concat(k.e ? [k.e] : []);
    if (notlar.length) art.appendChild(el('p', 'sk-not', notlar.join(' · ')));
    return art;
  }

  function gunCiz(v, t) {
    icerik.innerHTML = '';
    var sar = el('div', 'st-arsiv');
    if (!v.h || !v.h.length) {
      sar.appendChild(el('p', 'st-bos', uzun(t) + ' günü yurt içinde yarış yok.'));
      icerik.appendChild(sar); return;
    }
    var cok = [];
    v.h.forEach(function (h) { (h.k || []).forEach(function (k) { (k.o || []).forEach(function (o) { if (/6'LI GANYAN/.test(o[0])) cok.push([h.ad, o[0].replace(/6'LI GANYAN/, 'altılı'), o[1], o[2]]); }); }); });
    if (cok.length) {
      var oz = el('section', 'st-ozet'); oz.appendChild(el('h2', '', 'Günün altılıları'));
      var ul = el('div', 'st-ozet-l');
      cok.forEach(function (c) { var x = el('div', 'st-ozet-k'); x.appendChild(el('span', '', c[0] + ' · ' + c[1])); x.appendChild(el('b', '', tl(c[3]))); x.appendChild(el('small', '', c[2])); ul.appendChild(x); });
      oz.appendChild(ul); sar.appendChild(oz);
    }
    if (analizli.indexOf(t) >= 0) {
      var an = el('p', 'st-analiz'); var aa = el('a', '', 'Bu günün koşu analizlerimiz: ilk 4, Y ve sürpriz →'); aa.href = '/gun/' + t + '/kosular/'; an.appendChild(aa); sar.appendChild(an);
    }
    var sek = el('div', 'st-hip'); sek.setAttribute('role', 'tablist'); sek.setAttribute('aria-label', 'Hipodromlar');
    var paneller = [];
    v.h.forEach(function (h, i) {
      var b = el('button', 'st-hip-b'); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = 'sth-' + i;
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.appendChild(el('b', '', h.ad)); b.appendChild(el('span', '', (h.k || []).length + ' koşu' + (h.yg ? ' · ' + h.yg : '')));
      var p = el('div', 'sk-izgara'); p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', b.id); if (i) p.hidden = true;
      (h.k || []).forEach(function (k) { p.appendChild(kosuKart(k, h.ad, h.sid, t)); });
      b.addEventListener('click', function () { sek.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', 'false'); }); b.setAttribute('aria-selected', 'true'); paneller.forEach(function (x) { x.hidden = x !== p; }); });
      sek.appendChild(b); paneller.push(p);
    });
    sar.appendChild(sek); paneller.forEach(function (p) { sar.appendChild(p); });
    var kay = el('p', 'not st-kaynak'); kay.appendChild(document.createTextNode('Kaynak: TJK resmi sonuçları. Tutarlar 1 misli içindir. '));
    var ta = el('a', '', 'Bu günü TJK sitesinde aç'); ta.href = tjk(t); ta.target = '_blank'; ta.rel = 'noopener'; kay.appendChild(ta); sar.appendChild(kay);
    icerik.appendChild(sar);
  }

  function git(t, gecmisYok) {
    if (!t) return;
    if (t > bugun) t = bugun;
    secili = t; basliklar(t); seriCiz();
    if (t !== sayfa && !anaSayfa && t >= canli) { location.href = t === bugun ? '/sonuclar/' : '/sonuclar/?t=' + t; return; }
    if (!gecmisYok && history.replaceState) { var u = t === sayfa ? location.pathname : location.pathname + '?t=' + t; history.replaceState(null, '', u); }
    if (t === sayfa && bugunHTML) { icerik.innerHTML = bugunHTML; durum.hidden = true; return; }
    durum.hidden = false; durum.textContent = uzun(t) + ' sonuçları yükleniyor…';
    var yukle = onbellek[t] ? Promise.resolve(onbellek[t]) : fetch('/veri/sonuc/' + t + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (v) {
      if (!v || !v.ct) return v;
      if (!window.tjkdCoz) throw new Error('uye');
      return window.tjkdCoz(v.seviye || 'uye', v.iv, v.ct).then(function (m) { if (m == null) throw new Error('uye'); return JSON.parse(m); });
    });
    yukle.then(function (v) {
      if (secili !== t) return;
      onbellek[t] = v; durum.hidden = true; gunCiz(v, t);
    }).catch(function (hata) {
      if (secili !== t) return;
      icerik.innerHTML = '';
      durum.hidden = false; durum.textContent = '';
      if (hata && hata.message === 'uye') { durum.appendChild(document.createTextNode('Geçmiş sonuçlar üyelerimize açık. ')); var u = el('a', '', 'Ücretsiz üye ol ya da giriş yap'); u.href = '/uye-ol/'; durum.appendChild(u); return; }
      durum.appendChild(document.createTextNode(uzun(t) + ' için arşivimizde sonuç yok. '));
      var a = el('a', '', 'TJK sitesinde aç'); a.href = tjk(t); a.target = '_blank'; a.rel = 'noopener'; durum.appendChild(a);
    });
  }

  function adim(yon) {
    var tum = gunler.slice(); if (tum.indexOf(bugun) < 0) tum.push(bugun);
    var i = tum.indexOf(secili);
    if (i < 0) { i = 0; while (i < tum.length && tum[i] < secili) i++; if (yon < 0) i--; else i = i - 1; }
    var h = tum[i + yon]; if (h) git(h);
  }
  bar.querySelectorAll('[data-st-git]').forEach(function (b) { b.addEventListener('click', function () { adim(Number(b.getAttribute('data-st-git'))); }); });
  var bb = bar.querySelector('[data-st-bugun]'); if (bb) bb.addEventListener('click', function () { if (!anaSayfa && sayfa !== bugun) { location.href = '/sonuclar/'; return; } git(bugun); });
  if (inp) {
    inp.addEventListener('change', function () { if (inp.value) git(inp.value); });
    var lab = bar.querySelector('.st-tarih');
    if (lab) lab.addEventListener('click', function (e) { if (inp.showPicker && e.target !== inp) { try { inp.showPicker(); } catch (x) {} } });
  }
  fetch('/veri/sonuc/gunler.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (l) {
    gunler = l.map(function (x) { hipler[x[0]] = x[1]; return x[0]; }).sort();
    if (gunler.length && inp) inp.min = gunler[0];
    if (inp) inp.max = bugun;
    seriCiz();
  }).catch(function () { seriCiz(); });
  var q = new URLSearchParams(location.search).get('t');
  if (q && /^\d{4}-\d\d-\d\d$/.test(q) && q !== sayfa) git(q, true); else { basliklar(sayfa); seriCiz(); }
})();

/* ---- Premium Plus: koşuya gelince sürpriz adayları penceresi ----
   PP_KISIT=false: üyelik açılana kadar herkese görünür. Üyelik açılınca true yapılır;
   o zaman yalnız <html class="uye-pp"> (uyelik.js, Premium Plus profil) olanlara içerik, diğerlerine tanıtım gösterilir. */
(function () {
  var PP_KISIT = false;
  var tpl = document.querySelectorAll('template[data-pp]');
  if (!tpl.length) document.querySelectorAll('[data-pp-ac]').forEach(function (b) { b.hidden = true; });
  /* Premium Plus içeriği açılmamış ziyaretçi: şifreli blok varsa tanıtım penceresi gösterilir */
  var tanit = [];
  document.querySelectorAll('article.kosu .kilit-gizli[data-kilit="plus"]').forEach(function (d) { var a = d.closest('article.kosu'); if (a && a.id && !a.querySelector('template[data-pp]')) tanit.push(a); });
  if ((!tpl.length && !tanit.length) || !('IntersectionObserver' in window)) return;
  var kutu = document.createElement('aside'); kutu.className = 'pp'; kutu.hidden = true; kutu.setAttribute('aria-live', 'polite');
  document.body.appendChild(kutu);
  var gosterilen = {}, aktif = null;
  function oku(k) { try { return sessionStorage.getItem(k); } catch (x) { return null; } }
  function yaz(k, v) { try { sessionStorage.setItem(k, v); } catch (x) {} }
  var kapandi = {};  /* bu sayfa açıkken kapatılan koşular; sayfa yenilenince pencere yine gelir */
  function kapat() { kutu.hidden = true; kutu.classList.remove('acik'); if (aktif) kapandi[aktif] = 1; aktif = null; }
  function goster(id, zorla) {
    if (!zorla && (aktif === id || kapandi[id] || oku('pp-hepsi'))) return;
    var t = document.querySelector('template[data-pp="' + id + '"]');
    var art = document.getElementById(id);
    if (!t && !(art && art.querySelector('.kilit-gizli[data-kilit="plus"]'))) return;
    kutu.innerHTML = '';
    if (!t) {
      var uye = document.documentElement.classList.contains('uye');
      var bas = art.querySelector('.kx-no'), hip = art.querySelector('.kx-hip'), sa = art.querySelector('.kx-saat');
      var d0 = document.createElement('div'); d0.className = 'pp-k pp-tanit';
      d0.innerHTML = '<div class="pp-ust"><span class="pp-rozet">★ Premium Plus</span><span class="pp-kosu"></span><button type="button" class="pp-kapat" data-pp-kapat aria-label="Kapat">×</button></div>' +
        '<p class="pp-bas">Bu koşu için sürpriz adaylarımız hazır.</p>' +
        '<p class="pp-not">Az sayıda yorumcunun öne çıkardığı atlar, kimin uyardığı ve kendi sürpriz listemiz Premium Plus üyelerde. Kazanma tahmini değildir.</p>' +
        (uye ? '<p class="pp-not"><a href="/premium/">Premium Plus\'ı incele →</a></p>'
             : '<p class="pp-tanit-alt"><a class="dugme" href="/uye-ol/" data-uyelik="kayit">Ücretsiz üye ol</a><span>Yeni üyelere 7 gün Premium + Premium Plus ücretsiz</span></p>');
      var pk = d0.querySelector('.pp-kosu'); if (pk) pk.textContent = [hip && hip.textContent, bas && bas.textContent].filter(Boolean).join(' ') + (sa ? ' · ' + sa.textContent : '');
      kutu.appendChild(d0);
    } else if (PP_KISIT && !document.documentElement.classList.contains('uye-pp')) {
      var d = document.createElement('div'); d.className = 'pp-k';
      d.innerHTML = '<div class="pp-ust"><span class="pp-rozet">★ Premium Plus</span><button type="button" class="pp-kapat" data-pp-kapat aria-label="Kapat">×</button></div><p class="pp-bas">Bu koşunun sürpriz adayları Premium Plus üyelere özel.</p><p class="pp-not"><a href="/premium/">Premium Plus\'ı incele →</a></p>';
      kutu.appendChild(d);
    } else kutu.appendChild(t.content.cloneNode(true));
    var dk = document.createElement('button'); dk.type = 'button'; dk.className = 'pp-sus'; dk.textContent = 'Bugün başka gösterme';
    dk.addEventListener('click', function () { yaz('pp-hepsi', '1'); kapat(); });
    var k = kutu.querySelector('.pp-k'); if (k) k.appendChild(dk);
    kutu.querySelectorAll('[data-pp-kapat]').forEach(function (b) { b.addEventListener('click', kapat); });
    aktif = id; kutu.hidden = false; requestAnimationFrame(function () { kutu.classList.add('acik'); });
  }
  var gorunen = {};  /* aynı anda iki koşu görünürse ekranda en çok yer kaplayanın penceresi açılır */
  function enIyi() { var b = null, h = -1; Object.keys(gorunen).forEach(function (k) { if (gorunen[k] > h) { h = gorunen[k]; b = k; } }); return b; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var id = e.target.id;
      if (e.isIntersecting) gorunen[id] = e.intersectionRect.height; else delete gorunen[id];
      if (e.isIntersecting && (e.intersectionRatio >= 0.35 || e.intersectionRect.height >= innerHeight * 0.45)) {
        clearTimeout(gosterilen[id]);
        gosterilen[id] = setTimeout(function () { if (enIyi() === id) goster(id); }, 700);
      } else { clearTimeout(gosterilen[id]); if (aktif === id && !e.isIntersecting) { kutu.hidden = true; kutu.classList.remove('acik'); aktif = null; } }
    });
  }, {threshold: [0, 0.1, 0.2, 0.3, 0.35, 0.5, 0.7]});
  tpl.forEach(function (t) { var a = document.getElementById(t.getAttribute('data-pp')); if (a && a.getAttribute('data-bitti') !== '1') io.observe(a); });
  tanit.forEach(function (a) { if (a.getAttribute('data-bitti') !== '1') io.observe(a); });
  document.querySelectorAll('[data-pp-ac]').forEach(function (b) { if (!document.querySelector('template[data-pp="' + b.getAttribute('data-pp-ac') + '"]')) { b.hidden = true; return; } b.addEventListener('click', function () { aktif = null; goster(b.getAttribute('data-pp-ac'), true); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !kutu.hidden) kapat(); });
})();

/* ---- Premium Plus sayfası: üyelik açılınca KISIT=true (yalnız <html class="uye-pp"> görür) ---- */
(function () {
  var KISIT = false;
  var s = document.querySelector('[data-pp-sayfa]'); if (!s) return;
  if (KISIT && !document.documentElement.classList.contains('uye-pp')) { s.hidden = true; var k = document.querySelector('[data-pp-kilit]'); if (k) k.hidden = false; }
})();

}
(function () {
  function calis() { if (window.__tjkdBasladi) return; window.__tjkdBasladi = true; tjkdBaslat(); }
  if (document.querySelector('.kilit[data-kilit]') && !window.__tjkdAcildi) { document.addEventListener('tjkd-acildi', calis, {once: true}); setTimeout(calis, 15000); }
  else calis();
})();

/* ---- Koşu kartlarında başlama saatine canlı geri sayım (saniyelik) ---- */
(function () {
  var gun = document.body.getAttribute('data-gun');
  var kartlar = [].slice.call(document.querySelectorAll('article.kx[data-bas]'));
  if (!gun || !kartlar.length) return;
  function iki(n) { return (n < 10 ? '0' : '') + n; }
  function yazi(s) {
    var sa = Math.floor(s / 3600), dk = Math.floor((s % 3600) / 60), sn = s % 60;
    return (sa ? sa + ' sa ' + iki(dk) + ' dk ' : dk + ' dk ') + iki(sn) + ' sn';
  }
  var L = [];
  kartlar.forEach(function (k) {
    var t = Date.parse(gun + 'T' + k.getAttribute('data-bas') + ':00+03:00'); if (isNaN(t)) return;
    var ust = k.querySelector('.kx-ust'), saat = k.querySelector('.kx-saat'); if (!ust) return;
    var el = document.createElement('span'); el.className = 'kx-geri'; el.setAttribute('role', 'timer');
    if (saat && saat.nextSibling) ust.insertBefore(el, saat.nextSibling); else ust.appendChild(el);
    L.push({k: k, t: t, el: el});
  });
  var sira = document.querySelector('.siradaki');
  var sg = null, SK = sira && sira.classList.contains('sra') ? sira : null;
  if (sira && !SK) { sg = document.createElement('b'); sg.className = 'siradaki-geri'; sira.appendChild(sg); }
  function skYaz(now) {
    if (!SK) return;
    var id = SK.getAttribute('data-hedef'); if (!id) return;
    var o = null; L.forEach(function (x) { if (x.k.id === id) o = x; }); if (!o) return;
    var s = Math.round((o.t - now) / 1000), d = SK.querySelector('.sra-durum');
    SK.classList.remove('yakin', 'cok-yakin', 'basladi');
    if (s > 0) {
      var sa = Math.floor(s / 3600), dk = Math.floor((s % 3600) / 60), sn = s % 60;
      SK.querySelector('.sra-sa').hidden = !sa;
      SK.querySelector('.sra-sa b').textContent = sa;
      SK.querySelector('.sra-dk').textContent = iki(dk);
      SK.querySelector('.sra-sn').textContent = iki(sn);
      d.textContent = 'Başlamasına kalan süre';
      if (s <= 120) SK.classList.add('cok-yakin'); else if (s <= 600) SK.classList.add('yakin');
    } else {
      SK.classList.add('basladi');
      d.textContent = 'Start verildi · sonuç bekleniyor';
    }
  }
  document.addEventListener('tjkd-sra', function () { skYaz(Date.now()); });
  function tik() {
    var now = Date.now(), ilk = null;
    L.forEach(function (o) {
      var bitti = o.k.getAttribute('data-bitti') === '1', s = Math.round((o.t - now) / 1000);
      o.el.classList.remove('yakin', 'cok-yakin', 'basladi');
      if (bitti) { o.el.textContent = 'Koşu bitti'; o.el.classList.add('bitti'); return; }
      if (s > 0) {
        o.el.textContent = 'Başlamasına ' + yazi(s);
        if (s <= 120) o.el.classList.add('cok-yakin'); else if (s <= 600) o.el.classList.add('yakin');
        if (!ilk || o.t < ilk.t) ilk = o;
      } else if (s > -1800) { o.el.textContent = 'Start saati geldi · sonuç bekleniyor'; o.el.classList.add('basladi'); }
      else { o.el.textContent = 'Sonuç bekleniyor'; o.el.classList.add('basladi'); }
    });
    if (sg) sg.textContent = ilk ? ' · ' + yazi(Math.round((ilk.t - now) / 1000)) + ' kaldı' : '';
    skYaz(now);
  }
  tik(); setInterval(tik, 1000);
})();

/* Canlı güncelleme: yeni sonuç ya da son dakika kuponu yayınlanınca "Yeni sonuç geldi · Yenile" şeridi */
(function () {
  var gun = document.body && document.body.getAttribute('data-gun');
  var bugun = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  if (!gun || gun !== bugun) return;
  var ilk = null, serit = null;
  function sor() {
    if (document.hidden) return;
    fetch('/veri/surum.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.h) return;
        if (ilk === null) { ilk = d.h; return; }
        if (d.h !== ilk && !serit) goster(d.t);
      })
      .catch(function () {});
  }
  function goster(t) {
    serit = document.createElement('div');
    serit.className = 'canli-serit';
    serit.setAttribute('role', 'status');
    serit.innerHTML = '<span><b>Yeni sonuç geldi</b>' + (t ? ' · ' + t : '') + '</span><button type="button">Yenile</button>';
    serit.querySelector('button').addEventListener('click', function () { location.reload(); });
    document.body.appendChild(serit);
  }
  sor();
  setInterval(sor, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) sor(); });
})();

/* Karşılama: çok kısa at kişnemesi (/assets/kisneme.mp3, 1 sn).
   Tarayıcılar sesi kullanıcı dokunmadan çalmaz; ziyaretçinin ilk tıklamasında/dokunuşunda bir kez çalar.
   Aynı ziyaretçiye 7 günde bir. Kapatmak: localStorage 'tjkd-kisneme' = 'kapali'. */
(function () {
  var A = 'tjkd-kisneme3';
  try { var _ist = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Istanbul'}).format(new Date()); if (_ist.slice(5) === '11-10') return; } catch (e) {}
  try {
    var v = localStorage.getItem(A);
    if (v === 'kapali') return;
    if (v && Date.now() - (+v) < 7 * 864e5) return;
  } catch (e) {}
  var ses = new Audio('/assets/kisneme.mp3?v=2');
  ses.preload = 'auto'; ses.volume = 0.7;
  var olaylar = ['click', 'touchend', 'keydown'];
  function kaldir() { olaylar.forEach(function (t) { document.removeEventListener(t, kisne, true); }); }
  function kisne() {
    var p;
    try { p = ses.play(); } catch (e) { return; }
    var tamam = function () { kaldir(); try { localStorage.setItem(A, String(Date.now())); } catch (e) {} };
    if (p && p.then) p.then(tamam, function () {}); else tamam();
  }
  olaylar.forEach(function (t) { document.addEventListener(t, kisne, true); });
})();


/* 10 Kasım anma ekranı: yalnız 10 Kasım (İstanbul saati), her ziyaretçiye bir kez. */
(function () {
  var gun; try { gun = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Istanbul'}).format(new Date()); } catch (e) { return; }
  if (gun.slice(5) !== '11-10') return;
  var A = 'tjkd-10kasim-' + gun.slice(0, 4);
  try { if (localStorage.getItem(A)) return; } catch (e) {}
  if (/\/admin\//.test(location.pathname)) return;
  var yil = +gun.slice(0, 4) - 1938;
  function ac() {
    var o = document.createElement('div');
    o.className = 'ak-splash'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'ak-b');
    o.innerHTML = '<div class="ak-ic">' +
      '<img class="ak-gorsel" src="/assets/ataturk-10-kasim.jpg?v=1" width="596" height="800" alt="Gazi Mustafa Kemal Atatürk, imzası ve 1881–1938">' +
      '<p class="ak-tarih">10 Kasım 1938 · 09.05</p>' +
      '<h2 id="ak-b" class="gizli">Gazi Mustafa Kemal Atatürk</h2>' +
      '<p class="ak-metin">Cumhuriyetimizin kurucusu, Ulu Önder Gazi Mustafa Kemal Atatürk\'ü aramızdan ayrılışının ' + yil + '. yıl dönümünde saygı, sevgi, minnet ve özlemle anıyoruz.</p>' +
      '<p class="ak-soz">“Benim naçiz vücudum elbet bir gün toprak olacaktır, fakat Türkiye Cumhuriyeti ilelebet payidar kalacaktır.”</p>' +
      '<div class="ak-alt"><span class="ak-logo"></span><button type="button" class="ak-kapat">Siteye devam et</button></div></div>';
    var m = document.querySelector('.marka'); var lg = o.querySelector('.ak-logo');
    if (m) { var c = m.cloneNode(true); c.removeAttribute('href'); c.removeAttribute('aria-label'); var sp = document.createElement('span'); sp.className = 'marka ak-marka'; sp.innerHTML = c.innerHTML; lg.appendChild(sp); } else lg.textContent = 'tjkdetay';
    function kapat() { try { localStorage.setItem(A, '1'); } catch (e) {} o.classList.add('kapan'); document.documentElement.classList.remove('ak-acik'); setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 450); document.removeEventListener('keydown', tus); }
    function tus(e) { if (e.key === 'Escape') kapat(); }
    o.querySelector('.ak-kapat').addEventListener('click', kapat);
    o.addEventListener('click', function (e) { if (e.target === o) kapat(); });
    document.addEventListener('keydown', tus);
    document.body.appendChild(o); document.documentElement.classList.add('ak-acik');
    setTimeout(function () { try { o.querySelector('.ak-kapat').focus({preventScroll: true}); } catch (e) {} }, 60);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ac); else ac();
})();
