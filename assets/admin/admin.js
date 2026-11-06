// TJK Detay — admin paneli çekirdeği: sol menü, yönlendirme, modül kaydı, ortak veri ve arayüz yardımcıları.
// Yeni sekme eklemek için assets/admin/moduller/ klasörüne bir dosya koyup TJKDAdmin.modul({...}) çağırmak yeterli.
(function () {
  'use strict';
  var T = window.TJKD;
  var $ = function (s, k) { return (k || document).querySelector(s); };
  var MODULLER = [];
  var GRUPLAR = ['Genel', 'Üyelik', 'Satış', 'Ayarlar'];
  var SABIT = {genel: 1, moduller: 1};
  var cache = {};

  function el(ad, sinif, metin) { var x = document.createElement(ad); if (sinif) x.className = sinif; if (metin != null) x.textContent = metin; return x; }
  function tarih(t, kisa) {
    if (!t) return '—';
    try { return new Date(t).toLocaleString('tr-TR', kisa ? {day: '2-digit', month: '2-digit', year: 'numeric'} : {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}); } catch (e) { return String(t); }
  }
  function tl(kurus) { return T.tl(kurus || 0); }
  function veri(ad, yol, yenile) {
    if (!yenile && cache[ad]) return cache[ad];
    cache[ad] = T.rest(yol).catch(function (e) { delete cache[ad]; throw e; });
    return cache[ad];
  }

  var A = window.TJKDAdmin = {
    modul: function (m) { if (m && m.id && typeof m.ciz === 'function') MODULLER.push(m); },
    el: el, tarih: tarih, tl: tl,
    OLAY_AD: {kayit: 'Üye oldu', giris: 'Giriş yaptı', kupon_tikladi: 'Hazır kuponlara tıkladı', premium_sayfasi: 'Premium sayfasını gördü', odemeye_gecti: 'Ödemeye geçti', odeme_tamam: 'Ödemeyi tamamladı'},
    DURUM_AD: {bekliyor: 'Bekliyor', odendi: 'Ödendi', basarisiz: 'Başarısız', iptal: 'İptal'},
    premiumMu: function (p) { return T.premiumMu(p); },
    api: {
      uyeler: function (y) { return veri('uyeler', 'profiller?select=*&order=created_at.desc&limit=10000', y); },
      olaylar: function (y) { return veri('olaylar', 'olaylar?select=id,user_id,tur,plan,sayfa,created_at&order=created_at.desc&limit=10000', y); },
      siparisler: function (y) { return veri('siparisler', 'siparisler?select=*&order=created_at.desc&limit=10000', y).catch(function () { return []; }); },
      ayarlar: function (y) {
        return veri('ayarlar', 'ayarlar?select=anahtar,deger,herkese_acik,updated_at', y).then(function (r) { var m = {}; (r || []).forEach(function (x) { m[x.anahtar] = x.deger; }); return m; });
      },
      ayarKaydet: function (anahtar, deger, herkese) {
        return T.rest('ayarlar?on_conflict=anahtar', {method: 'POST', body: {anahtar: anahtar, deger: deger, herkese_acik: !!herkese}, prefer: 'resolution=merge-duplicates,return=minimal'})
          .then(function () { delete cache.ayarlar; });
      },
      rpc: function (ad, govde) { return T.rest('rpc/' + ad, {method: 'POST', body: govde || {}}); },
      fn: function (ad, govde) { return T.fn(ad, govde); },
      temizle: function () { cache = {}; }
    },
    uyeAdi: function (u) { return u ? ((u.ad_soyad || '') + (u.eposta ? (u.ad_soyad ? ' · ' : '') + u.eposta : '')) || '—' : '—'; },
    bildir: function (metin, tur) {
      var k = $('[data-ad-bildirim]'); if (!k) return;
      var d = el('div', 'ad-tost ' + (tur || 'bilgi'), metin); k.appendChild(d);
      setTimeout(function () { d.classList.add('git'); setTimeout(function () { d.remove(); }, 400); }, 3200);
    },
    hata: function (e) { return T.hataYazi(e); },
    kpi: function (alan, liste) {
      var k = el('div', 'ad-kpiler');
      liste.forEach(function (x) { var d = el('div', 'ad-kpi' + (x[2] ? ' ' + x[2] : '')); d.appendChild(el('b', '', String(x[1]))); d.appendChild(el('span', '', x[0])); k.appendChild(d); });
      alan.appendChild(k); return k;
    },
    kutu: function (alan, baslik, ek) {
      var s = el('section', 'ad-kutu'); var u = el('div', 'ad-kutu-ust'); u.appendChild(el('h2', '', baslik)); if (ek) u.appendChild(ek); s.appendChild(u); alan.appendChild(s); return s;
    },
    rozet: function (metin, tur) { return el('span', 'ad-rozet ' + (tur || ''), metin); },
    // kolonlar: [{ad, deger(row)->string|Node, sinif}]
    tablo: function (alan, kolonlar, satirlar, bos) {
      var sar = el('div', 'ad-tablo-sar'); var t = el('table', 'ad-tablo'); var th = el('thead'); var tr = el('tr');
      kolonlar.forEach(function (k) { tr.appendChild(el('th', k.sinif || '', k.ad)); }); th.appendChild(tr); t.appendChild(th);
      var tb = el('tbody');
      if (!satirlar.length) { var r = el('tr'); var td = el('td', 'ad-bos', bos || 'Kayıt yok.'); td.colSpan = kolonlar.length; r.appendChild(td); tb.appendChild(r); }
      satirlar.forEach(function (s) {
        var r = el('tr'); if (s.__sinif) r.className = s.__sinif;
        kolonlar.forEach(function (k) { var td = el('td', k.sinif || ''); var v = k.deger(s); if (v instanceof Node) td.appendChild(v); else td.textContent = v == null ? '' : String(v); if (k.baslik) td.setAttribute('data-l', k.ad); r.appendChild(td); });
        tb.appendChild(r);
      });
      t.appendChild(tb); sar.appendChild(t); alan.appendChild(sar); return t;
    },
    csv: function (ad, satirlar) {
      var csv = '﻿' + satirlar.map(function (r) { return r.map(function (v) { v = v == null ? '' : String(v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\n');
      var a = document.createElement('a'); a.href = window.URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'})); a.download = ad + '-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
    },
    git: function (id) { location.hash = '#' + id; }
  };

  // ---------- kabuk ----------
  var kapali = {};
  function aktifModuller() { return MODULLER.filter(function (m) { return SABIT[m.id] || !kapali[m.id]; }); }
  A.tumModuller = function () { return MODULLER.slice(); };

  function menuCiz() {
    var nav = $('[data-ad-menu]'); nav.textContent = '';
    var mods = aktifModuller().sort(function (a, b) { return (a.sira || 50) - (b.sira || 50); });
    GRUPLAR.concat(mods.map(function (m) { return m.grup; })).filter(function (g, i, d) { return g && d.indexOf(g) === i; }).forEach(function (g) {
      var L = mods.filter(function (m) { return (m.grup || 'Genel') === g; }); if (!L.length) return;
      nav.appendChild(el('p', 'ad-grup', g));
      L.forEach(function (m) {
        var a = el('a', 'ad-oge'); a.href = '#' + m.id; a.setAttribute('data-mod', m.id);
        var i = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); i.setAttribute('viewBox', '0 0 24 24'); i.setAttribute('aria-hidden', 'true'); i.innerHTML = m.ikon || '<circle cx="12" cy="12" r="4"/>';
        a.appendChild(i); a.appendChild(el('span', '', m.ad));
        if (m.rozet) { var rz = el('em', 'ad-say'); rz.hidden = true; a.appendChild(rz); Promise.resolve().then(function () { return m.rozet(A); }).then(function (n) { if (n) { rz.textContent = n; rz.hidden = false; } }).catch(function () {}); }
        nav.appendChild(a);
      });
    });
  }

  var simdiki = null;
  function goster() {
    var id = (location.hash || '').replace(/^#/, '') || 'genel';
    var mods = aktifModuller(); var m = mods.filter(function (x) { return x.id === id; })[0] || mods.filter(function (x) { return x.id === 'genel'; })[0] || mods[0];
    if (!m) return;
    simdiki = m;
    document.querySelectorAll('[data-mod]').forEach(function (a) { a.classList.toggle('aktif', a.getAttribute('data-mod') === m.id); if (a.getAttribute('data-mod') === m.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('[data-ad-baslik]').textContent = m.ad;
    document.title = m.ad + ' · Yönetim · TJK Detay';
    var alan = $('[data-ad-icerik]'); alan.textContent = ''; alan.appendChild(el('p', 'ad-yukleniyor', 'Yükleniyor…'));
    $('.ad-kabuk').classList.remove('menu-acik');
    var hedef = el('div', 'ad-modul ad-modul-' + m.id);
    Promise.resolve().then(function () { return m.ciz(hedef, A); }).then(function () {
      if (simdiki !== m) return; alan.textContent = ''; alan.appendChild(hedef);
    }).catch(function (e) {
      if (simdiki !== m) return; alan.textContent = ''; var k = el('div', 'ad-hata'); k.appendChild(el('b', '', 'Bu bölüm yüklenemedi.')); k.appendChild(el('p', '', A.hata(e))); alan.appendChild(k);
    });
  }
  A.yenile = function () { A.api.temizle(); menuCiz(); goster(); };

  function giris(durumMetni) {
    var g = $('[data-ad-giris]'); g.hidden = false;
    $('[data-ad-durum]').textContent = durumMetni || '';
    var gi = $('[data-form=giris] [name=eposta]', g);
    if (gi && !gi.getAttribute('data-ad')) {
      gi.setAttribute('data-ad', '1'); gi.type = 'text'; gi.setAttribute('autocomplete', 'username'); gi.setAttribute('autocapitalize', 'none'); gi.setAttribute('spellcheck', 'false'); gi.placeholder = 'admin';
      var lb = gi.parentNode; if (lb && lb.firstChild && lb.firstChild.nodeType === 3) lb.firstChild.nodeValue = 'Kullanıcı adı';
      T.formlariBagla(g); T.sekme('giris', g);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!T) return;
    if (!T.hazir) { giris('Üyelik altyapısı bağlı değil.'); return; }
    T.oturum().then(function (s) {
      if (!s) return giris('Yönetici hesabınla giriş yap.');
      return T.rest('adminler?select=user_id').then(function (a) {
        if (!a || !a.length) return giris('Bu hesap yönetici değil. Yönetici hesabıyla giriş yap.');
        return A.api.ayarlar().catch(function () { return {}; }).then(function (ay) {
          ((ay.admin_moduller || {}).kapali || []).forEach(function (id) { kapali[id] = 1; });
          $('[data-ad-kabuk]').hidden = false;
          T.profil().then(function (p) { $('[data-ad-kim]').textContent = (p && (p.ad_soyad || p.eposta)) || ''; });
          menuCiz(); goster();
          window.addEventListener('hashchange', goster);
        });
      });
    }).catch(function (e) { giris(T.hataYazi(e)); });
    $('[data-ad-cikis]').addEventListener('click', function () { T.cikis(); });
    $('[data-ad-yenile]').addEventListener('click', function () { A.yenile(); A.bildir('Veriler yenilendi.'); });
    $('[data-ad-menu-ac]').addEventListener('click', function () { $('.ad-kabuk').classList.toggle('menu-acik'); });
    $('[data-ad-perde]').addEventListener('click', function () { $('.ad-kabuk').classList.remove('menu-acik'); });
  });
  A.kapaliMi = function (id) { return !!kapali[id]; };
  A.kapaliAyarla = function (id, k) { if (k) kapali[id] = 1; else delete kapali[id]; };
  A.menuCiz = menuCiz;
})();
