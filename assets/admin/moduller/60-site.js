// Modül: Site ayarları — premium planları (ad, süre, fiyat) ve duyuru şeridi
TJKDAdmin.modul({
  id: 'site', ad: 'Site ayarları', grup: 'Ayarlar', sira: 60,
  ikon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  ciz: function (alan, A) {
    return A.api.ayarlar(true).then(function (ay) {
      // --- premium planları ---
      var planlar = JSON.parse(JSON.stringify(Array.isArray(ay.premium_planlar) ? ay.premium_planlar : []));
      var k = A.kutu(alan, 'Premium planları');
      k.appendChild(A.el('p', 'ad-not', 'Fiyatlar KDV dahil TL\'dir. Fiyatı 0 olan plan sitede "Fiyat yakında" görünür ve satın alınamaz. Değişiklikler premium sayfasına hemen yansır.'));
      var tablo = A.el('div', 'ad-planlar'); k.appendChild(tablo);
      function plCiz() {
        tablo.textContent = '';
        var bas = A.el('div', 'ad-plan bas'); ['Plan adı', 'Süre (gün)', 'Fiyat (TL)', 'Öne çıkan', 'Sitede', ''].forEach(function (t) { bas.appendChild(A.el('span', '', t)); }); tablo.appendChild(bas);
        planlar.forEach(function (p, i) {
          var r = A.el('div', 'ad-plan');
          var ad = A.el('input', 'ad-girdi'); ad.value = p.ad || ''; ad.addEventListener('input', function () { p.ad = ad.value; });
          var gun = A.el('input', 'ad-girdi'); gun.type = 'number'; gun.min = 1; gun.value = p.gun || 30; gun.addEventListener('input', function () { p.gun = Math.max(1, parseInt(gun.value, 10) || 1); });
          var fy = A.el('input', 'ad-girdi'); fy.type = 'number'; fy.min = 0; fy.step = '0.01'; fy.value = p.fiyat || 0; fy.addEventListener('input', function () { p.fiyat = Math.max(0, Number(fy.value) || 0); });
          var one = A.el('input'); one.type = 'radio'; one.name = 'one_cikan'; one.checked = !!p.one_cikan; one.addEventListener('change', function () { planlar.forEach(function (x) { x.one_cikan = false; }); p.one_cikan = true; });
          var akt = A.el('input'); akt.type = 'checkbox'; akt.checked = p.aktif !== false; akt.addEventListener('change', function () { p.aktif = akt.checked; });
          var sil = A.el('button', 'ad-dugme kucuk tehlike', 'Sil'); sil.type = 'button'; sil.addEventListener('click', function () { if (confirm('"' + (p.ad || 'plan') + '" silinsin mi?')) { planlar.splice(i, 1); plCiz(); } });
          [ad, gun, fy, one, akt, sil].forEach(function (x, j) { var c = A.el('span'); c.appendChild(x); if (j >= 3 && j <= 4) c.className = 'orta'; r.appendChild(c); });
          tablo.appendChild(r);
        });
      }
      plCiz();
      var alt = A.el('div', 'ad-arac');
      var ekle = A.el('button', 'ad-dugme ikincil', '+ Plan ekle'); ekle.type = 'button';
      ekle.addEventListener('click', function () { planlar.push({kod: 'plan' + Date.now().toString(36), ad: 'Yeni plan', gun: 30, fiyat: 0, aktif: true, one_cikan: false}); plCiz(); });
      var kd = A.el('button', 'ad-dugme', 'Planları kaydet'); kd.type = 'button';
      kd.addEventListener('click', function () {
        for (var i = 0; i < planlar.length; i++) { if (!String(planlar[i].ad || '').trim()) { A.bildir('Plan adı boş olamaz.', 'hata'); return; } }
        kd.disabled = true;
        A.api.ayarKaydet('premium_planlar', planlar, true).then(function () { A.bildir('Planlar kaydedildi.', 'tamam'); }).catch(function (e) { A.bildir(A.hata(e), 'hata'); }).then(function () { kd.disabled = false; });
      });
      alt.appendChild(ekle); alt.appendChild(kd); k.appendChild(alt);

      // --- duyuru şeridi ---
      var site = Object.assign({duyuru: '', duyuru_link: '', duyuru_aktif: false}, ay.site || {});
      var k2 = A.kutu(alan, 'Duyuru şeridi');
      k2.appendChild(A.el('p', 'ad-not', 'Açıkken sitenin en üstünde, tüm sayfalarda ince bir şerit olarak görünür. Örnek: "Premium üyelik açıldı, ilk hafta indirimli."'));
      var f = A.el('div', 'ad-form'); k2.appendChild(f);
      var l1 = A.el('label', 'ad-alan'); l1.appendChild(A.el('span', '', 'Duyuru metni')); var t1 = A.el('input', 'ad-girdi'); t1.maxLength = 160; t1.value = site.duyuru; t1.addEventListener('input', function () { site.duyuru = t1.value; }); l1.appendChild(t1); f.appendChild(l1);
      var l2 = A.el('label', 'ad-alan'); l2.appendChild(A.el('span', '', 'Bağlantı (isteğe bağlı)')); var t2 = A.el('input', 'ad-girdi'); t2.placeholder = '/premium/'; t2.value = site.duyuru_link || ''; t2.addEventListener('input', function () { site.duyuru_link = t2.value.trim(); }); l2.appendChild(t2); f.appendChild(l2);
      var l3 = A.el('label', 'ad-anahtar'); var c3 = A.el('input'); c3.type = 'checkbox'; c3.checked = !!site.duyuru_aktif; c3.addEventListener('change', function () { site.duyuru_aktif = c3.checked; });
      var s3 = A.el('span'); s3.appendChild(A.el('b', '', 'Duyuru sitede görünsün')); l3.appendChild(c3); l3.appendChild(A.el('i')); l3.appendChild(s3); f.appendChild(l3);
      var kd2 = A.el('button', 'ad-dugme', 'Duyuruyu kaydet'); kd2.type = 'button'; f.appendChild(kd2);
      kd2.addEventListener('click', function () {
        if (site.duyuru_link && !/^(\/|https:\/\/)/.test(site.duyuru_link)) { A.bildir('Bağlantı / ya da https:// ile başlamalı.', 'hata'); return; }
        kd2.disabled = true;
        A.api.ayarKaydet('site', site, true).then(function () { A.bildir('Duyuru kaydedildi.', 'tamam'); }).catch(function (e) { A.bildir(A.hata(e), 'hata'); }).then(function () { kd2.disabled = false; });
      });
    });
  }
});
