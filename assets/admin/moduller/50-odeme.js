// Modül: Ödeme yöntemleri — PayTR (iFrame API) ayarları ve kurulum durumu. Yeni sağlayıcılar aynı yapıyla eklenir.
TJKDAdmin.modul({
  id: 'odeme', ad: 'Ödeme yöntemleri', grup: 'Satış', sira: 50,
  ikon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  ciz: function (alan, A) {
    return A.api.ayarlar(true).then(function (ay) {
      var od = JSON.parse(JSON.stringify(ay.odeme_yontemleri || {}));
      var p = od.paytr = Object.assign({aktif: false, test_modu: true, taksit_kapali: true, max_taksit: 0}, od.paytr || {});
      var planlar = Array.isArray(ay.premium_planlar) ? ay.premium_planlar : [];
      var URL = (window.TJKD_UYELIK || {}).url || '';
      var bildirimUrl = URL.replace(/\/+$/, '') + '/functions/v1/paytr-bildirim';

      var k = A.kutu(alan, 'PayTR · kredi ve banka kartı');
      k.classList.add('ad-saglayici');
      k.appendChild(A.el('p', 'ad-not', 'Kart bilgisi PayTR\'nin güvenli sayfasında girilir; sitemiz kart bilgisi görmez. Ödeme onaylanınca üyelik otomatik premium olur ve sipariş "Siparişler" bölümüne düşer.'));

      // kurulum durumu
      var liste = A.el('ol', 'ad-kontrol'); k.appendChild(liste);
      function madde(metin, durum, ek) {
        var li = A.el('li', 'ad-k-' + durum); li.appendChild(A.el('span', 'ad-k-ikon', durum === 'tamam' ? '✓' : (durum === 'bekle' ? '…' : '!')));
        var d = A.el('div'); d.appendChild(A.el('b', '', metin)); if (ek) d.appendChild(ek); li.appendChild(d); liste.appendChild(li); return li;
      }
      var fnDurum = madde('Sunucu fonksiyonları (paytr-token, paytr-bildirim)', 'bekle', A.el('small', '', 'Kontrol ediliyor…'));
      var magaza = madde('PayTR mağaza bilgileri (Mağaza No, Key, Salt)', 'bekle', A.el('small', '', 'Kontrol ediliyor…'));
      var bk = A.el('div', 'ad-kopya'); var bi = A.el('input', 'ad-girdi'); bi.readOnly = true; bi.value = bildirimUrl; var bb = A.el('button', 'ad-dugme kucuk ikincil', 'Kopyala'); bb.type = 'button';
      bb.addEventListener('click', function () { bi.select(); try { navigator.clipboard.writeText(bi.value); } catch (e) { document.execCommand('copy'); } A.bildir('Bildirim URL kopyalandı.', 'tamam'); });
      bk.appendChild(bi); bk.appendChild(bb);
      var bkK = A.el('div'); bkK.appendChild(A.el('small', '', 'PayTR Mağaza Paneli → Destek & Kurulum → Ayarlar → Bildirim URL alanına bu adresi yapıştırın:')); bkK.appendChild(bk);
      madde('PayTR bildirim adresi (Bildirim URL)', 'bilgi', bkK);
      var fiyatli = planlar.filter(function (x) { return x.aktif !== false && Number(x.fiyat) > 0; });
      var pl = A.el('small', '', fiyatli.length ? fiyatli.map(function (x) { return x.ad + ': ' + A.tl(Math.round(Number(x.fiyat) * 100)); }).join(' · ') : 'Fiyatı girilmiş plan yok. "Site ayarları"ndan fiyat girin.');
      madde('Premium plan fiyatları', fiyatli.length ? 'tamam' : 'eksik', pl);
      A.api.fn('paytr-token').then(function (j) {
        fnDurum.className = 'ad-k-tamam'; fnDurum.querySelector('.ad-k-ikon').textContent = '✓'; fnDurum.querySelector('small').textContent = 'Yüklü ve çalışıyor (sürüm ' + ((j && j.surum) || '?') + ').';
        var ok = j && j.magaza_bilgileri;
        magaza.className = ok ? 'ad-k-tamam' : 'ad-k-eksik'; magaza.querySelector('.ad-k-ikon').textContent = ok ? '✓' : '!';
        magaza.querySelector('small').textContent = ok ? 'Girilmiş.' : 'Girilmemiş. Supabase → Edge Functions → Secrets bölümüne PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY ve PAYTR_MERCHANT_SALT eklenmeli (bu bilgileri yalnız siz girin).';
      }).catch(function () {
        fnDurum.className = 'ad-k-eksik'; fnDurum.querySelector('.ad-k-ikon').textContent = '!'; fnDurum.querySelector('small').textContent = 'Bulunamadı. Fonksiyonlar Supabase\'e yüklenmeli.';
        magaza.className = 'ad-k-eksik'; magaza.querySelector('.ad-k-ikon').textContent = '!'; magaza.querySelector('small').textContent = 'Fonksiyonlar yüklenince kontrol edilir.';
      });

      // ayarlar
      var form = A.el('div', 'ad-form'); k.appendChild(form);
      function anahtar(metin, aciklama, deger, deg) {
        var l = A.el('label', 'ad-anahtar'); var c = A.el('input'); c.type = 'checkbox'; c.checked = !!deger; c.addEventListener('change', function () { deg(c.checked); });
        var t = A.el('span'); t.appendChild(A.el('b', '', metin)); if (aciklama) t.appendChild(A.el('small', '', aciklama));
        l.appendChild(c); l.appendChild(A.el('i')); l.appendChild(t); form.appendChild(l); return c;
      }
      anahtar('PayTR ile kartla ödeme açık', 'Kapalıyken "Premium\'a geç" düğmesi yalnız talep kaydeder.', p.aktif, function (v) { p.aktif = v; });
      anahtar('Test modu', 'Açıkken gerçek para çekilmez; PayTR test kartlarıyla denenir. Canlıya geçerken kapatın.', p.test_modu, function (v) { p.test_modu = v; });
      anahtar('Tek çekim (taksit kapalı)', 'Kapatırsanız aşağıdaki taksit sınırı uygulanır.', p.taksit_kapali, function (v) { p.taksit_kapali = v; tk.disabled = v; });
      var tl = A.el('label', 'ad-alan'); tl.appendChild(A.el('span', '', 'En fazla taksit'));
      var tk = A.el('select', 'ad-girdi'); [[0, 'PayTR varsayılanı'], [2, '2'], [3, '3'], [6, '6'], [9, '9'], [12, '12']].forEach(function (x) { var o = A.el('option', '', x[1]); o.value = x[0]; if (Number(p.max_taksit) === x[0]) o.selected = true; tk.appendChild(o); });
      tk.disabled = !!p.taksit_kapali; tk.addEventListener('change', function () { p.max_taksit = Number(tk.value); });
      tl.appendChild(tk); form.appendChild(tl);
      var kaydet = A.el('button', 'ad-dugme', 'Kaydet'); kaydet.type = 'button'; form.appendChild(kaydet);
      kaydet.addEventListener('click', function () {
        if (p.aktif && !fiyatli.length) { A.bildir('Önce "Site ayarları"ndan plan fiyatı girin.', 'hata'); return; }
        kaydet.disabled = true;
        A.api.ayarKaydet('odeme_yontemleri', od, true).then(function () { A.bildir('Ödeme ayarları kaydedildi.', 'tamam'); }).catch(function (e) { A.bildir(A.hata(e), 'hata'); }).then(function () { kaydet.disabled = false; });
      });

      var k2 = A.kutu(alan, 'Diğer ödeme yöntemleri');
      k2.appendChild(A.el('p', 'ad-not', 'Havale/EFT, iyzico ya da başka bir sağlayıcı modül olarak eklenebilir. Her sağlayıcı ayrı bir sunucu fonksiyonu ve bu sayfada bir kart olarak çalışır.'));
    });
  }
});
