// Modül: Ziyaretçi istatistikleri — çerezsiz sayaç (supabase_v3.sql: ziyaretler + admin_ziyaret_ozet)
TJKDAdmin.modul({
  id: 'ziyaret', ad: 'Ziyaretçiler', grup: 'Genel', sira: 15,
  ikon: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  ciz: function (alan, A) {
    var el = A.el;
    var gun = Number(sessionStorage.getItem('ad-ziyaret-gun')) || 30;
    var SAYFA_AD = {'/': 'Ana sayfa · Günün özeti', '/kosular/': 'Koşular', '/sonuclar/': 'Sonuçlar', '/program/': 'Yarış programı', '/muhtemel-agf/': 'Muhtemel ve AGF',
      '/canli/': 'Canlı yayın', '/performans/': 'Performans', '/premium/': 'Premium', '/uye-ol/': 'Üye ol', '/kampanyalar/': 'Kampanyalar', '/hakkimizda/': 'Hakkımızda',
      '/sozluk/': 'Sözlük', '/jokeyler/': 'Jokeyler', '/rehber/': 'Rehber'};
    function say(n) { return Number(n || 0).toLocaleString('tr-TR'); }
    function yuzde(a, b) { return b ? '%' + Math.round(a * 100 / b) : '—'; }
    function svg(ad, ozl) { var e = document.createElementNS('http://www.w3.org/2000/svg', ad); for (var k in ozl) e.setAttribute(k, ozl[k]); return e; }

    // dönem seçici
    var arac = el('div', 'ad-arac');
    [[1, 'Bugün'], [7, '7 gün'], [30, '30 gün'], [90, '90 gün'], [365, '1 yıl']].forEach(function (x) {
      var b = el('button', 'ad-dugme kucuk' + (x[0] === gun ? '' : ' ikincil'), x[1]); b.type = 'button';
      b.addEventListener('click', function () { sessionStorage.setItem('ad-ziyaret-gun', x[0]); A.yenile(); });
      arac.appendChild(b);
    });
    alan.appendChild(arac);

    return A.api.rpc('admin_ziyaret_ozet', {gun: gun}).then(function (o) {
      o = o || {};
      A.kpi(alan, [
        ['Şu an sitede (son 5 dk)', say(o.simdi), 'canli'],
        ['Bugün tekil ziyaretçi', say(o.bugun_tekil)],
        ['Bugün sayfa görüntüleme', say(o.bugun)],
        [(gun === 1 ? 'Bugün' : 'Son ' + gun + ' gün') + ' tekil ziyaretçi', say(o.tekil)],
        [(gun === 1 ? 'Bugün' : 'Son ' + gun + ' gün') + ' sayfa görüntüleme', say(o.toplam)],
        ['Ziyaret başına sayfa', o.tekil ? (o.toplam / o.tekil).toLocaleString('tr-TR', {maximumFractionDigits: 1}) : '—'],
        ['İlk kez gelen ziyaretçi', yuzde(o.yeni, o.tekil)],
        ['Üye girişliyken görüntüleme', yuzde(o.uye_sayfa, o.toplam)]
      ]);

      // günlük grafik
      var g = A.kutu(alan, gun === 1 ? 'Bugün saat saat' : 'Gün gün ziyaret');
      var veri = gun === 1 ? (o.saatler || []).map(function (x) { return {et: x.saat + ':00', a: x.sayfa, b: 0}; }) : (o.gunluk || []).map(function (x) { return {et: x.gun.slice(8, 10) + '.' + x.gun.slice(5, 7), a: x.sayfa, b: x.tekil}; });
      if (!veri.length) { g.appendChild(el('p', 'ad-not', 'Bu dönemde kayıt yok. Sayaç yeni kuruldu; ziyaretler geldikçe grafik dolacak.')); }
      else {
        var W = 760, H = 220, P = 28, maks = Math.max.apply(null, veri.map(function (x) { return x.a; })) || 1;
        var s = svg('svg', {viewBox: '0 0 ' + W + ' ' + H, class: 'ad-grafik', role: 'img', 'aria-label': 'Ziyaret grafiği'});
        [0, .5, 1].forEach(function (t) { var y = H - P - t * (H - P * 2); s.appendChild(svg('line', {x1: P, x2: W - 6, y1: y, y2: y, class: 'ad-g-cizgi'})); var tx = svg('text', {x: 2, y: y + 4, class: 'ad-g-yazi'}); tx.textContent = Math.round(maks * t); s.appendChild(tx); });
        var adim = (W - P - 10) / veri.length, gen = Math.max(3, Math.min(26, adim * .62));
        veri.forEach(function (x, i) {
          var cx = P + adim * i + adim / 2, ha = (x.a / maks) * (H - P * 2), hb = (x.b / maks) * (H - P * 2);
          var r = svg('rect', {x: cx - gen / 2, y: H - P - ha, width: gen, height: Math.max(ha, 1), rx: 3, class: 'ad-g-sutun'});
          var tt = svg('title', {}); tt.textContent = x.et + ': ' + say(x.a) + ' sayfa' + (x.b ? ', ' + say(x.b) + ' tekil' : ''); r.appendChild(tt); s.appendChild(r);
          if (x.b) s.appendChild(svg('rect', {x: cx - gen / 2, y: H - P - hb, width: gen, height: Math.max(hb, 1), rx: 3, class: 'ad-g-sutun2'}));
          if (veri.length <= 31 && (veri.length <= 12 || i % Math.ceil(veri.length / 10) === 0)) { var e = svg('text', {x: cx, y: H - 8, 'text-anchor': 'middle', class: 'ad-g-yazi'}); e.textContent = x.et; s.appendChild(e); }
        });
        g.appendChild(s);
        var lj = el('p', 'ad-not'); lj.innerHTML = '<i class="ad-lej a"></i> Sayfa görüntüleme' + (gun === 1 ? '' : ' &nbsp; <i class="ad-lej b"></i> Tekil ziyaretçi');
        g.appendChild(lj);
      }

      var iki = el('div', 'ad-iki'); alan.appendChild(iki);
      var k1 = A.kutu(iki, 'En çok görüntülenen sayfalar');
      A.tablo(k1, [
        {ad: 'Sayfa', deger: function (r) { var a = el('a', '', SAYFA_AD[r.yol] || r.yol); a.href = r.yol; a.target = '_blank'; a.rel = 'noopener'; return a; }},
        {ad: 'Görüntüleme', deger: function (r) { return say(r.sayi); }, sinif: 'sag'},
        {ad: 'Tekil', deger: function (r) { return say(r.tekil); }, sinif: 'sag'}
      ], o.sayfalar || [], 'Henüz kayıt yok.');
      var k2 = A.kutu(iki, 'Nereden geldiler');
      A.tablo(k2, [
        {ad: 'Kaynak', deger: function (r) { return r.kaynak; }},
        {ad: 'Ziyaretçi', deger: function (r) { return say(r.sayi); }, sinif: 'sag'},
        {ad: 'Pay', deger: function (r) { return yuzde(r.sayi, o.tekil); }, sinif: 'sag'}
      ], o.kaynaklar || [], 'Henüz kayıt yok.');

      var k3 = A.kutu(alan, 'Cihaz');
      var c = o.cihazlar || {}, top = (c.mobil || 0) + (c.masaustu || 0) + (c.tablet || 0) + (c.diger || 0);
      [['mobil', 'Mobil'], ['masaustu', 'Masaüstü'], ['tablet', 'Tablet'], ['diger', 'Diğer']].forEach(function (x) {
        if (!c[x[0]] && x[0] === 'diger') return;
        var sat = el('div', 'ad-huni');
        sat.appendChild(el('span', '', x[1]));
        var bar = el('span', 'ad-huni-cubuk'); var ic = el('i'); ic.style.width = (top ? (c[x[0]] || 0) * 100 / top : 0) + '%'; bar.appendChild(ic); sat.appendChild(bar);
        sat.appendChild(el('b', '', say(c[x[0]]) + ' · ' + yuzde(c[x[0]] || 0, top)));
        k3.appendChild(sat);
      });

      var k4 = A.kutu(alan, 'Nasıl sayılıyor?');
      k4.appendChild(el('p', 'ad-not', 'Sayaç çerez kullanmaz ve IP adresi saklamaz. Ziyaretçi, tarayıcı sekmesi açık kaldığı sürece aynı kişi sayılır (sessionStorage). Admin sayfaları, arama motoru botları ve "Do Not Track / Global Privacy Control" açık olan tarayıcılar sayılmaz. Reklam tıklamaları (utm_source, fbclid, gclid) kaynakta ayrı görünür. Kayıtlar 13 ay saklanır.'));
      var csvB = el('button', 'ad-dugme ikincil', 'Günlük veriyi CSV indir'); csvB.type = 'button';
      csvB.addEventListener('click', function () { A.csv('ziyaret-gunluk', [['Gün', 'Sayfa', 'Tekil']].concat((o.gunluk || []).map(function (x) { return [x.gun, x.sayfa, x.tekil]; }))); });
      k4.appendChild(csvB);
    });
  }
});
