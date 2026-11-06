// Modül: Premium üyeler — aktif üyelikler, kalan gün, uzatma
TJKDAdmin.modul({
  id: 'premium', ad: 'Premium üyeler', grup: 'Üyelik', sira: 25,
  ikon: '<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8-4.3-4.1 5.9-.9z"/>',
  rozet: function (A) { return A.api.uyeler().then(function (U) { return U.filter(A.premiumMu).length || ''; }); },
  ciz: function (alan, A) {
    return Promise.all([A.api.uyeler(), A.api.siparisler()]).then(function (r) {
      var U = r[0] || [], S = r[1] || [];
      var simdi = Date.now();
      var P = U.filter(A.premiumMu).sort(function (a, b) { return new Date(a.premium_bitis || 8e15) - new Date(b.premium_bitis || 8e15); });
      var kalan = function (u) { return u.premium_bitis ? Math.max(0, Math.ceil((new Date(u.premium_bitis) - simdi) / 864e5)) : null; };
      var biten = U.filter(function (u) { return u.premium && u.premium_bitis && new Date(u.premium_bitis) <= simdi; });
      var sonSiparis = {}; S.forEach(function (s) { if (s.durum === 'odendi' && !sonSiparis[s.user_id]) sonSiparis[s.user_id] = s; });
      A.kpi(alan, [
        ['Aktif premium', P.length, 'altin'],
        ['7 gün içinde bitecek', P.filter(function (u) { var k = kalan(u); return k != null && k <= 7; }).length],
        ['Süresi dolmuş', biten.length],
        ['Ödemeyle gelen', P.filter(function (u) { return sonSiparis[u.id]; }).length]
      ]);
      var k = A.kutu(alan, 'Aktif premium üyeler');
      A.tablo(k, [
        {ad: 'Üye', deger: function (u) { return A.uyeAdi(u); }},
        {ad: 'Bitiş', deger: function (u) { return u.premium_bitis ? A.tarih(u.premium_bitis, 1) : 'Süresiz'; }},
        {ad: 'Kalan', deger: function (u) { var g = kalan(u); return g == null ? '—' : A.rozet(g + ' gün', g <= 7 ? 'bekliyor' : 'odendi'); }},
        {ad: 'Kaynak', deger: function (u) { var s = sonSiparis[u.id]; return s ? 'Ödeme · ' + (s.plan_ad || s.plan) : 'Elle tanımlandı'; }},
        {ad: 'İşlem', deger: function (u) {
          var d = A.el('div', 'ad-islem');
          var b = A.el('button', 'ad-dugme kucuk', '+30 gün'); b.type = 'button';
          b.addEventListener('click', function () {
            var g = (kalan(u) || 0) + 30;
            if (!confirm(u.eposta + ' üyeliği 30 gün uzatılsın mı?')) return;
            A.api.rpc('admin_premium_ayarla', {hedef: u.id, gun: g}).then(function () { A.bildir('Üyelik uzatıldı.', 'tamam'); A.yenile(); }).catch(function (e) { A.bildir(A.hata(e), 'hata'); });
          });
          d.appendChild(b); return d;
        }}
      ], P, 'Şu an aktif premium üye yok.');
      if (biten.length) {
        var k2 = A.kutu(alan, 'Süresi dolanlar (geri kazanılabilir)');
        A.tablo(k2, [
          {ad: 'Üye', deger: function (u) { return A.uyeAdi(u); }},
          {ad: 'Bitti', deger: function (u) { return A.tarih(u.premium_bitis, 1); }},
          {ad: 'Telefon', deger: function (u) { return u.telefon || '—'; }},
          {ad: 'İleti onayı', deger: function (u) { return u.ileti_onay ? 'Var' : 'Yok'; }}
        ], biten);
      }
    });
  }
});
