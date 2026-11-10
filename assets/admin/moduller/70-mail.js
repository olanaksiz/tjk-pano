// Modül: Mail gönder — ticari ileti onayı veren üyelere duyuru/bülten (Resend, Supabase fonksiyonu: mail-gonder)
TJKDAdmin.modul({
  id: 'mail', ad: 'Mail gönder', grup: 'Üyelik', sira: 70,
  ikon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  ciz: function (alan, A) {
    var dur = A.api.fn('mail-gonder').catch(function () { return null; });
    var say = A.api.rpc('admin_ileti_sayi').catch(function () { return null; });
    var gec = A.api.rpc ? window.TJKD.rest('mail_gonderimler?select=*&order=created_at.desc&limit=20').catch(function () { return null; }) : Promise.resolve(null);
    return Promise.all([dur, say, gec]).then(function (r) {
      var d = r[0], s = r[1], G = r[2];
      var kur = A.kutu(alan, 'Kurulum durumu');
      var liste = A.el('ul', 'ad-not');
      [[!!s, 'Veritabanı (supabase_v8_mail.sql çalıştırıldı)'], [!!d, 'Gönderim fonksiyonu (mail-gonder) yayında'], [!!(d && d.resend), 'Resend anahtarı (RESEND_API_KEY) tanımlı']].forEach(function (x) {
        liste.appendChild(A.el('li', '', (x[0] ? '✅ ' : '⏳ ') + x[1]));
      });
      kur.appendChild(liste);
      if (d && d.gonderen) kur.appendChild(A.el('p', 'ad-not', 'Gönderen: ' + d.gonderen));
      if (s) A.kpi(alan, [['İleti onayı veren üye', s.onayli, 'yesil'], ['Toplam üye', s.toplam], ['Abonelikten çıkan', s.cikan]]);

      var k = A.kutu(alan, 'Yeni mail');
      k.appendChild(A.el('p', 'ad-not', 'Mail yalnız üye olurken ya da Hesabım sayfasında ticari ileti onayı veren üyelere gider; her mailin altında "abonelikten çık" bağlantısı otomatik bulunur. Önce "Bana test gönder" ile kendi kutunda kontrol et. Yazım: boş satır = yeni paragraf, **kalın**, https:// ile başlayan adresler bağlantı olur.'));
      var f = A.el('div', 'ad-form'); k.appendChild(f);
      var l1 = A.el('label', 'ad-alan'); l1.appendChild(A.el('span', '', 'Konu')); var konu = A.el('input', 'ad-girdi'); konu.maxLength = 150; konu.placeholder = 'Örnek: Davet et, 15 gün Premium kazan'; l1.appendChild(konu); f.appendChild(l1);
      var l2 = A.el('label', 'ad-alan'); l2.appendChild(A.el('span', '', 'İçerik')); var ic = A.el('textarea', 'ad-girdi'); ic.rows = 10; ic.style.minHeight = '200px'; ic.placeholder = 'Merhaba,\n\nBugün ...\n\nhttps://tjkdetay.com/davet/'; l2.appendChild(ic); f.appendChild(l2);
      var arac = A.el('div', 'ad-arac'); k.appendChild(arac);
      var tb = A.el('button', 'ad-dugme ikincil', 'Bana test gönder'); tb.type = 'button';
      var hb = A.el('button', 'ad-dugme', 'Onaylı üyelere gönder' + (s ? ' (' + s.onayli + ')' : '')); hb.type = 'button';
      arac.appendChild(tb); arac.appendChild(hb);
      var sonuc = A.el('p', 'ad-not'); k.appendChild(sonuc);
      var testOk = false;
      function gonder(test) {
        var g = {konu: konu.value.trim(), icerik: ic.value, test: test};
        if (g.konu.length < 3 || g.icerik.trim().length < 10) { A.bildir('Konu ve içerik gerekli.', 'hata'); return; }
        if (!test) {
          if (!testOk) { A.bildir('Önce "Bana test gönder" ile kontrol et.', 'hata'); return; }
          if (!confirm('"' + g.konu + '" konulu mail ' + (s ? s.onayli : '') + ' onaylı üyeye gönderilecek. Geri alınamaz. Gönderilsin mi?')) return;
        }
        tb.disabled = hb.disabled = true; sonuc.textContent = 'Gönderiliyor…';
        A.api.fn('mail-gonder', g).then(function (j) {
          sonuc.textContent = (test ? 'Test maili gönderildi. ' : '') + j.basarili + ' / ' + j.alici + ' gönderildi' + (j.hata ? ' · hata: ' + j.hata : '') + '.';
          if (test) testOk = true;
          A.bildir(test ? 'Test maili gönderildi, gelen kutunu kontrol et.' : 'Mail gönderildi.', 'tamam');
        }).catch(function (e) { sonuc.textContent = ''; A.bildir(A.hata(e), 'hata'); }).then(function () { tb.disabled = hb.disabled = false; });
      }
      konu.addEventListener('input', function () { testOk = false; }); ic.addEventListener('input', function () { testOk = false; });
      tb.addEventListener('click', function () { gonder(true); });
      hb.addEventListener('click', function () { gonder(false); });

      if (G) {
        var k3 = A.kutu(alan, 'Son gönderimler');
        A.tablo(k3, [
          {ad: 'Tarih', deger: function (x) { return A.tarih(x.created_at); }},
          {ad: 'Konu', deger: function (x) { return (x.test ? '[TEST] ' : '') + x.konu; }},
          {ad: 'Gönderilen', deger: function (x) { return x.basarili + ' / ' + x.alici; }},
          {ad: 'Hata', deger: function (x) { return x.hata || '—'; }}
        ], G, 'Henüz gönderim yok.');
      }
    });
  }
});
