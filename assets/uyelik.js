// TJK Detay — üyelik, premium ve ödeme (Supabase Auth + REST + Edge Functions; dış kütüphane yok)
(function () {
  'use strict';
  var AYAR = window.TJKD_UYELIK || {};
  var URL_ = String(AYAR.url || '').replace(/\/+$/, ''), URL = URL_;
  var KEY = String(AYAR.anon || '');
  var HAZIR = /^https:\/\/.+/.test(URL) && KEY.length > 20;
  var SK = 'tjkd-oturum';
  var ADMIN_EPOSTA = String(AYAR.adminEposta || 'info@elyapa.com');
  function kimlik(v) { v = String(v || '').trim(); return v.toLocaleLowerCase('tr-TR') === 'admin' ? ADMIN_EPOSTA : v; }
  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };

  // ---------- davet (?ref=KOD): 30 gün hatırlanır, kayıtta davet edene iletilir ----------
  var DK = 'tjkd-davet';
  (function () { try { var r = (new URLSearchParams(location.search)).get('ref'); if (r && /^[A-Za-z0-9]{5,12}$/.test(r)) localStorage.setItem(DK, JSON.stringify({k: r.toUpperCase(), t: Date.now()})); } catch (e) {} })();
  function davetKodu() { try { var d = JSON.parse(localStorage.getItem(DK) || 'null'); if (d && d.k && Date.now() - d.t < 30 * 864e5) return d.k; } catch (e) {} return ''; }

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
        ad_soyad: ad, telefon: tel, kvkk_onay: true, sartlar_onay: true, ileti_onay: !!d.get('ileti'), kaynak: (davetKodu() ? 'davet' : neden), davet: davetKodu()}}})
        .then(function (j) {
          if (j && j.access_token) { oturumKaydet(j); mesaj(fk, 'Üyeliğin açıldı, hoş geldin!', 'tamam'); setTimeout(function () { location.href = '/premium/'; }, 700); }
          else { fk.reset(); mesaj(fk, 'Neredeyse tamam: ' + ep + ' adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıklayınca üyeliğin açılır.', 'tamam'); }
        })
        .catch(function (err) { mesaj(fk, hataYazi(err), 'hata'); })
        .then(function () { kilitle(fk, false); });
    });
    var fg = $('[data-form=giris]', kapsam), HK = 'tjkd-hatirla-ep';
    if (fg) { try { var hep = localStorage.getItem(HK); if (hep) { fg.eposta.value = hep; if (fg.hatirla) fg.hatirla.checked = true; } } catch (e0) {} }
    if (fg) fg.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(fg);
      try { if (d.get('hatirla')) localStorage.setItem(HK, kimlik(d.get('eposta'))); else localStorage.removeItem(HK); } catch (e1) {}
      kilitle(fg, true); mesaj(fg, 'Giriş yapılıyor…');
      istek('/auth/v1/token?grant_type=password', {method: 'POST', body: {email: kimlik(d.get('eposta')), password: String(d.get('sifre') || '')}})
        .then(function (j) { oturumKaydet(j); profilSoz = null; olay('giris'); mesaj(fg, 'Giriş yapıldı.', 'tamam'); setTimeout(function () { kapat(); if (location.pathname.indexOf('/uye-ol') === 0) location.href = '/premium/'; else location.reload(); }, 400); })
        .catch(function (err) { mesaj(fg, hataYazi(err), 'hata'); })
        .then(function () { kilitle(fg, false); });
    });
    var su = $('[data-sifre-unuttum]', kapsam);
    if (su) su.addEventListener('click', function () {
      var ep = kimlik(new FormData(fg).get('eposta'));
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
        if (p) {
          x.textContent = ''; x.setAttribute('href', '/premium/#hesap'); x.removeAttribute('data-uyelik'); x.classList.add('hesabim');
          var f = document.createElement('span'); f.className = 'hesap-foto mini'; f.setAttribute('aria-hidden', 'true'); fotoGoster(f, p.foto_url, p.ad_soyad || p.eposta);
          x.appendChild(f); x.appendChild(document.createTextNode('Hesabım'));
        }
      });
      $$('[data-uye-premium]').forEach(function (x) {
        if (premiumMu(p)) { x.textContent = '★ Premium üyesin'; x.classList.add('aktif'); x.setAttribute('href', '/premium/#hesap'); x.removeAttribute('data-uyelik'); }
      });
      $$('[data-uye-cikis]').forEach(function (x) { x.hidden = !p; });
    });
  }

  // ---------- ayarlar (herkese açık: planlar, ödeme, site) ----------
  var ayarSoz = null;
  function ayarlar() {
    if (ayarSoz) return ayarSoz;
    ayarSoz = !HAZIR ? Promise.resolve({}) : istek('/rest/v1/ayarlar?select=anahtar,deger&herkese_acik=eq.true')
      .then(function (r) { var m = {}; (r || []).forEach(function (x) { m[x.anahtar] = x.deger; }); return m; })
      .catch(function () { return {}; });
    return ayarSoz;
  }
  function tl(kurus) { return (Number(kurus) / 100).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY', minimumFractionDigits: 2}); }

  function fn(ad, govde) {
    return oturum().then(function (s) {
      if (!s) { var e = new Error('Oturum yok'); e.durum = 401; throw e; }
      return istek('/functions/v1/' + ad, {method: govde ? 'POST' : 'GET', token: s.at, body: govde});
    });
  }

  // ---------- duyuru şeridi (admin → Site ayarları) ----------
  function duyuru() {
    if (document.body.classList.contains('admin-govde')) return;
    ayarlar().then(function (m) {
      var d = m.site || {};
      if (!d.duyuru_aktif || !d.duyuru) return;
      var bar = document.createElement('div'); bar.className = 'duyuru'; bar.setAttribute('role', 'note');
      var ic = document.createElement('div'); ic.className = 'kap';
      if (d.duyuru_link) { var a = document.createElement('a'); a.href = d.duyuru_link; a.textContent = d.duyuru; ic.appendChild(a); } else ic.textContent = d.duyuru;
      bar.appendChild(ic);
      var ust = $('header.ust'); if (ust && ust.parentNode) ust.parentNode.insertBefore(bar, ust); else document.body.insertBefore(bar, document.body.firstChild);
    });
  }

  // ---------- premium sayfası ----------
  var PLAN_OZELLIK = ['Her altılı için küçük, orta ve büyük hazır kupon', 'Ayak ayak gerekçe ve kupon tutarı', 'Koşu öncesi sürpriz uyarıları', 'Altılı sonrası kupon karnesi'];
  function planKart(p, odemeAcik) {
    var art = document.createElement('article'); art.className = 'plan' + (p.one_cikan ? ' plan-one' : '');
    var h = document.createElement('h2'); h.textContent = p.ad; art.appendChild(h);
    var su = document.createElement('p'); su.className = 'plan-sure'; su.textContent = p.gun + ' gün'; art.appendChild(su);
    var fi = document.createElement('p'); fi.className = 'plan-fiyat'; fi.textContent = Number(p.fiyat) > 0 ? tl(Math.round(Number(p.fiyat) * 100)) : 'Fiyat yakında'; art.appendChild(fi);
    if (Number(p.fiyat) > 0) { var kd = document.createElement('p'); kd.className = 'plan-kdv'; kd.textContent = 'KDV dahil · otomatik yenileme yok'; art.appendChild(kd); }
    var ul = document.createElement('ul'); (p.ozellikler && p.ozellikler.length ? p.ozellikler : PLAN_OZELLIK).forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); }); art.appendChild(ul);
    if (p.one_cikan) { var n = document.createElement('p'); n.className = 'plan-not'; n.textContent = p.etiket || 'En avantajlı plan'; art.appendChild(n); }
    var b = document.createElement('button'); b.type = 'button'; b.className = 'dugme dugme-mavi'; b.setAttribute('data-plan', p.kod); b.textContent = 'Premium\'a geç'; art.appendChild(b);
    return art;
  }

  function premiumSayfa() {
    var kok = $('[data-premium]'); if (!kok) return;
    var hesap = $('#hesap'), planKok = $('[data-planlar]', kok), odeme = $('[data-odeme]', kok);
    var PLANLAR = {}, ODEME = {};
    if (!HAZIR) { $$('[data-kurulum]', kok).forEach(function (x) { x.hidden = false; }); }
    var q = new URLSearchParams(location.search);
    profil().then(function (p) {
      if (p) {
        olay('premium_sayfasi');
        if (hesap) {
          hesap.hidden = false;
          $('[data-hesap-ad]', hesap).textContent = p.ad_soyad || '';
          $('[data-hesap-eposta]', hesap).textContent = p.eposta || '';
          $('[data-hesap-durum]', hesap).textContent = premiumMu(p) ? ('Premium' + (p.premium_bitis ? ' · bitiş ' + new Date(p.premium_bitis).toLocaleDateString('tr-TR') : '')) : 'Ücretsiz üye';
        }
        profilDuzenle(p);
      }
      if (q.get('neden') === 'kupon') { var u = $('[data-kupon-not]', kok); if (u) u.hidden = false; }
    });
    // PayTR dönüşü
    var dn = $('[data-odeme-sonuc]', kok);
    if (dn && q.get('odeme') === 'tamam') {
      dn.hidden = false; dn.className = 'odeme-sonuc bekle'; dn.textContent = 'Ödemen alındı, banka onayı bekleniyor…';
      var deneme = 0;
      (function bak() {
        profil(true).then(function (p) {
          if (premiumMu(p)) { dn.className = 'odeme-sonuc tamam'; dn.textContent = 'Teşekkürler! Premium üyeliğin açıldı' + (p.premium_bitis ? ' (bitiş: ' + new Date(p.premium_bitis).toLocaleDateString('tr-TR') + ').' : '.'); ustBar(); return; }
          if (++deneme < 20) setTimeout(bak, 3000); else { dn.className = 'odeme-sonuc bekle'; dn.textContent = 'Ödemen alındı; onay birkaç dakika sürebilir. Sayfayı biraz sonra yenile ya da WhatsApp\'tan yaz.'; }
        });
      })();
    } else if (dn && q.get('odeme') === 'hata') {
      dn.hidden = false; dn.className = 'odeme-sonuc hata'; dn.textContent = 'Ödeme tamamlanamadı. Kartından para çekilmediyse tekrar deneyebilirsin; sorun sürerse WhatsApp\'tan yaz.';
    }
    ayarlar().then(function (m) {
      ODEME = (m.odeme_yontemleri || {});
      var L = Array.isArray(m.premium_planlar) ? m.premium_planlar.filter(function (p) { return p && p.aktif !== false; }) : null;
      if (L && L.length && planKok) { planKok.textContent = ''; L.forEach(function (p) { PLANLAR[p.kod] = p; planKok.appendChild(planKart(p)); }); }
      $$('[data-plan]', kok).forEach(function (b) { b.addEventListener('click', function () { planSec(b.getAttribute('data-plan')); }); });
    });
    function planSec(kod) {
      oturum().then(function (s) {
        if (!s) { ac('kayit', 'premium'); return; }
        olay('odemeye_gecti', {plan: kod});
        var p = PLANLAR[kod], paytr = ODEME.paytr || {};
        var bilgi = $('[data-odeme-bilgi]', kok);
        if (!p || !(Number(p.fiyat) > 0) || !paytr.aktif || !odeme) {
          if (odeme) odeme.hidden = true;
          if (bilgi) { bilgi.hidden = false; bilgi.scrollIntoView({behavior: 'smooth', block: 'center'}); }
          return;
        }
        if (bilgi) bilgi.hidden = true;
        odeme.hidden = false; odeme.setAttribute('data-secili', kod);
        $('[data-odeme-ozet]', odeme).textContent = 'tjkdetay Premium · ' + p.ad + ' (' + p.gun + ' gün) · ' + tl(Math.round(Number(p.fiyat) * 100)) + ' (KDV dahil)' + (paytr.test_modu ? ' · TEST MODU' : '');
        $('[data-odeme-cerceve]', odeme).textContent = '';
        $('[data-odeme-onay]', odeme).checked = false;
        var bt = $('[data-odeme-baslat]', odeme); bt.hidden = false; bt.disabled = false;
        odeme.scrollIntoView({behavior: 'smooth', block: 'start'});
      });
    }
    if (odeme) $('[data-odeme-baslat]', odeme).addEventListener('click', function () {
      var bt = this, ms = $('[data-odeme-mesaj]', odeme);
      if (!$('[data-odeme-onay]', odeme).checked) { ms.className = 'uy-mesaj hata'; ms.textContent = 'Devam etmek için ön bilgilendirme formu ve mesafeli satış sözleşmesini onayla.'; return; }
      bt.disabled = true; ms.className = 'uy-mesaj'; ms.textContent = 'Güvenli ödeme sayfası hazırlanıyor…';
      fn('paytr-token', {plan: odeme.getAttribute('data-secili'), onay: true}).then(function (j) {
        if (!j || !j.token) throw new Error((j && j.hata) || 'Ödeme başlatılamadı');
        ms.textContent = ''; bt.hidden = true;
        var cer = $('[data-odeme-cerceve]', odeme); cer.textContent = '';
        var fr = document.createElement('iframe'); fr.id = 'paytriframe'; fr.src = 'https://www.paytr.com/odeme/guvenli/' + encodeURIComponent(j.token);
        fr.setAttribute('frameborder', '0'); fr.setAttribute('scrolling', 'no'); fr.title = 'PayTR güvenli ödeme'; fr.style.width = '100%'; fr.style.minHeight = '640px'; fr.style.border = '0';
        cer.appendChild(fr);
        var sc = document.createElement('script'); sc.src = 'https://www.paytr.com/js/iframeResizer.min.js';
        sc.onload = function () { try { window.iFrameResize({}, '#paytriframe'); } catch (e) {} };
        document.body.appendChild(sc);
      }).catch(function (e) {
        bt.disabled = false;
        ms.className = 'uy-mesaj hata';
        var m = (e && e.message) || '';
        ms.textContent = (e && e.durum === 401) ? 'Oturumun sona ermiş; yeniden giriş yap.' : (m.indexOf('Ödeme') >= 0 || m.indexOf('PayTR') >= 0 || m.indexOf('Plan') >= 0 || m.indexOf('onay') >= 0 ? m : 'Ödeme başlatılamadı: ' + hataYazi(e));
      });
    });
  }

  // Anonim sayaç yalnız çerez/izin bandında "Tümünü kabul et" denince çalışır (KVKK: zorunlu olmayan kayıtlar için açık rıza)
  function cerezIzni() { try { return localStorage.getItem('tjkd-cerez') === 'kabul' && localStorage.getItem('tjkd-z-kapali') !== '1'; } catch (e) { return false; } }
  // ---------- ziyaret sayacı (çerezsiz; IP saklanmaz; Do Not Track / GPC açıksa sayılmaz) ----------
  function sayac() {
    if (!HAZIR || document.body.classList.contains('admin-govde')) return;
    var ua = navigator.userAgent || '';
    if (navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(ua)) return;
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
    if (!cerezIzni()) { document.addEventListener('tjkd-cerez-kabul', function () { sayac(); }, {once: true}); return; }
    var oturumNo = null, yeni = false;
    try {
      oturumNo = sessionStorage.getItem('tjkd-z');
      if (!oturumNo) { oturumNo = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); sessionStorage.setItem('tjkd-z', oturumNo); }
    } catch (e) { oturumNo = null; }
    try { if (!localStorage.getItem('tjkd-z-gordu')) { yeni = true; localStorage.setItem('tjkd-z-gordu', '1'); } } catch (e) {}
    var kaynak = '';
    try {
      var q = new URLSearchParams(location.search);
      kaynak = (q.get('utm_source') || '').toLowerCase().slice(0, 40);
      if (!kaynak && q.get('fbclid')) kaynak = 'facebook (reklam/bağlantı)';
      if (!kaynak && q.get('gclid')) kaynak = 'google (reklam)';
      if (!kaynak && document.referrer) { var h = new window.URL(document.referrer).hostname.replace(/^www\./, ''); if (h && h !== location.hostname.replace(/^www\./, '')) kaynak = h; }
    } catch (e) {}
    var cihaz = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'tablet' : (/Mobi|Android|iPhone/i.test(ua) ? 'mobil' : 'masaustu');
    oturum().then(function (s) {
      return istek('/rest/v1/rpc/ziyaret_kaydet', {method: 'POST', token: s ? s.at : null,
        body: {p_yol: location.pathname.slice(0, 200), p_kaynak: kaynak || null, p_cihaz: cihaz, p_oturum: oturumNo, p_yeni: yeni}});
    }).catch(function () {});
  }

  // ---------- canlı şerit: gerçek anlık ziyaretçi sayısı (supabase_v4_canli.sql; yalnız toplam sayılar) ----------
  function canli() {
    if (!HAZIR || document.body.classList.contains('admin-govde')) return;
    var ua = navigator.userAgent || '';
    if (navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(ua)) return;
    var ESIK = 2;        // canlı satır, şu an sitede en az bu kadar kişi varken görünür
    var GUN_ESIK = 1;    // daha az kişi varken bugünkü toplam gösterilir (şerit her zaman görünür)
    var ARALIK = 60000;  // nabız ve özet dakikada bir
    var AD = [['bulten', 'bugünün bültenini okuyor'], ['kupon', 'hazır kuponları inceliyor'], ['sonuc', 'sonuçlara bakıyor'],
      ['muhtemel', "muhtemel ve AGF'ye bakıyor"], ['canli', 'canlı yayında'], ['ozet', 'günün özetinde']];
    var sayilmaz = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
    try { if (localStorage.getItem('tjkd-z-kapali') === '1') sayilmaz = true; } catch (e) {}
    var acik = false;    // varsayılan: en küçük hali; dokununca ayrıntı açılır
    var ser = null, son = null, hata = 0, zam = null;
    function say(n) { return Number(n || 0).toLocaleString('tr-TR'); }
    function kur() {
      ser = document.createElement('button');
      ser.type = 'button'; ser.className = 'cs'; ser.hidden = true;
      ser.innerHTML = '<i class="cs-nokta" aria-hidden="true"></i><span class="cs-yazi"></span>';
      document.body.appendChild(ser);
      ser.addEventListener('click', function () { acik = !acik; ciz(son); });
    }
    function ciz(o) {
      son = o;
      if (!o) { if (ser) ser.hidden = true; return; }
      var n = Number(o.simdi || 0), gt = Number(o.bugun_tekil || 0), canliMi = n >= ESIK;
      if (!canliMi && gt < GUN_ESIK) { if (ser) ser.hidden = true; return; }
      if (!ser) kur();
      var yazi = ser.querySelector('.cs-yazi'), h = '', ek = [];
      if (canliMi) {
        h = '<b>' + say(n) + '</b> kişi çevrimiçi';
        var b = o.bolum || {};
        ek = AD.filter(function (x) { return b[x[0]] > 0; })
          .sort(function (x, y) { return b[y[0]] - b[x[0]]; }).slice(0, 2)
          .map(function (x) { return say(b[x[0]]) + ' kişi ' + x[1]; });
        if (o.premium > 0) ek.push(say(o.premium) + ' premium üye çevrimiçi');
        ser.title = 'Şu an sitede ' + say(n) + ' kişi (gerçek anlık sayı, son 2,5 dk). ' + (ek.length ? ek.join(', ') + '. ' : '') + 'Ayrıntı için dokun.';
      } else {
        h = 'Bugün <b>' + say(gt) + '</b> ziyaretçi';
        if (o.bugun_bulten > 0) ek.push(say(o.bugun_bulten) + ' kişi bülteni açtı');
        ser.title = 'Bugün (Türkiye saatiyle) siteyi açan farklı ziyaretçi: ' + say(gt) + ' (gerçek sayı). Ayrıntı için dokun.';
      }
      if (!acik) h = '<b>' + say(canliMi ? n : gt) + '</b>';  // kapalı: yalnız sayı (bayrak)
      else if (ek.length) h += '<span class="cs-ek"><br>' + ek.join('<br>') + '</span>';
      yazi.innerHTML = h;
      ser.classList.toggle('canli', canliMi);
      ser.classList.toggle('gunluk', !canliMi);
      ser.classList.toggle('acik', acik);
      ser.setAttribute('aria-expanded', acik ? 'true' : 'false');
      ser.setAttribute('aria-label', ser.title);
      ser.hidden = false;
    }
    function tur() {
      if (document.hidden) return;
      var ot = null;
      try { ot = sessionStorage.getItem('tjkd-z'); } catch (e) {}
      var nabiz = (sayilmaz || !cerezIzni() || !ot) ? Promise.resolve() : oturum().then(function (s) {
        return istek('/rest/v1/rpc/canli_nabiz_kaydet', {method: 'POST', token: s ? s.at : null, body: {p_yol: location.pathname.slice(0, 200), p_oturum: ot}});
      }).catch(function () {});
      nabiz.then(function () { return istek('/rest/v1/rpc/canli_ozet', {method: 'POST', body: {}}); })
        .then(function (o) { hata = 0; ciz(o); })
        .catch(function () { hata++; ciz(null); if (hata >= 3 && zam) { clearInterval(zam); zam = null; } });
    }
    setTimeout(tur, 1500);
    zam = setInterval(tur, ARALIK);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && zam) tur(); });
  }



  // ---------- profil düzenleme: ad, soyad, telefon, fotoğraf ----------
  function fotoGoster(el, url, ad) {
    if (!el) return;
    el.textContent = ''; el.style.backgroundImage = '';
    if (url) el.style.backgroundImage = 'url("' + url.replace(/"/g, '') + '")';
    else el.textContent = (String(ad || '?').trim().charAt(0) || '?').toLocaleUpperCase('tr-TR');
  }
  function kareKucult(dosya, boy) {
    return new Promise(function (ok, red) {
      var img = new Image(), u = window.URL.createObjectURL(dosya);
      img.onload = function () {
        var k = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = boy;
        c.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, boy, boy);
        window.URL.revokeObjectURL(u); c.toBlob(function (b) { b ? ok(b) : red(new Error('resim')); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { window.URL.revokeObjectURL(u); red(new Error('Resim okunamadı.')); };
      img.src = u;
    });
  }
  function profilDuzenle(p) {
    var f = $('[data-profil-form]'), ac = $('[data-profil-ac]'); if (!f || !ac || !p) return;
    var on = $('[data-pf-onizleme]', f), dosyaG = $('[data-pf-dosya]', f), kaldir = $('[data-pf-kaldir]', f), m = $('[data-pf-mesaj]', f);
    var yeniFoto = null, fotoSil = false;
    fotoGoster($('[data-hesap-foto]'), p.foto_url, p.ad_soyad || p.eposta);
    function doldur() {
      var parca = String(p.ad_soyad || '').trim().split(/\s+/);
      f.ad.value = parca.length > 1 ? parca.slice(0, -1).join(' ') : (parca[0] || '');
      f.soyad.value = parca.length > 1 ? parca[parca.length - 1] : '';
      f.telefon.value = p.telefon || '';
      yeniFoto = null; fotoSil = false; fotoGoster(on, p.foto_url, p.ad_soyad || p.eposta); kaldir.hidden = !p.foto_url; m.hidden = true;
    }
    function goster(a) { f.hidden = !a; ac.setAttribute('aria-expanded', a ? 'true' : 'false'); if (a) { doldur(); f.ad.focus(); } }
    ac.addEventListener('click', function () { goster(f.hidden); });
    $('[data-profil-kapat]', f).addEventListener('click', function () { goster(false); });
    dosyaG.addEventListener('change', function () {
      var d = dosyaG.files && dosyaG.files[0]; if (!d) return;
      if (!/^image\/(jpeg|png|webp)$/.test(d.type)) { m.hidden = false; m.className = 'odeme-sonuc hata'; m.textContent = 'Yalnız JPG, PNG ya da WEBP fotoğraf yükleyebilirsin.'; return; }
      kareKucult(d, 320).then(function (b) { yeniFoto = b; fotoSil = false; on.textContent = ''; on.style.backgroundImage = 'url("' + window.URL.createObjectURL(b) + '")'; kaldir.hidden = false; m.hidden = true; })
        .catch(function (e) { m.hidden = false; m.className = 'odeme-sonuc hata'; m.textContent = e.message; });
    });
    kaldir.addEventListener('click', function () { yeniFoto = null; fotoSil = true; fotoGoster(on, '', f.ad.value); kaldir.hidden = true; });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ad = (f.ad.value.trim() + ' ' + f.soyad.value.trim()).trim().slice(0, 120), tel = f.telefon.value.trim().slice(0, 30);
      var btn = f.querySelector('[type=submit]'); btn.disabled = true; m.hidden = false; m.className = 'odeme-sonuc bekle'; m.textContent = 'Kaydediliyor…';
      oturum().then(function (s) {
        if (!s || !s.user) throw new Error('Oturumun kapanmış; tekrar giriş yap.');
        var yol = s.user.id + '/foto.jpg', adim = Promise.resolve(p.foto_url || null);
        if (yeniFoto) adim = fetch(URL_ + '/storage/v1/object/avatarlar/' + yol, {method: 'POST', headers: {apikey: KEY, Authorization: 'Bearer ' + s.at, 'x-upsert': 'true', 'Content-Type': 'image/jpeg'}, body: yeniFoto})
          .then(function (r) { if (r.ok) return r; return fetch(URL_ + '/storage/v1/object/avatarlar/' + yol, {method: 'PUT', headers: {apikey: KEY, Authorization: 'Bearer ' + s.at, 'Content-Type': 'image/jpeg'}, body: yeniFoto}); })
          .then(function (r) { if (!r.ok) return r.text().then(function (t) { var x = ''; try { x = JSON.parse(t).message || ''; } catch (e3) {} throw new Error('Fotoğraf yüklenemedi (' + r.status + (x ? ': ' + x : '') + '). Lütfen biraz sonra tekrar dene.'); }); return URL_ + '/storage/v1/object/public/avatarlar/' + yol + '?v=' + Date.now(); });
        else if (fotoSil) adim = fetch(URL_ + '/storage/v1/object/avatarlar/' + yol, {method: 'DELETE', headers: {apikey: KEY, Authorization: 'Bearer ' + s.at}}).then(function () { return null; }, function () { return null; });
        return adim.then(function (foto) {
          return istek('/rest/v1/profiller?id=eq.' + encodeURIComponent(s.user.id), {method: 'PATCH', token: s.at, prefer: 'return=minimal', body: {ad_soyad: ad || null, telefon: tel || null, foto_url: foto}})
            .then(function () { p.ad_soyad = ad; p.telefon = tel; p.foto_url = foto; });
        });
      }).then(function () {
        profilSoz = null; m.className = 'odeme-sonuc tamam'; m.textContent = 'Profilin kaydedildi.';
        var h = $('#hesap'); if (h) $('[data-hesap-ad]', h).textContent = p.ad_soyad || '';
        fotoGoster($('[data-hesap-foto]'), p.foto_url, p.ad_soyad || p.eposta); ustBar();
        setTimeout(function () { goster(false); }, 900);
      }).catch(function (e2) { m.className = 'odeme-sonuc hata'; m.textContent = hataYazi(e2); }).then(function () { btn.disabled = false; });
    });
  }
  // ---------- üyelik kilidi: korunan bölümleri üyenin anahtarıyla aç ----------
  function b64b(t) { var b = atob(t), x = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) x[i] = b.charCodeAt(i); return x; }
  var anahtarSoz = null;
  function anahtarlar() {
    if (anahtarSoz) return anahtarSoz;
    anahtarSoz = oturum().then(function (s) {
      if (!s) return {};
      return istek('/rest/v1/rpc/icerik_anahtarlarim', {method: 'POST', token: s.at, body: {}}).then(function (j) { return j || {}; }).catch(function () { return {}; });
    });
    return anahtarSoz;
  }
  var anahtarOnbellek = {};
  function anahtar(sev) {
    if (anahtarOnbellek[sev]) return anahtarOnbellek[sev];
    anahtarOnbellek[sev] = anahtarlar().then(function (k) {
      if (!k[sev] || !window.crypto || !crypto.subtle) return null;
      return crypto.subtle.importKey('raw', b64b(k[sev]), 'AES-GCM', false, ['decrypt']);
    }).catch(function () { return null; });
    return anahtarOnbellek[sev];
  }
  function coz(sev, iv, ct) {
    return anahtar(sev).then(function (key) {
      if (!key) return null;
      return crypto.subtle.decrypt({name: 'AES-GCM', iv: b64b(iv)}, key, b64b(ct)).then(function (b) { return new TextDecoder().decode(b); });
    }).catch(function () { return null; });
  }
  window.tjkdCoz = coz;
  function kilitBitti() { window.__tjkdAcildi = true; try { document.dispatchEvent(new Event('tjkd-acildi')); } catch (e) {} }
  function kilitAc() {
    var L = $$('.kilit[data-kilit]');
    if (!L.length) { kilitBitti(); return; }
    oturum().then(function (s) {
      if (s) L.forEach(function (el) { $$('[data-kilit-misafir]', el).forEach(function (x) { x.hidden = true; }); $$('[data-kilit-yukleniyor]', el).forEach(function (x) { x.hidden = false; }); });
      return Promise.all(L.map(function (el) {
        return coz(el.getAttribute('data-kilit'), el.getAttribute('data-iv'), el.getAttribute('data-ct')).then(function (h) {
          if (h == null) {
            $$('[data-kilit-yukleniyor]', el).forEach(function (x) { x.hidden = true; });
            if (s) $$('[data-kilit-uye]', el).forEach(function (x) { x.hidden = false; });
            return;
          }
          var t = document.createElement('template'); t.innerHTML = h; el.replaceWith(t.content);
        });
      }));
    }).then(kilitBitti, kilitBitti);
  }
  function denemeYaz() {
    anahtarlar().then(function (k) {
      var d = k && k._durum; if (!d) return;
      document.documentElement.classList.add('uye');
      if (d.premium) document.documentElement.classList.add('uye-premium');
      if (d.plus) document.documentElement.classList.add('uye-pp');
      /* yönetici kendi cihazında sayaca girmesin: bu tarayıcıda sayaç kalıcı kapanır (çerez sayfasındaki düğmeyle açılabilir) */
      if (d.admin) { try { if (localStorage.getItem('tjkd-z-kapali') !== '1') { localStorage.setItem('tjkd-z-kapali', '1'); localStorage.removeItem('tjkd-z-gordu'); } } catch (e) {} }
      $$('[data-uye-gizle]').forEach(function (x) { x.hidden = true; });
      if (d.deneme && d.deneme_bitis) {
        var gun = Math.max(1, Math.ceil((new Date(d.deneme_bitis) - new Date()) / 864e5));
        $$('[data-deneme]').forEach(function (x) { x.hidden = false; x.textContent = 'Ücretsiz Premium denemen: ' + gun + ' gün kaldı'; });
      }
    });
  }
  // ---------- arkadaşını davet et ----------
  function davetPanel() {
    var dk = davetKodu();
    $$('[data-davet-geldi]').forEach(function (x) { x.hidden = !dk; });
    var kutular = $$('[data-davet]'); if (!kutular.length) return;
    function yazMesaj(k, t) { var m = $('[data-davet-mesaj]', k); if (m) { m.textContent = t; clearTimeout(m._t); m._t = setTimeout(function () { m.textContent = ''; }, 6000); } }
    function kopyala(metin) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(metin);
      return new Promise(function (ok, red) { try { var t = document.createElement('textarea'); t.value = metin; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); var b = document.execCommand('copy'); t.remove(); b ? ok() : red(); } catch (e) { red(e); } });
    }
    oturum().then(function (s) {
      kutular.forEach(function (k) { $$('[data-davet-giris]', k).forEach(function (x) { x.hidden = !!s; }); });
      if (!s) return;
      return istek('/rest/v1/rpc/davet_kodum', {method: 'POST', token: s.at, body: {}}).then(function (j) {
        if (!j || !j.kod) throw new Error('kod yok');
        var link = location.origin + '/uye-ol/?ref=' + j.kod;
        var metin = "tjkdetay.com'da günlük at yarışı analizleri ve hazır kuponlar var. Bu linkle ücretsiz üye ol, 7 gün Premium'u dene: ";
        kutular.forEach(function (k) {
          $$('[data-davet-panel]', k).forEach(function (x) { x.hidden = false; });
          var inp = $('[data-davet-link]', k); if (inp) { inp.value = link.replace(/^https?:\/\//, ''); inp.addEventListener('focus', function () { inp.select(); }); }
          var wa = $('[data-davet-wa]', k); if (wa) { wa.href = 'https://wa.me/?text=' + encodeURIComponent(metin + link); wa.addEventListener('click', function () { olay('davet_paylas_wa'); }); }
          var ku = $('[data-davet-k-uye]', k), kg = $('[data-davet-k-gun]', k), kb2 = $('[data-davet-k-bek]', k);
          if (ku) ku.textContent = j.uye || 0; if (kg) kg.textContent = j.gun || 0; if (kb2) kb2.textContent = j.bekleyen || 0;
          var sy = $('[data-davet-sayi]', k);
          if (sy) sy.textContent = j.uye ? (j.uye + ' arkadaşın davetinle üye oldu · ' + (j.gun || 0) + ' gün Premium kazandın' + (j.bekleyen ? ' · ' + j.bekleyen + ' kişinin e-posta doğrulaması bekleniyor' : '') + '.') : 'Henüz davetinle gelen üye yok. Linkini paylaşarak ilk davetini gönderebilirsin.';
          var kb = $('[data-davet-kopya]', k);
          if (kb) kb.addEventListener('click', function () { kopyala(link).then(function () { yazMesaj(k, 'Link kopyalandı. İstediğin yere yapıştırıp paylaşabilirsin.'); olay('davet_kopya'); }, function () { if (inp) inp.select(); yazMesaj(k, 'Link seçildi; kopyalamak için Ctrl+C ya da uzun basıp Kopyala.'); }); });
          var ig = $('[data-davet-ig]', k);
          if (ig) ig.addEventListener('click', function () {
            olay('davet_paylas_ig');
            if (navigator.share) { navigator.share({title: 'tjkdetay.com', text: metin, url: link}).catch(function () {}); return; }
            kopyala(metin + link).then(function () { yazMesaj(k, "Link kopyalandı. Instagram'da hikâyene bağlantı çıkartmasıyla ya da mesajla yapıştır."); }, function () {});
            window.open('https://www.instagram.com/', '_blank', 'noopener');
          });
          var dg = $('[data-davet-paylas]', k);
          if (dg && navigator.share) { dg.hidden = false; dg.addEventListener('click', function () { olay('davet_paylas_diger'); navigator.share({title: 'tjkdetay.com', text: metin, url: link}).catch(function () {}); }); }
        });
      });
    }).catch(function () {
      kutular.forEach(function (k) { $$('[data-davet-panel]', k).forEach(function (x) { x.hidden = true; }); $$('[data-davet-yakinda]', k).forEach(function (x) { x.hidden = false; }); });
    });
  }
  // ---------- başlat ----------
  hashIsle().then(function (h) {
    if (h && h.hata) { ac('giris'); var f = pencere ? $('[data-form=giris]', pencere) : $('[data-form=giris]'); if (f) mesaj(f, h.hata, 'hata'); }
    else if (h && h.tur === 'recovery') { var k = sayfaForm || pencere; if (pencere && !sayfaForm) ac('yeni-sifre'); else if (k) sekme('yeni-sifre', k); }
    else if (h && (h.tur === 'signup' || h.tur === 'email' || h.tur === 'magiclink')) { profilSoz = null; }
    ustBar(); premiumSayfa(); duyuru(); sayac(); canli(); kilitAc(); denemeYaz(); davetPanel();
  }, function () { kilitAc(); });
  $$('[data-uye-cikis]').forEach(function (x) { x.addEventListener('click', function (e) { e.preventDefault(); cikis(); }); });

  // admin paneli ve modüller için ortak arayüz
  window.TJKD = {hazir: HAZIR, url: URL, istek: istek, oturum: oturum, rest: rest, fn: fn, olay: olay, profil: profil, premiumMu: premiumMu, hataYazi: hataYazi,
    formlariBagla: formlariBagla, sekme: sekme, mesaj: mesaj, cikis: cikis, kimlik: kimlik, ayarlar: ayarlar, tl: tl};
})();
