// Modül: Genel bakış — temel sayılar, premium hunisi, son hareketler ve siparişler
TJKDAdmin.modul({
  id: 'genel', ad: 'Genel bakış', grup: 'Genel', sira: 10,
  ikon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  ciz: function (alan, A) {
    return Promise.all([A.api.uyeler(), A.api.olaylar(), A.api.siparisler()]).then(function (r) {
      var U = r[0] || [], O = r[1] || [], S = r[2] || [];
      var byId = {}; U.forEach(function (u) { byId[u.id] = u; });
      var kim = function (tur) { var s = {}; O.forEach(function (o) { if (o.tur === tur) s[o.user_id] = 1; }); return Object.keys(s).length; };
      var hafta = Date.now() - 7 * 864e5, ay = new Date(); ay.setDate(1); ay.setHours(0, 0, 0, 0);
      var premiumN = U.filter(A.premiumMu).length;
      var odenen = S.filter(function (s) { return s.durum === 'odendi' && !s.test; });
      var buAy = odenen.filter(function (s) { return new Date(s.odendi_at || s.created_at) >= ay; }).reduce(function (t, s) { return t + (s.odeme_tutari_kurus || s.tutar_kurus || 0); }, 0);
      A.kpi(alan, [
        ['Toplam üye', U.length],
        ['Son 7 günde yeni üye', U.filter(function (u) { return new Date(u.created_at) > hafta; }).length],
        ['Aktif premium üye', premiumN, 'altin'],
        ['Ödemeye geçen', kim('odemeye_gecti')],
        ['Bu ay tahsilat', A.tl(buAy), 'yesil'],
        ['Bekleyen sipariş', S.filter(function (s) { return s.durum === 'bekliyor'; }).length]
      ]);
      var huni = A.kutu(alan, 'Premium hunisi');
      var adim = [['Üye oldu', U.length], ['Premium sayfasını gördü', kim('premium_sayfasi')], ['Ödemeye geçti', kim('odemeye_gecti')], ['Ödemeyi tamamladı', kim('odeme_tamam')], ['Şu an premium', premiumN]];
      var en = Math.max(1, U.length);
      adim.forEach(function (a) {
        var s = A.el('div', 'ad-huni'); s.appendChild(A.el('span', 'ad-huni-ad', a[0]));
        var c = A.el('span', 'ad-huni-cubuk'); var i = A.el('i'); i.style.width = Math.round(100 * a[1] / en) + '%'; c.appendChild(i); s.appendChild(c);
        s.appendChild(A.el('b', '', a[1] + ' · %' + Math.round(100 * a[1] / en))); huni.appendChild(s);
      });
      var iki = A.el('div', 'ad-iki'); alan.appendChild(iki);
      var k1 = A.kutu(iki, 'Son hareketler', (function () { var a = A.el('a', 'ad-link', 'Tümü →'); a.href = '#hareketler'; return a; })());
      A.tablo(k1, [
        {ad: 'Zaman', deger: function (o) { return A.tarih(o.created_at); }},
        {ad: 'Üye', deger: function (o) { return A.uyeAdi(byId[o.user_id]); }},
        {ad: 'Hareket', deger: function (o) { return A.OLAY_AD[o.tur] || o.tur; }}
      ], O.slice(0, 10), 'Henüz hareket yok.');
      var k2 = A.kutu(iki, 'Son siparişler', (function () { var a = A.el('a', 'ad-link', 'Tümü →'); a.href = '#siparisler'; return a; })());
      A.tablo(k2, [
        {ad: 'Tarih', deger: function (s) { return A.tarih(s.created_at); }},
        {ad: 'Üye', deger: function (s) { return A.uyeAdi(byId[s.user_id]); }},
        {ad: 'Tutar', deger: function (s) { return A.tl(s.tutar_kurus); }, sinif: 'sag'},
        {ad: 'Durum', deger: function (s) { return A.rozet(A.DURUM_AD[s.durum] || s.durum, s.durum); }}
      ], S.slice(0, 6), 'Henüz sipariş yok.');
    });
  }
});
