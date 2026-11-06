// Modül: Hareketler — kayıt, giriş, kupon tıklaması, premium sayfası, ödeme adımları
TJKDAdmin.modul({
  id: 'hareketler', ad: 'Hareketler', grup: 'Üyelik', sira: 30,
  ikon: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  ciz: function (alan, A) {
    return Promise.all([A.api.uyeler(), A.api.olaylar()]).then(function (r) {
      var U = r[0] || [], O = r[1] || [];
      var byId = {}; U.forEach(function (u) { byId[u.id] = u; });
      var ust = A.el('div', 'ad-arac');
      var fil = A.el('select', 'ad-girdi'); var o0 = A.el('option', '', 'Tüm hareketler'); o0.value = ''; fil.appendChild(o0);
      Object.keys(A.OLAY_AD).forEach(function (k) { var o = A.el('option', '', A.OLAY_AD[k]); o.value = k; fil.appendChild(o); });
      var say = A.el('span', 'ad-not'); ust.appendChild(fil); ust.appendChild(say);
      var k = A.kutu(alan, 'Hareket kaydı'); k.appendChild(ust); var yer = A.el('div'); k.appendChild(yer);
      function ciz() {
        var L = O.filter(function (o) { return !fil.value || o.tur === fil.value; }).slice(0, 1000);
        yer.textContent = ''; say.textContent = L.length + ' kayıt' + (L.length === 1000 ? ' (son 1000)' : '');
        L.forEach(function (o) { if (o.tur === 'odemeye_gecti' || o.tur === 'odeme_tamam') o.__sinif = 'vurgu'; });
        A.tablo(yer, [
          {ad: 'Zaman', deger: function (o) { return A.tarih(o.created_at); }},
          {ad: 'Üye', deger: function (o) { return A.uyeAdi(byId[o.user_id]); }},
          {ad: 'Hareket', deger: function (o) { return A.OLAY_AD[o.tur] || o.tur; }},
          {ad: 'Plan', deger: function (o) { return o.plan || ''; }},
          {ad: 'Sayfa / kaynak', deger: function (o) { return o.sayfa || ''; }}
        ], L, 'Kayıt yok.');
      }
      fil.addEventListener('change', ciz); ciz();
    });
  }
});
