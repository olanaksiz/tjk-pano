// Modül: Jokey fotoğrafları — kullanım hakkı olan fotoğrafı yükle; profil sayfasındaki çizimin yerine geçer.
// Depolama: Supabase Storage "jokey-foto" kovası (supabase_v3.sql). Liste: ayarlar.jokey_foto {slug: {url, kaynak, tarih}}
TJKDAdmin.modul({
  id: 'jokey-foto', ad: 'Jokey fotoğrafları', grup: 'Ayarlar', sira: 68,
  ikon: '<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/>',
  ciz: function (alan, A) {
    var el = A.el, T = window.TJKD, AYAR = window.TJKD_UYELIK || {};
    return Promise.all([A.api.ayarlar(true), fetch('/data/jokeyler.json', {cache: 'no-cache'}).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })]).then(function (s) {
      var F = Object.assign({}, s[0].jokey_foto || {}), L = s[1] || [];
      var k0 = A.kutu(alan, 'Önce oku');
      k0.appendChild(el('p', 'ad-not', 'Yalnız kullanım hakkın olan fotoğrafları yükle: TJK\'dan ya da fotoğrafçıdan yazılı izinle alınmış, ya da jokeyin kendisinin verdiği fotoğraflar. İnternetten bulunan fotoğraflar telif ve kişilik hakkı sorunu doğurur. Fotoğraf yüklenene kadar profilde özgün çizim görünür. En fazla 1 MB, JPG/PNG/WebP; kare ve en az 400×400 piksel önerilir.'));
      var k = A.kutu(alan, 'Fotoğraf yükle');
      var f = el('div', 'ad-form'); k.appendChild(f);
      var l1 = el('label', 'ad-alan'); l1.appendChild(el('span', '', 'Jokey'));
      var ara = el('input', 'ad-girdi'); ara.placeholder = 'Ad yaz, listeden seç'; ara.setAttribute('list', 'ad-jokey-liste'); l1.appendChild(ara); f.appendChild(l1);
      var dl = el('datalist'); dl.id = 'ad-jokey-liste'; L.forEach(function (j) { var o = el('option'); o.value = j.ad; dl.appendChild(o); }); f.appendChild(dl);
      var l2 = el('label', 'ad-alan'); l2.appendChild(el('span', '', 'Fotoğraf dosyası')); var dosya = el('input', 'ad-girdi'); dosya.type = 'file'; dosya.accept = 'image/jpeg,image/png,image/webp'; l2.appendChild(dosya); f.appendChild(l2);
      var l3 = el('label', 'ad-alan'); l3.appendChild(el('span', '', 'Fotoğraf kaynağı / izin (sayfada görünür)')); var kay = el('input', 'ad-girdi'); kay.placeholder = 'ör. TJK izniyle · Foto: Ad Soyad'; kay.maxLength = 80; l3.appendChild(kay); f.appendChild(l3);
      var l4 = el('label', 'ad-onay'); var onay = el('input'); onay.type = 'checkbox'; l4.appendChild(onay); l4.appendChild(el('span', '', 'Bu fotoğrafı sitede kullanma hakkım var.')); f.appendChild(l4);
      var yukle = el('button', 'ad-dugme', 'Yükle ve kaydet'); yukle.type = 'button'; f.appendChild(yukle);
      yukle.addEventListener('click', function () {
        var j = L.filter(function (x) { return x.ad.toLocaleLowerCase('tr-TR') === ara.value.trim().toLocaleLowerCase('tr-TR'); })[0];
        var d = dosya.files && dosya.files[0];
        if (!j) return A.bildir('Listeden bir jokey seç.', 'hata');
        if (!d) return A.bildir('Fotoğraf dosyası seç.', 'hata');
        if (!/^image\/(jpeg|png|webp)$/.test(d.type)) return A.bildir('Yalnız JPG, PNG ya da WebP.', 'hata');
        if (d.size > 1048576) return A.bildir('Dosya 1 MB\'tan büyük.', 'hata');
        if (!kay.value.trim()) return A.bildir('Fotoğraf kaynağını yaz.', 'hata');
        if (!onay.checked) return A.bildir('Kullanım hakkı onayını işaretle.', 'hata');
        yukle.disabled = true;
        var uzanti = d.type === 'image/png' ? 'png' : (d.type === 'image/webp' ? 'webp' : 'jpg');
        var yol = j.slug + '.' + uzanti;
        T.oturum().then(function (o) {
          if (!o) throw new Error('Oturum yok');
          return fetch(T.url + '/storage/v1/object/jokey-foto/' + encodeURIComponent(yol), {method: 'POST', headers: {apikey: AYAR.anon, Authorization: 'Bearer ' + o.at, 'x-upsert': 'true', 'Content-Type': d.type}, body: d});
        }).then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error('Yükleme başarısız: ' + t.slice(0, 120)); }); })
          .then(function () {
            F[j.slug] = {url: T.url + '/storage/v1/object/public/jokey-foto/' + encodeURIComponent(yol) + '?v=' + Date.now().toString(36), kaynak: kay.value.trim(), tarih: new Date().toISOString().slice(0, 10)};
            return A.api.ayarKaydet('jokey_foto', F, true);
          }).then(function () { A.bildir(j.ad + ' fotoğrafı kaydedildi.', 'tamam'); A.yenile(); })
          .catch(function (e) { A.bildir(A.hata(e), 'hata'); }).then(function () { yukle.disabled = false; });
      });
      var k2 = A.kutu(alan, 'Yüklenen fotoğraflar');
      var liste = Object.keys(F).map(function (sl) { var j = L.filter(function (x) { return x.slug === sl; })[0]; return {slug: sl, ad: j ? j.ad : sl, f: F[sl]}; });
      A.tablo(k2, [
        {ad: 'Fotoğraf', deger: function (r) { var i = el('img'); i.src = r.f.url; i.alt = ''; i.style.cssText = 'width:44px;height:44px;border-radius:50%;object-fit:cover'; return i; }},
        {ad: 'Jokey', deger: function (r) { var a = el('a', '', r.ad); a.href = '/jokeyler/' + r.slug + '/'; a.target = '_blank'; return a; }},
        {ad: 'Kaynak', deger: function (r) { return r.f.kaynak || ''; }},
        {ad: 'Tarih', deger: function (r) { return r.f.tarih || ''; }},
        {ad: '', deger: function (r) { var b = el('button', 'ad-dugme kucuk tehlike', 'Kaldır'); b.type = 'button'; b.addEventListener('click', function () { if (!confirm(r.ad + ' fotoğrafı profilden kaldırılsın mı?')) return; delete F[r.slug]; A.api.ayarKaydet('jokey_foto', F, true).then(function () { A.bildir('Kaldırıldı.', 'tamam'); A.yenile(); }).catch(function (e) { A.bildir(A.hata(e), 'hata'); }); }); return b; }}
      ], liste, 'Henüz fotoğraf yüklenmedi; profillerde çizim görünüyor.');
    });
  }
});
