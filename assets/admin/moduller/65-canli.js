// Modül: Canlı yayın — /canli/ sayfasındaki TJK TV YouTube yayınlarının listesi
// Liste boş bırakılırsa sayfa, site yayınlanırken yazılan varsayılan listeyi gösterir.
TJKDAdmin.modul({
  id: 'canli', ad: 'Canlı yayın', grup: 'Ayarlar', sira: 65,
  ikon: '<rect x="2.5" y="5" width="19" height="13" rx="2"/><path d="M8 21h8M12 18v3"/><path d="M10 9v5l4.5-2.5z"/>',
  ciz: function (alan, A) {
    function idAl(x) {
      x = String(x || '').trim();
      if (/^[\w-]{11}$/.test(x)) return x;
      var m = x.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/)([\w-]{11})/);
      return m ? m[1] : '';
    }
    return A.api.ayarlar(true).then(function (ay) {
      var c = ay.canli_yayin || {};
      var veri = {
        yurtici: (Array.isArray(c.yurtici) ? c.yurtici : []).map(function (y) { return Object.assign({baslik: '', yer: '', url: '', gomulu: true}, y); }),
        yurtdisi: (Array.isArray(c.yurtdisi) ? c.yurtdisi : []).map(function (y) { return Object.assign({baslik: '', yer: '', url: '', gomulu: false}, y); })
      };
      var k0 = A.kutu(alan, 'Nasıl çalışır');
      k0.appendChild(A.el('p', 'ad-not', 'TJK TV\'nin resmi YouTube kanalındaki yayın bağlantılarını buraya yapıştır (ör. https://www.youtube.com/watch?v=...). Kanal: youtube.com/@TJKTVCANLIYAYIN → "Canlı" sekmesi. Liste boşsa /canli/ sayfası, site her yayımlandığında güncellenen varsayılan listeyi gösterir.'));
      var a0 = A.el('a', 'ad-dugme ikincil', 'TJK TV canlı yayınları ↗'); a0.href = 'https://www.youtube.com/@TJKTVCANLIYAYIN/streams'; a0.target = '_blank'; a0.rel = 'noopener'; k0.appendChild(a0);
      var a1 = A.el('a', 'ad-dugme ikincil', 'Sayfayı aç ↗'); a1.href = '/canli/'; a1.target = '_blank'; a1.style.marginLeft = '8px'; k0.appendChild(a1);

      function bolum(anahtar, baslik, aciklama) {
        var k = A.kutu(alan, baslik);
        k.appendChild(A.el('p', 'ad-not', aciklama));
        var liste = A.el('div', 'ad-form'); k.appendChild(liste);
        function ciz() {
          liste.textContent = '';
          if (!veri[anahtar].length) liste.appendChild(A.el('p', 'ad-not', 'Henüz yayın eklenmedi; sayfada varsayılan liste görünür.'));
          veri[anahtar].forEach(function (y, i) {
            var satir = A.el('div', 'ad-canli-satir');
            var b = A.el('input', 'ad-girdi'); b.placeholder = 'Başlık (ör. Eyerleme alanı)'; b.value = y.baslik; b.addEventListener('input', function () { y.baslik = b.value; });
            var yer = A.el('input', 'ad-girdi'); yer.placeholder = 'Yer (ör. Bursa)'; yer.value = y.yer; yer.addEventListener('input', function () { y.yer = yer.value; });
            var u = A.el('input', 'ad-girdi'); u.placeholder = 'YouTube bağlantısı'; u.value = y.url || y.id || ''; u.addEventListener('input', function () { y.url = u.value.trim(); });
            var g = A.el('label', 'ad-onay'); var gc = A.el('input'); gc.type = 'checkbox'; gc.checked = y.gomulu !== false; gc.addEventListener('change', function () { y.gomulu = gc.checked; });
            g.appendChild(gc); g.appendChild(A.el('span', '', 'Sitede oynasın'));
            var sil = A.el('button', 'ad-dugme kucuk tehlike', 'Sil'); sil.type = 'button'; sil.addEventListener('click', function () { veri[anahtar].splice(i, 1); ciz(); });
            [b, yer, u, g, sil].forEach(function (x) { satir.appendChild(x); });
            liste.appendChild(satir);
          });
          var ekle = A.el('button', 'ad-dugme ikincil', '+ Yayın ekle'); ekle.type = 'button';
          ekle.addEventListener('click', function () { veri[anahtar].push({baslik: '', yer: '', url: '', gomulu: anahtar === 'yurtici'}); ciz(); });
          liste.appendChild(ekle);
        }
        ciz();
      }
      bolum('yurtici', 'Yurt içi yayınlar', 'Eyerleme alanı ve start kura çekimi gibi yayınlar. Yayın kimlikleri her yarış günü değişebilir.');
      bolum('yurtdisi', 'Yurt dışı yayınlar', 'TJK yurt dışı yayınının başka sitelerde oynatılmasına izin vermiyor; bu yüzden "Sitede oynasın" kapalı kalmalı, ziyaretçi YouTube\'a yönlenir.');

      var kk = A.kutu(alan, 'Kaydet');
      var kd = A.el('button', 'ad-dugme', 'Canlı yayın listesini kaydet'); kd.type = 'button'; kk.appendChild(kd);
      kd.addEventListener('click', function () {
        var temiz = {};
        for (var b in veri) {
          temiz[b] = [];
          for (var i = 0; i < veri[b].length; i++) {
            var y = veri[b][i], id = idAl(y.url);
            if (!id) { A.bildir('Geçersiz YouTube bağlantısı: "' + (y.url || '(boş)') + '"', 'hata'); return; }
            temiz[b].push({baslik: String(y.baslik || 'TJK TV').slice(0, 60), yer: String(y.yer || '').slice(0, 40), url: 'https://www.youtube.com/watch?v=' + id, gomulu: y.gomulu !== false});
          }
        }
        kd.disabled = true;
        A.api.ayarKaydet('canli_yayin', temiz, true).then(function () { A.bildir('Canlı yayın listesi kaydedildi.', 'tamam'); }).catch(function (e) { A.bildir(A.hata(e), 'hata'); }).then(function () { kd.disabled = false; });
      });
    });
  }
});
