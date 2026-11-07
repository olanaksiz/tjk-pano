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
  var sec = null;
  kosular.forEach(function (k) {
    if (k.getAttribute('data-bitti') === '1') return;
    var t = k.getAttribute('data-bas').split(':');
    var dk = Number(t[0]) * 60 + Number(t[1]);
    if (dk + 3 >= simdi && (!sec || dk < sec.dk)) sec = {el: k, dk: dk};
  });
  if (!sec) return;
  sec.el.classList.add('sirada');
  var kutu = document.querySelector('.siradaki');
  if (kutu) {
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
