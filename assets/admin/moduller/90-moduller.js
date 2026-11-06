// Modül: Modüller — yüklü modülleri listeler, açıp kapatır
TJKDAdmin.modul({
  id: 'moduller', ad: 'Modüller', grup: 'Ayarlar', sira: 90,
  ikon: '<path d="M10 3H5a2 2 0 0 0-2 2v5h3a2 2 0 1 1 0 4H3v5a2 2 0 0 0 2 2h5v-3a2 2 0 1 1 4 0v3h5a2 2 0 0 0 2-2v-5h-3a2 2 0 1 1 0-4h3V5a2 2 0 0 0-2-2h-5v3a2 2 0 1 1-4 0z"/>',
  ciz: function (alan, A) {
    var SABIT = {genel: 1, moduller: 1};
    var k = A.kutu(alan, 'Yüklü modüller');
    k.appendChild(A.el('p', 'ad-not', 'Her sekme bir modüldür. Kapattığınız modül menüden kalkar; verisi silinmez, istediğiniz zaman geri açabilirsiniz.'));
    var liste = A.el('div', 'ad-modul-liste'); k.appendChild(liste);
    A.tumModuller().sort(function (a, b) { return (a.sira || 50) - (b.sira || 50); }).forEach(function (m) {
      var r = A.el('label', 'ad-anahtar ad-modul-satir');
      var c = A.el('input'); c.type = 'checkbox'; c.checked = !A.kapaliMi(m.id); c.disabled = !!SABIT[m.id];
      var t = A.el('span'); t.appendChild(A.el('b', '', m.ad)); t.appendChild(A.el('small', '', (m.grup || 'Genel') + ' · ' + m.id + (SABIT[m.id] ? ' · her zaman açık' : '')));
      r.appendChild(c); r.appendChild(A.el('i')); r.appendChild(t);
      c.addEventListener('change', function () {
        A.kapaliAyarla(m.id, !c.checked);
        var kapali = A.tumModuller().filter(function (x) { return A.kapaliMi(x.id); }).map(function (x) { return x.id; });
        A.api.ayarKaydet('admin_moduller', {kapali: kapali}, false).then(function () { A.menuCiz(); A.bildir(m.ad + (c.checked ? ' açıldı.' : ' kapatıldı.'), 'tamam'); }).catch(function (e) { A.bildir(A.hata(e), 'hata'); });
      });
      liste.appendChild(r);
    });
    var k2 = A.kutu(alan, 'Yeni modül eklemek');
    var ol = A.el('ol', 'ad-adimlar');
    ['assets/admin/moduller/ klasörüne 70-ornek.js gibi bir dosya eklenir (baştaki sayı menüdeki sırayı belirler).',
     'Dosya TJKDAdmin.modul({ id, ad, grup, ikon, ciz }) ile kendini kaydeder; ciz(alan, A) sekmenin içeriğini çizer.',
     'Site yeniden yayımlanınca modül sol menüde görünür ve buradan açılıp kapatılabilir.'].forEach(function (t) { ol.appendChild(A.el('li', '', t)); });
    k2.appendChild(ol);
  }
});
