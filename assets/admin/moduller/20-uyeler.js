// Modül: Üyeler — arama, filtre, CSV, premium verme/kaldırma, şifre sıfırlama/değiştirme
TJKDAdmin.modul({
  id: 'uyeler', ad: 'Üyeler', grup: 'Üyelik', sira: 20,
  ikon: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 13.6c2.4.2 4 1.7 4.5 4.4"/>',
  rozet: function (A) { return A.api.uyeler().then(function (U) { return U.length || ''; }); },
  ciz: function (alan, A) {
    return Promise.all([A.api.uyeler(), A.api.olaylar()]).then(function (r) {
      var U = r[0] || [], O = r[1] || [];
      var son = {}, odemeci = {}; O.forEach(function (o) { if (!son[o.user_id]) son[o.user_id] = o; if (o.tur === 'odemeye_gecti' && !odemeci[o.user_id]) odemeci[o.user_id] = o; });
      var ust = A.el('div', 'ad-arac');
      var ara = A.el('input', 'ad-girdi'); ara.type = 'search'; ara.placeholder = 'Ad, e-posta ya da telefon ara'; ara.setAttribute('aria-label', 'Üye ara');
      var fil = A.el('select', 'ad-girdi'); [['', 'Tüm üyeler'], ['premium', 'Premium üyeler'], ['ucretsiz', 'Ücretsiz üyeler'], ['odeme', 'Ödemeye geçenler'], ['ileti', 'İleti onayı verenler'], ['kupon', 'Hazır kuponlardan gelenler']].forEach(function (x) { var o = A.el('option', '', x[1]); o.value = x[0]; fil.appendChild(o); });
      var say = A.el('span', 'ad-not');
      var csv = A.el('button', 'ad-dugme ikincil', 'CSV indir'); csv.type = 'button';
      [ara, fil, say, csv].forEach(function (x) { ust.appendChild(x); });
      var kutu = A.kutu(alan, 'Üye listesi'); kutu.appendChild(ust);
      var yer = A.el('div'); kutu.appendChild(yer);
      function liste() {
        var q = (ara.value || '').toLocaleLowerCase('tr-TR'), f = fil.value;
        return U.filter(function (u) {
          if (f === 'premium' && !A.premiumMu(u)) return false;
          if (f === 'ucretsiz' && A.premiumMu(u)) return false;
          if (f === 'odeme' && !odemeci[u.id]) return false;
          if (f === 'ileti' && !u.ileti_onay) return false;
          if (f === 'kupon' && u.kaynak !== 'kupon') return false;
          return !q || [u.ad_soyad, u.eposta, u.telefon].join(' ').toLocaleLowerCase('tr-TR').indexOf(q) >= 0;
        });
      }
      function islem(u) {
        var d = A.el('div', 'ad-islem');
        var sec = A.el('select', 'ad-girdi kucuk'); [[7, '7 gün'], [30, '30 gün'], [90, '90 gün'], [365, '1 yıl']].forEach(function (x) { var o = A.el('option', '', x[1]); o.value = x[0]; if (x[0] === 30) o.selected = true; sec.appendChild(o); });
        var ver = A.el('button', 'ad-dugme kucuk', A.premiumMu(u) ? 'Süreyi ayarla' : 'Premium ver'); ver.type = 'button';
        ver.addEventListener('click', function () {
          var gun = Number(sec.value);
          if (!confirm(u.eposta + ' için ' + gun + ' gün premium tanımlansın mı? (Bugünden başlar)')) return;
          ver.disabled = true;
          A.api.rpc('admin_premium_ayarla', {hedef: u.id, gun: gun}).then(function () { u.premium = true; u.premium_bitis = new Date(Date.now() + gun * 864e5).toISOString(); A.bildir('Premium tanımlandı: ' + u.eposta, 'tamam'); ciz(); })
            .catch(function (e) { A.bildir(A.hata(e), 'hata'); ver.disabled = false; });
        });
        d.appendChild(sec); d.appendChild(ver);
        // şifre işlemleri: önerilen yol sıfırlama e-postası; gerekirse admin yeni şifre belirler
        var sif = A.el('button', 'ad-dugme kucuk ikincil', 'Şifre sıfırlama e-postası'); sif.type = 'button';
        sif.title = 'Üyeye şifresini kendisinin belirleyeceği bir bağlantı gönderir (önerilen).';
        sif.addEventListener('click', function () {
          if (!confirm(u.eposta + ' adresine şifre sıfırlama bağlantısı gönderilsin mi?')) return;
          sif.disabled = true;
          window.TJKD.istek('/auth/v1/recover?redirect_to=' + encodeURIComponent(location.origin + '/uye-ol/'), {method: 'POST', body: {email: u.eposta}})
            .then(function () { A.bildir('Sıfırlama bağlantısı gönderildi: ' + u.eposta, 'tamam'); })
            .catch(function (e) { A.bildir(A.hata(e), 'hata'); }).then(function () { sif.disabled = false; });
        });
        var yeni = A.el('button', 'ad-dugme kucuk ikincil', 'Yeni şifre belirle'); yeni.type = 'button';
        yeni.title = 'Üyenin şifresini doğrudan değiştirir. Yeni şifreyi üyeye güvenli bir yoldan iletmen gerekir.';
        yeni.addEventListener('click', function () {
          var s1 = prompt(u.eposta + ' için yeni şifre (en az 8 karakter):'); if (s1 === null) return;
          if (s1.length < 8) { A.bildir('Şifre en az 8 karakter olmalı.', 'hata'); return; }
          var s2 = prompt('Yeni şifreyi tekrar yaz:'); if (s2 === null) return;
          if (s1 !== s2) { A.bildir('İki şifre aynı değil.', 'hata'); return; }
          yeni.disabled = true;
          A.api.rpc('admin_sifre_ayarla', {hedef: u.id, yeni: s1}).then(function () { A.bildir('Şifre güncellendi: ' + u.eposta + '. Yeni şifreyi üyeye güvenli bir yoldan ilet.', 'tamam'); })
            .catch(function (e) { A.bildir(A.hata(e), 'hata'); }).then(function () { yeni.disabled = false; });
        });
        d.appendChild(sif); d.appendChild(yeni);
        if (A.premiumMu(u)) {
          var kal = A.el('button', 'ad-dugme kucuk tehlike', 'Kaldır'); kal.type = 'button';
          kal.addEventListener('click', function () {
            if (!confirm(u.eposta + ' premium üyeliği kaldırılsın mı?')) return;
            A.api.rpc('admin_premium_ayarla', {hedef: u.id, gun: 0}).then(function () { u.premium = false; u.premium_bitis = null; A.bildir('Premium kaldırıldı.', 'tamam'); ciz(); }).catch(function (e) { A.bildir(A.hata(e), 'hata'); });
          });
          d.appendChild(kal);
        }
        return d;
      }
      function ciz() {
        var L = liste(); yer.textContent = ''; say.textContent = L.length + ' üye';
        A.tablo(yer, [
          {ad: 'Ad soyad', deger: function (u) { var w = A.el('span', 'ad-uye'); if (u.foto_url) { var i = A.el('img', 'ad-uye-foto'); i.src = u.foto_url; i.alt = ''; i.width = 28; i.height = 28; w.appendChild(i); } w.appendChild(document.createTextNode(u.ad_soyad || '—')); return w; }},
          {ad: 'E-posta', deger: function (u) { return u.eposta; }},
          {ad: 'Telefon', deger: function (u) { return u.telefon || '—'; }},
          {ad: 'Kayıt', deger: function (u) { return A.tarih(u.created_at); }},
          {ad: 'Durum', deger: function (u) { return A.premiumMu(u) ? A.rozet('Premium · ' + A.tarih(u.premium_bitis, 1), 'odendi') : A.rozet('Ücretsiz', ''); }},
          {ad: 'Ödemeye geçti', deger: function (u) { return odemeci[u.id] ? A.tarih(odemeci[u.id].created_at) : '—'; }},
          {ad: 'İleti onayı', deger: function (u) { return u.ileti_onay ? 'Var' : 'Yok'; }},
          {ad: 'Son hareket', deger: function (u) { return son[u.id] ? (A.OLAY_AD[son[u.id].tur] || son[u.id].tur) + ' · ' + A.tarih(son[u.id].created_at) : '—'; }},
          {ad: 'İşlem', deger: islem}
        ], L, 'Bu filtreye uyan üye yok.');
      }
      ara.addEventListener('input', ciz); fil.addEventListener('change', ciz);
      csv.addEventListener('click', function () {
        A.csv('tjkdetay-uyeler', [['Ad soyad', 'E-posta', 'Telefon', 'Kayıt', 'Premium', 'Premium bitiş', 'Ödemeye geçti', 'İleti onayı', 'Kaynak']].concat(liste().map(function (u) {
          return [u.ad_soyad, u.eposta, u.telefon, u.created_at, A.premiumMu(u) ? 'evet' : 'hayır', u.premium_bitis || '', odemeci[u.id] ? 'evet' : 'hayır', u.ileti_onay ? 'evet' : 'hayır', u.kaynak || ''];
        })));
      });
      ciz();
    });
  }
});
