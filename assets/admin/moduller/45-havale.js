// Modül: Ödeme bildirimleri — Havale/EFT siparişleri. Hesaba gelen ödemeyi kontrol et → "Onayla" → üyenin Premium süresi işlenir.
TJKDAdmin.modul({
  id: 'havale', ad: 'Ödeme bildirimleri', grup: 'Satış', sira: 45,
  ikon: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  rozet: function (A) {
    return A.api.siparisler().then(function (S) {
      return S.filter(function (s) { return s.yontem === 'havale' && s.durum === 'bekliyor' && s.bildirim_at; }).length || '';
    });
  },
  ciz: function (alan, A) {
    return Promise.all([A.api.uyeler(), A.api.siparisler(true)]).then(function (r) {
      var U = r[0] || [], S = (r[1] || []).filter(function (s) { return s.yontem === 'havale'; });
      var byId = {}; U.forEach(function (u) { byId[u.id] = u; });
      var bildirilen = S.filter(function (s) { return s.durum === 'bekliyor' && s.bildirim_at; });
      var bekleyen = S.filter(function (s) { return s.durum === 'bekliyor' && !s.bildirim_at; });
      var onayli = S.filter(function (s) { return s.durum === 'odendi'; });
      A.kpi(alan, [
        ['Onay bekleyen bildirim', bildirilen.length, bildirilen.length ? 'altin' : ''],
        ['Kod alıp bildirmeyen', bekleyen.length],
        ['Onaylanan havale', onayli.length, 'yesil'],
        ['Havale tahsilatı', A.tl(onayli.reduce(function (t, s) { return t + (s.odeme_tutari_kurus || s.tutar_kurus || 0); }, 0))]
      ]);
      var k = A.kutu(alan, 'Havale / EFT bildirimleri');
      k.appendChild(A.el('p', 'ad-not', 'Banka hesabında açıklaması sipariş koduyla (H-XXXXXX) eşleşen ve tutarı tutan ödemeyi gördükten sonra "Onayla"ya basın. Onaylanınca üyenin Premium süresi işlenir (bitmemiş süresi varsa üstüne eklenir). Para gelmediyse "Reddet".'));
      var fil = A.el('select', 'ad-girdi');
      [['bildirim', 'Onay bekleyen bildirimler'], ['kod', 'Kod alıp bildirmeyenler'], ['odendi', 'Onaylananlar'], ['iptal', 'Reddedilen / iptal'], ['', 'Tümü']].forEach(function (x) { var o = A.el('option', '', x[1]); o.value = x[0]; fil.appendChild(o); });
      var ust = A.el('div', 'ad-arac'); ust.appendChild(fil); k.appendChild(ust);
      var yer = A.el('div'); k.appendChild(yer);
      function liste() {
        return S.filter(function (s) {
          if (fil.value === 'bildirim') return s.durum === 'bekliyor' && s.bildirim_at;
          if (fil.value === 'kod') return s.durum === 'bekliyor' && !s.bildirim_at;
          return !fil.value || s.durum === fil.value;
        });
      }
      function ciz() {
        yer.textContent = '';
        A.tablo(yer, [
          {ad: 'Bildirim', deger: function (s) { return s.bildirim_at ? A.tarih(s.bildirim_at) : '—'; }},
          {ad: 'Açıklama kodu', deger: function (s) { return s.oid; }, sinif: 'mono'},
          {ad: 'Tutar', deger: function (s) { return A.tl(s.tutar_kurus); }, sinif: 'sag'},
          {ad: 'Gönderen', deger: function (s) { return s.gonderen || '—'; }},
          {ad: 'Üye', deger: function (s) { return A.uyeAdi(byId[s.user_id]); }},
          {ad: 'Plan', deger: function (s) { return (s.plan_ad || s.plan) + ' · ' + s.gun + ' gün'; }},
          {ad: 'Durum', deger: function (s) { return A.rozet(s.durum === 'bekliyor' ? (s.bildirim_at ? 'Bildirildi' : 'Kod alındı') : (A.DURUM_AD[s.durum] || s.durum), s.durum); }},
          {ad: '', deger: function (s) {
            if (s.durum !== 'bekliyor') return s.odendi_at ? 'Onay: ' + A.tarih(s.odendi_at) : '';
            var d = A.el('div', 'ad-arac');
            var ok = A.el('button', 'ad-dugme kucuk', 'Onayla'); ok.type = 'button';
            ok.addEventListener('click', function () {
              if (!confirm(s.oid + ' · ' + A.tl(s.tutar_kurus) + ' hesaba geldi mi? Onaylarsanız üyeye ' + s.gun + ' gün Premium tanımlanır.')) return;
              ok.disabled = true;
              A.api.rpc('admin_havale_onayla', {p_oid: s.oid}).then(function () { s.durum = 'odendi'; s.odendi_at = new Date().toISOString(); A.bildir('Onaylandı, Premium tanımlandı.', 'tamam'); A.api.temizle(); ciz(); })
                .catch(function (e) { ok.disabled = false; A.bildir(A.hata(e), 'hata'); });
            });
            var red = A.el('button', 'ad-dugme kucuk ikincil', 'Reddet'); red.type = 'button';
            red.addEventListener('click', function () {
              if (!confirm(s.oid + ' reddedilsin mi? (Para hesaba gelmediyse.)')) return;
              A.api.rpc('admin_siparis_durum', {siparis_oid: s.oid, yeni_durum: 'iptal'}).then(function () { s.durum = 'iptal'; A.bildir('Bildirim reddedildi.', 'tamam'); A.api.temizle(); ciz(); })
                .catch(function (e) { A.bildir(A.hata(e), 'hata'); });
            });
            d.appendChild(ok); d.appendChild(red); return d;
          }}
        ], liste(), 'Bu filtrede kayıt yok.');
      }
      fil.addEventListener('change', ciz);
      ciz();
    });
  }
});
