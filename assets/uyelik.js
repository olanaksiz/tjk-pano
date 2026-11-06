// TJK Detay — üyelik, premium ve admin paneli (Supabase Auth + REST; dış kütüphane yok)
(function () {
  'use strict';
  var AYAR = window.TJKD_UYELIK || {};
  var URL = String(AYAR.url || '').replace(/\/+$/, '');
  var KEY = String(AYAR.anon || '');
  var HAZIR = /^https:\/\/.+/.test(URL) && KEY.length > 20;
  var SK = 'tjkd-oturum';
  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };

  // ---------- oturum ----------
  function oku() { try { return JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) { return null; } }
  function yaz(s) { try { if (s) localStorage.setItem(SK, JSON.stringify(s)); else localStorage.removeItem(SK); } catch (e) {} }

  function istek(yol, o) {
    o = o || {};
    var h = {'apikey': KEY, 'Content-Type': 'application/json'};
    if (o.token) h.Authorization = 'Bearer ' + o.token;
    if (o.prefer) h.Prefer = o.prefer;
    return fetch(URL + yol, {method: o.method || 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined})
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null;
          try { j = t ? JSON.parse(t) : null; } catch (e) {}
          if (!r.ok) {
            var err = new Error((j && (j.msg || j.message || j.error_description || j.error)) || ('HTTP ' + r.status));
            err.kod = j && (j.error_code || j.code || j.error); err.durum = r.status;
            throw err;
          }
          return j;
        });
      });
  }

  function oturumKaydet(j) {
    if (!j || !j.access_token) return null;
    var eski = oku() || {};
    var s = {at: j.access_token, rt: j.refresh_token || eski.rt, exp: Math.floor(Date.now() / 1000) + (Number(j.expires_in) || 3600), user: j.user || eski.user || null};
    yaz(s);
    return s;
  }

  function oturum() {
    if (!HAZIR) return Promise.resolve(null);
    var s = oku();
    if (!s || !s.at) return Promise.resolve(null);
    if (s.exp - 60 > Date.now() / 1000) return Promise.resolve(s);
    if (!s.rt) { yaz(null); return Promise.resolve(null); }
    return istek('/auth/v1/token?grant_type=refresh_token', {method: 'POST', body: {refresh_token: s.rt}})
      .then(oturumKaydet).catch(function () { yaz(null); return null; });
  }

  function rest(yol, o) {
    return oturum().then(function (s) {
      o = o || {};
      o.token = s ? s.at : null;
      return istek('/rest/v1/' + yol, o);
    });
  }

  function olay(tur, ek) {
    return oturum().then(function (s) {
      if (!s) return null;
      var b = {tur: tur, sayfa: location.pathname.slice(0, 60)};
      if (ek && ek.plan) b.plan = String(ek.plan).slice(0, 40);
      return istek('/rest/v1/olaylar', {method: 'POST', token: s.at, body: b, prefer: 'return=minimal'}).catch(function () { return null; });
    });
  }

  var profilSoz = null;
  function profil(yenile) {
    if (profilSoz && !yenile) return profilSoz;
    profilSoz = oturum().then(function (s) {
      if (!s || !s.user) return null;
      return istek('/rest/v1/profiller?select=*&id=eq.' + encodeURIComponent(s.user.id), {token: s.at})
        .then(function (r) { return (r && r[0]) || {id: s.user.id, eposta: s.user.email}; })
        .catch(function () { return {id: s.user.id, eposta: s.user.email}; });
    });
    return profilSoz;
  }
  function premiumMu(p) { return !!(p && p.premium && (!p.premium_bitis || new Date(p.premium_bitis) > new Date())); }

  // ---------- Türkçe hata iletileri ----------
  function hataYazi(e) {
    var k = String((e && e.kod) || ''), m = String((e && e.message) || '');
    if (k === 'invalid_credentials' || /invalid login/i.test(m)) return 'E-posta ya da şifre hatalı.';
    if (k === 'user_already_exists' || /already registered/i.test(m)) return 'Bu e-postayla zaten üyelik var. "Giriş yap" sekmesini dene.';
    if (k === 'email_not_confirmed' || /not confirmed/i.test(m)) return 'E-postanı henüz doğrulamadın. Gelen kutundaki (ve gereksiz klasöründeki) bağlantıya tıkla.';
    if (k === 'weak_password' || /password/i.test(m) && /least|weak|short/i.test(m)) return 'Şifre çok zayıf. En az 8 karakter, harf ve rakam kullan.';
    if (/rate limit|too many/i.test(m) || k.indexOf('rate_limit') >= 0 || (e && e.durum === 429)) return 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.';
    if (k === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(m)) return 'E-posta adresi geçerli görünmüyor.';
    if (e && e.durum === 0 || /Failed to fetch|NetworkError/i.test(m)) return 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.';
    return 'Bir sorun oluştu: ' + m;
  }

  // ---------- e-posta bağlantısından dönüş (doğrulama / şifre sıfırlama) ----------
  function hashIsle() {
    if (!HAZIR || !location.hash || location.hash.length < 10) return Promise.resolve(null);
    var q = {};
    location.hash.slice(1).split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) q[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); });
    if (!q.access_token && !q.error) return Promise.resolve(null);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (q.error) return Promise.resolve({hata: q.error_code === 'otp_expired' ? 'Bağlantının süresi dolmuş. Yeniden giriş yapmayı ya da şifre sıfırlamayı dene.' : (q.error_description || 'Bağlantı geçersiz.')});
    return istek('/auth/v1/user', {token: q.access_token}).then(function (u) {
      oturumKaydet({access_token: q.access_token, refresh_token: q.refresh_token, expires_in: q.expires_in, user: u});
      return {tur: q.type || 'giris'};
    }).catch(function (e) { return {hata: hataYazi(e)}; });
  }

  // ---------- pencere ve formlar ----------
  var pencere = $('#uyelik-pencere');
  var sonNeden = '';
  function sekme(ad, kapsam) {
    kapsam = kapsam || document;
    $$('.uy-sekmeler [data-sekme]', kapsam).forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-sekme') === ad ? 'true' : 'false'); });
    $$('.uy-form', kapsam).forEach(function (f) { f.hidden = f.getAttribute('data-form') !== ad; });
    var t = $('.uy-sekmeler', kapsam); if (t) t.hidden = (ad === 'yeni-sifre');
  }
  function ac(ad, neden) {
    sonNeden = neden || '';
    if (!pencere) { location.href = '/uye-ol/' + (neden ? '?neden=' + encodeURIComponent(neden) : '') + (ad === 'giris' ? '#giris' : ''); return; }
    var n = $('.uy-neden', pencere);
    if (n) { n.textContent = neden === 'kupon' ? 'Hazır kuponlar üyelerimize açılacak. Ücretsiz üye ol, yayına girdiğinde ilk sen gör.' : (neden === 'premium' ? 'Premium üyelik için önce ücretsiz üye ol ya da giriş yap.' : ''); n.hidden = !n.textContent; }
    sekme(ad || 'kayit', pencere);
    if (typeof pencere.showModal === 'function') { if (!pencere.open) pencere.showModal(); } else pencere.setAttribute('open', '');
    var ilk = $('.uy-form:not([hidden]) input', pencere); if (ilk) setTimeout(function () { ilk.focus(); }, 30);
  }
  function kapat() { if (pencere && pencere.open) { if (typeof pencere.close === 'function') pencere.close(); else pencere.removeAttribute('open'); } }
  if (pencere) pencere.addEventListener('click', function (e) { if (e.target === pencere) kapat(); });

  function mesaj(f, t, tur) { var m = $('.uy-mesaj', f); if (m) { m.textContent = t || ''; m.className = 'uy-mesaj' + (tur ? ' ' + tur : ''); } }
  function kilitle(f, k) { $$('button, input', f).forEach(function (x) { x.disabled = k; }); }

  function formlariBagla(kapsam) {
    $$('.uy-sekmeler [data-sekme]', kapsam).forEach(function (b) { b.addEventListener('click', function () { sekme(b.getAttribute('data-sekme'), kapsam); }); });
    if (!HAZIR) {
      $$('[data-kurulum]', kapsam).forEach(function (x) { x.hidden = false; });
      $$('.uy-form button[type=submit]', kapsam).forEach(function (b) { b.disabled = true; });
    }
    var fk = $('[data-form=kayit]', kapsam);
    if (fk) fk.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(fk), ad = String(d.get('ad_soyad') || '').trim(), ep = String(d.get('eposta') || '').trim(), tel = String(d.get('telefon') || '').replace(/[^\d+]/g, ''), sf = String(d.get('sifre') || '');
      if (ad.length < 3) return mesaj(fk, 'Adını ve soyadını yaz.', 'hata');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ep)) return mesaj(fk, 'Geçerli bir e-posta adresi yaz.', 'hata');
      if (tel && !/^(\+?90)?0?5\d{9}$/.test(tel)) return mesaj(fk, 'Telefonu 05xx xxx xx xx biçiminde yaz ya da boş bırak.', 'hata');
      if (sf.length < 8) return mesaj(fk, 'Şifre en az 8 karakter olmalı.', 'hata');
      if (!d.get('kvkk') || !d.get('sartlar')) return mesaj(fk, 'Devam etmek için aydınlatma metnini okuduğunu ve kullanım şartlarını kabul ettiğini işaretle.', 'hata');
      kilitle(fk, true); mesaj(fk, 'Kaydın oluşturuluyor…');
      var neden = (new URLSearchParams(location.search)).get('neden') || sonNeden || 'site';
      istek('/auth/v1/signup?redirect_to=' + encodeURIComponent(location.origin + '/premium/'), {method: 'POST', body: {email: ep, password: sf, data: {
        ad_soyad: ad, telefon: tel, kvkk_onay: true, sartlar_onay: true, ileti_onay: !!d.get('ileti'), kaynak: neden}}})
        .then(function (j) {
          if (j && j.access_token) { oturumKaydet(j); mesaj(fk, 'Üyeliğin açıldı, hoş geldin!', 'tamam'); setTimeout(function () { location.href = '/premium/'; }, 700); }
          else { fk.reset(); mesaj(fk, 'Neredeyse tamam: ' + ep + ' adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıklayınca üyeliğin açılır.', 'tamam'); }
        })
        .catch(function (err) { mesaj(fk, hataYazi(err), 'hata'); })
        .then(function () { kilitle(fk, false); });
    });
    var fg = $('[data-form=giris]', kapsam);
    if (fg) fg.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(fg);
      kilitle(fg, true); mesaj(fg, 'Giriş yapılıyor…');
      istek('/auth/v1/token?grant_type=password', {method: 'POST', body: {email: String(d.get('eposta') || '').trim(), password: String(d.get('sifre') || '')}})
        .then(function (j) { oturumKaydet(j); profilSoz = null; olay('giris'); mesaj(fg, 'Giriş yapıldı.', 'tamam'); setTimeout(function () { kapat(); if (location.pathname.indexOf('/uye-ol') === 0) location.href = '/premium/'; else location.reload(); }, 400); })
        .catch(function (err) { mesaj(fg, hataYazi(err), 'hata'); })
        .then(function () { kilitle(fg, false); });
    });
    var su = $('[data-sifre-unuttum]', kapsam);
    if (su) su.addEventListener('click', function () {
      var ep = String(new FormData(fg).get('eposta') || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ep)) return mesaj(fg, 'Önce e-posta adresini yaz, sonra "Şifremi unuttum"a bas.', 'hata');
      istek('/auth/v1/recover?redirect_to=' + encodeURIComponent(location.origin + '/uye-ol/'), {method: 'POST', body: {email: ep}})
        .then(function () { mesaj(fg, ep + ' adresine şifre yenileme bağlantısı gönderdik.', 'tamam'); })
        .catch(function (err) { mesaj(fg, hataYazi(err), 'hata'); });
    });
    var fy = $('[data-form="yeni-sifre"]', kapsam);
    if (fy) fy.addEventListener('submit', function (e) {
      e.preventDefault();
      var sf = String(new FormData(fy).get('sifre') || '');
      if (sf.length < 8) return mesaj(fy, 'Şifre en az 8 karakter olmalı.', 'hata');
      kilitle(fy, true);
      oturum().then(function (s) { if (!s) throw new Error('Oturum bulunamadı'); return istek('/auth/v1/user', {method: 'PUT', token: s.at, body: {password: sf}}); })
        .then(function () { mesaj(fy, 'Yeni şifren kaydedildi.', 'tamam'); setTimeout(function () { location.href = '/premium/'; }, 800); })
        .catch(function (err) { mesaj(fy, hataYazi(err), 'hata'); })
        .then(function () { kilitle(fy, false); });
    });
  }
  if (pencere) formlariBagla(pencere);
  var sayfaForm = $('[data-uyelik-sayfa]');
  if (sayfaForm) { formlariBagla(sayfaForm); if (location.hash === '#giris') sekme('giris', sayfaForm); var nd = (new URLSearchParams(location.search)).get('neden'); var nn = $('.uy-neden', sayfaForm); if (nn && nd === 'kupon') { nn.textContent = 'Hazır kuponlar üyelerimize açılacak. Ücretsiz üye ol, yayına girdiğinde ilk sen gör.'; nn.hidden = false; } }

  function cikis() {
    oturum().then(function (s) { if (s) return istek('/auth/v1/logout', {method: 'POST', token: s.at}).catch(function () {}); })
      .then(function () { yaz(null); location.href = '/'; });
  }

  // ---------- tetikleyiciler: Hazır kuponlar, giriş, premium ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-uyelik]');
    if (!a) return;
    var tur = a.getAttribute('data-uyelik');
    if (tur === 'cikis') { e.preventDefault(); cikis(); return; }
    e.preventDefault();
    var mm = $('.mmenu'); if (mm) mm.open = false;
    oturum().then(function (s) {
      if (!s) { ac(tur === 'giris' ? 'giris' : 'kayit', tur === 'kupon' ? 'kupon' : (tur === 'premium' ? 'premium' : '')); return; }
      if (tur === 'kupon') { olay('kupon_tikladi'); profil().then(function (p) { location.href = premiumMu(p) ? '/#hazir-kuponlar' : '/premium/?neden=kupon'; }); return; }
      location.href = '/premium/';
    });
  });

  // ---------- üst bar durumu ----------
  function ustBar() {
    profil().then(function (p) {
      $$('[data-uye-giris]').forEach(function (x) {
        if (p) { x.textContent = 'Hesabım'; x.setAttribute('href', '/premium/#hesap'); x.removeAttribute('data-uyelik'); }
      });
      $$('[data-uye-premium]').forEach(function (x) {
        if (premiumMu(p)) { x.textContent = '★ Premium üyesin'; x.classList.add('aktif'); x.setAttribute('href', '/premium/#hesap'); x.removeAttribute('data-uyelik'); }
      });
      $$('[data-uye-cikis]').forEach(function (x) { x.hidden = !p; });
    });
  }

  // ---------- premium sayfası ----------
  function premiumSayfa() {
    var kok = $('[data-premium]'); if (!kok) return;
    var hesap = $('#hesap');
    if (!HAZIR) { $$('[data-kurulum]', kok).forEach(function (x) { x.hidden = false; }); }
    profil().then(function (p) {
      if (p) {
        olay('premium_sayfasi');
        if (hesap) {
          hesap.hidden = false;
          $('[data-hesap-ad]', hesap).textContent = p.ad_soyad || '';
          $('[data-hesap-eposta]', hesap).textContent = p.eposta || '';
          $('[data-hesap-durum]', hesap).textContent = premiumMu(p) ? ('Premium' + (p.premium_bitis ? ' · bitiş ' + new Date(p.premium_bitis).toLocaleDateString('tr-TR') : '')) : 'Ücretsiz üye';
        }
      }
      if ((new URLSearchParams(location.search)).get('neden') === 'kupon') { var u = $('[data-kupon-not]', kok); if (u) u.hidden = false; }
    });
    $$('[data-plan]', kok).forEach(function (b) {
      b.addEventListener('click', function () {
        var plan = b.getAttribute('data-plan');
        oturum().then(function (s) {
          if (!s) { ac('kayit', 'premium'); return; }
          olay('odemeye_gecti', {plan: plan}).then(function () {
            var k = $('[data-odeme-bilgi]', kok);
            if (k) { k.hidden = false; k.scrollIntoView({behavior: 'smooth', block: 'center'}); }
          });
        });
      });
    });
  }

  // ---------- admin paneli ----------
  function tarih(t) { try { return new Date(t).toLocaleString('tr-TR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}); } catch (e) { return t; } }
  var PLAN_AD = {haftalik: 'Haftalık', aylik: 'Aylık'};
  var OLAY_AD = {kayit: 'Üye oldu', giris: 'Giriş yaptı', kupon_tikladi: 'Hazır kuponlara tıkladı', premium_sayfasi: 'Premium sayfasını gördü', odemeye_gecti: 'Ödemeye geçti', odeme_tamam: 'Ödemeyi tamamladı'};
  function el(ad, sinif, metin) { var x = document.createElement(ad); if (sinif) x.className = sinif; if (metin != null) x.textContent = metin; return x; }

  function adminSayfa() {
    var kok = $('[data-admin]'); if (!kok) return;
    var durum = $('[data-admin-durum]', kok), panel = $('[data-admin-panel]', kok), girisK = $('[data-admin-giris]', kok);
    if (!HAZIR) { durum.textContent = 'Yönetici girişi bu sayfadan yapılır. Giriş, Supabase bağlantısı kurulunca çalışmaya başlar.'; girisK.hidden = false; formlariBagla(girisK); sekme('giris', girisK); return; }
    oturum().then(function (s) {
      if (!s) { durum.textContent = 'Yönetici hesabınla giriş yap.'; girisK.hidden = false; formlariBagla(girisK); sekme('giris', girisK); return; }
      return rest('adminler?select=user_id').then(function (a) {
        if (!a || !a.length) { durum.textContent = 'Bu sayfa yalnız yöneticiler içindir. Giriş yaptığın hesap yönetici değil.'; return; }
        durum.textContent = 'Veriler yükleniyor…';
        return Promise.all([rest('profiller?select=*&order=created_at.desc&limit=5000'), rest('olaylar?select=id,user_id,tur,plan,sayfa,created_at&order=created_at.desc&limit=5000')])
          .then(function (r) { durum.textContent = ''; panel.hidden = false; adminCiz(r[0] || [], r[1] || []); });
      });
    }).catch(function (e) { durum.textContent = hataYazi(e); });
  }

  function adminCiz(U, O) {
    var kok = $('[data-admin-panel]');
    var byId = {}; U.forEach(function (u) { byId[u.id] = u; });
    var son = {}; O.forEach(function (o) { if (!son[o.user_id]) son[o.user_id] = o; });
    var kim = function (tur) { var s = {}; O.forEach(function (o) { if (o.tur === tur) s[o.user_id] = 1; }); return Object.keys(s).length; };
    var hafta = Date.now() - 7 * 864e5;
    var premiumN = U.filter(premiumMu).length;
    var kpi = [['Toplam üye', U.length], ['Son 7 günde yeni üye', U.filter(function (u) { return new Date(u.created_at) > hafta; }).length],
      ['Hazır kuponlardan gelen', (function () { var s = {}; U.forEach(function (u) { if (u.kaynak === 'kupon') s[u.id] = 1; }); O.forEach(function (o) { if (o.tur === 'kupon_tikladi') s[o.user_id] = 1; }); return Object.keys(s).length; })()], ['Premium sayfasını gören', kim('premium_sayfasi')], ['Ödemeye geçen', kim('odemeye_gecti')], ['Premium üye', premiumN]];
    var kk = $('[data-kpi]', kok); kk.textContent = '';
    kpi.forEach(function (k) { var d = el('div', 'kpi'); d.appendChild(el('b', '', String(k[1]))); d.appendChild(el('span', '', k[0])); kk.appendChild(d); });

    var huni = $('[data-huni]', kok); huni.textContent = '';
    var adim = [['Üye oldu', U.length], ['Premium sayfasını gördü', kim('premium_sayfasi')], ['Ödemeye geçti', kim('odemeye_gecti')], ['Premium oldu', premiumN]];
    var en = Math.max(1, U.length);
    adim.forEach(function (a) {
      var r = el('div', 'huni-satir'); r.appendChild(el('span', 'huni-ad', a[0]));
      var c = el('span', 'huni-cubuk'); var i = el('i'); i.style.width = Math.round(100 * a[1] / en) + '%'; c.appendChild(i); r.appendChild(c);
      r.appendChild(el('b', '', a[1] + ' (' + Math.round(100 * a[1] / en) + '%)')); huni.appendChild(r);
    });

    var ara = $('[data-ara]', kok), filtre = $('[data-filtre]', kok), tb = $('[data-uyeler] tbody', kok);
    var odemeci = {}; O.forEach(function (o) { if (o.tur === 'odemeye_gecti') odemeci[o.user_id] = o; });
    function satirlar() {
      var q = (ara.value || '').toLocaleLowerCase('tr-TR'), f = filtre.value;
      tb.textContent = '';
      var L = U.filter(function (u) {
        if (f === 'premium' && !premiumMu(u)) return false;
        if (f === 'odeme' && !odemeci[u.id]) return false;
        if (f === 'ileti' && !u.ileti_onay) return false;
        return !q || [u.ad_soyad, u.eposta, u.telefon].join(' ').toLocaleLowerCase('tr-TR').indexOf(q) >= 0;
      });
      L.forEach(function (u) {
        var tr = el('tr');
        var td = function (v, s) { var x = el('td', s || '', v == null ? '' : String(v)); tr.appendChild(x); return x; };
        td(u.ad_soyad || '—'); td(u.eposta); td(u.telefon || '—'); td(tarih(u.created_at));
        td(premiumMu(u) ? ('Premium' + (u.premium_bitis ? ' · ' + new Date(u.premium_bitis).toLocaleDateString('tr-TR') : '')) : 'Ücretsiz', premiumMu(u) ? 'rozet-p' : '');
        td(odemeci[u.id] ? ('Evet · ' + (PLAN_AD[odemeci[u.id].plan] || odemeci[u.id].plan || '') + ' · ' + tarih(odemeci[u.id].created_at)) : '—', odemeci[u.id] ? 'rozet-o' : '');
        td(u.ileti_onay ? 'Var' : 'Yok');
        td(son[u.id] ? (OLAY_AD[son[u.id].tur] || son[u.id].tur) + ' · ' + tarih(son[u.id].created_at) : '—');
        var islem = el('td', 'islem');
        var b1 = el('button', 'dugme-k', premiumMu(u) ? 'Premium kaldır' : '30 gün ver');
        b1.type = 'button';
        b1.addEventListener('click', function () {
          var gun = premiumMu(u) ? 0 : 30;
          if (!window.confirm((gun ? '30 gün premium verilsin mi: ' : 'Premium kaldırılsın mı: ') + (u.eposta || ''))) return;
          b1.disabled = true;
          rest('rpc/admin_premium_ayarla', {method: 'POST', body: {hedef: u.id, gun: gun}})
            .then(function () { u.premium = gun > 0; u.premium_bitis = gun ? new Date(Date.now() + gun * 864e5).toISOString() : null; satirlar(); })
            .catch(function (e) { alert(hataYazi(e)); b1.disabled = false; });
        });
        islem.appendChild(b1); tr.appendChild(islem);
        tb.appendChild(tr);
      });
      $('[data-sayi]', kok).textContent = L.length + ' üye listeleniyor';
    }
    ara.addEventListener('input', satirlar); filtre.addEventListener('change', satirlar); satirlar();

    var ob = $('[data-olaylar] tbody', kok); ob.textContent = '';
    O.slice(0, 200).forEach(function (o) {
      var u = byId[o.user_id] || {}, tr = el('tr');
      [tarih(o.created_at), (u.ad_soyad || '') + (u.eposta ? ' (' + u.eposta + ')' : ''), OLAY_AD[o.tur] || o.tur, PLAN_AD[o.plan] || o.plan || '', o.sayfa || ''].forEach(function (v) { tr.appendChild(el('td', '', v)); });
      if (o.tur === 'odemeye_gecti') tr.className = 'vurgu';
      ob.appendChild(tr);
    });

    $('[data-csv]', kok).addEventListener('click', function () {
      var bas = ['Ad soyad', 'E-posta', 'Telefon', 'Kayıt', 'Premium', 'Premium bitiş', 'Ödemeye geçti', 'İleti onayı', 'Kaynak'];
      var rows = [bas].concat(U.map(function (u) { return [u.ad_soyad, u.eposta, u.telefon, u.created_at, premiumMu(u) ? 'evet' : 'hayır', u.premium_bitis || '', odemeci[u.id] ? 'evet' : 'hayır', u.ileti_onay ? 'evet' : 'hayır', u.kaynak || '']; }));
      var csv = '﻿' + rows.map(function (r) { return r.map(function (v) { v = v == null ? '' : String(v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\n');
      var a = document.createElement('a'); a.href = URL_.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'})); a.download = 'tjkdetay-uyeler-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    });
  }
  var URL_ = window.URL;

  // ---------- başlat ----------
  hashIsle().then(function (h) {
    if (h && h.hata) { ac('giris'); var f = pencere ? $('[data-form=giris]', pencere) : $('[data-form=giris]'); if (f) mesaj(f, h.hata, 'hata'); }
    else if (h && h.tur === 'recovery') { var k = sayfaForm || pencere; if (pencere && !sayfaForm) ac('yeni-sifre'); else if (k) sekme('yeni-sifre', k); }
    else if (h && (h.tur === 'signup' || h.tur === 'email' || h.tur === 'magiclink')) { profilSoz = null; }
    ustBar(); premiumSayfa(); adminSayfa();
  });
  $$('[data-uye-cikis]').forEach(function (x) { x.addEventListener('click', function (e) { e.preventDefault(); cikis(); }); });
})();
