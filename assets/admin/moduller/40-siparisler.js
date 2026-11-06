// Modül: Siparişler — tüm ödeme denemeleri, durum filtresi, tahsilat toplamları
TJKDAdmin.modul({
  id: 'siparisler', ad: 'Siparişler', grup: 'Satış', sira: 40,
  ikon: '<path d="M4 7h16l-1.5 11.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  rozet: function (A) { return A.api.siparisler().then(function (S) { return S.filter(function (s) { return s.durum === 'bekliyor'; }).length || ''; }); },
  ciz: function (alan, A) {
    return Promise.all([A.api.uyeler(), A.api.siparisler()]).then(function (r) {
      var U = r[0] || [], S = r[1] || [];
      var byId = {}; U.forEach(function (u) { byId[u.id] = u; });
      var gercek = S.filter(function (s) { return s.durum === 'odendi' && !s.test; });
      var toplam = gercek.reduce(function (t, s) { return t + (s.odeme_tutari_kurus || s.tutar_kurus || 0); }, 0);
      A.kpi(alan, [
        ['Toplam tahsilat', A.tl(toplam), 'yesil'],
        ['Ödenen sipariş', gercek.length],
        ['Bekleyen', S.filter(function (s) { return s.durum === 'bekliyor'; }).length],
        ['Başarısız', S.filter(function (s) { return s.durum === 'basarisiz'; }).length],
        ['Test ödemesi', S.filter(function (s) { return s.test; }).length]
      ]);
      var ust = A.el('div', 'ad-arac');
      var fil = A.el('select', 'ad-girdi'); [['', 'Tüm siparişler'], ['odendi', 'Ödendi'], ['bekliyor', 'Bekliyor'], ['basarisiz', 'Başarısız'], ['iptal', 'İptal']].forEach(function (x) { var o = A.el('option', '', x[1]); o.value = x[0]; fil.appendChild(o); });
      var csv = A.el('button', 'ad-dugme ikincil', 'CSV indir'); csv.type = 'button';
      ust.appendChild(fil); ust.appendChild(csv);
      var k = A.kutu(alan, 'Sipariş listesi'); k.appendChild(ust); var yer = A.el('div'); k.appendChild(yer);
      var liste = function () { return S.filter(function (s) { return !fil.value || s.durum === fil.value; }); };
      function ciz() {
        yer.textContent = '';
        A.tablo(yer, [
          {ad: 'Tarih', deger: function (s) { return A.tarih(s.created_at); }},
          {ad: 'Sipariş no', deger: function (s) { return s.oid; }, sinif: 'mono'},
          {ad: 'Üye', deger: function (s) { return A.uyeAdi(byId[s.user_id]); }},
          {ad: 'Plan', deger: function (s) { return (s.plan_ad || s.plan) + ' · ' + s.gun + ' gün'; }},
          {ad: 'Tutar', deger: function (s) { return A.tl(s.odeme_tutari_kurus || s.tutar_kurus); }, sinif: 'sag'},
          {ad: 'Yöntem', deger: function (s) { return (s.yontem || '').toUpperCase() + (s.odeme_tipi ? ' · ' + s.odeme_tipi : ''); }},
          {ad: 'Durum', deger: function (s) { var d = A.el('span'); d.appendChild(A.rozet(A.DURUM_AD[s.durum] || s.durum, s.durum)); if (s.test) d.appendChild(A.rozet('TEST', 'test')); return d; }},
          {ad: 'Not', deger: function (s) { return s.hata || (s.odendi_at ? 'Onay: ' + A.tarih(s.odendi_at) : ''); }},
          {ad: '', deger: function (s) {
            if (s.durum !== 'bekliyor') return '';
            var b = A.el('button', 'ad-dugme kucuk ikincil', 'İptal et'); b.type = 'button';
            b.addEventListener('click', function () {
              if (!confirm(s.oid + ' iptal olarak işaretlensin mi? (Para çekilmediyse kullanın.)')) return;
              A.api.rpc('admin_siparis_durum', {siparis_oid: s.oid, yeni_durum: 'iptal'}).then(function () { s.durum = 'iptal'; A.bildir('Sipariş iptal edildi.', 'tamam'); ciz(); }).catch(function (e) { A.bildir(A.hata(e), 'hata'); });
            });
            return b;
          }}
        ], liste(), 'Henüz sipariş yok. PayTR açılınca ödemeler burada görünür.');
      }
      fil.addEventListener('change', ciz);
      csv.addEventListener('click', function () {
        A.csv('tjkdetay-siparisler', [['Tarih', 'Sipariş no', 'Ad soyad', 'E-posta', 'Plan', 'Gün', 'Tutar (TL)', 'Durum', 'Test', 'Ödeme tarihi']].concat(liste().map(function (s) {
          var u = byId[s.user_id] || {}; return [s.created_at, s.oid, u.ad_soyad, u.eposta, s.plan_ad || s.plan, s.gun, ((s.odeme_tutari_kurus || s.tutar_kurus) / 100).toFixed(2).replace('.', ','), A.DURUM_AD[s.durum] || s.durum, s.test ? 'evet' : 'hayır', s.odendi_at || ''];
        })));
      });
      ciz();
    });
  }
});
