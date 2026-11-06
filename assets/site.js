// TJK Detay — yalnız "sıradaki koşu" vurgusu (sayfa içeriği HTML'de hazırdır)
(function () {
  var kosular = document.querySelectorAll('.kosu[data-bas]');
  if (!kosular.length) return;
  var gun = document.body.getAttribute('data-gun');
  var simdi;
  try {
    var p = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false}).formatToParts(new Date());
    var g = {}; p.forEach(function (x) { g[x.type] = x.value; });
    if (g.year + '-' + g.month + '-' + g.day !== gun) return;
    simdi = Number(g.hour) * 60 + Number(g.minute);
  } catch (e) { return; }
  var sec = null;
  kosular.forEach(function (k) {
    if (k.getAttribute('data-bitti') === '1') return;
    var t = k.getAttribute('data-bas').split(':');
    var dk = Number(t[0]) * 60 + Number(t[1]);
    if (dk + 3 >= simdi && (!sec || dk < sec.dk)) sec = {el: k, dk: dk};
  });
  if (!sec) return;
  sec.el.classList.add('sirada');
  var kutu = document.querySelector('.siradaki');
  if (kutu) {
    var a = kutu.querySelector('a');
    a.href = '#' + sec.el.id;
    a.textContent = sec.el.getAttribute('data-ad');
    kutu.classList.add('var');
  }
})();
