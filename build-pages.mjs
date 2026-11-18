import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";

const basePath = "/cjxetsytalep";
const apiOrigin = "https://talep-masasi-17.limitlesscoyote8.chatgpt.site";
const template = await readFile("worker/index.html", "utf8");
const page = template
  .replace('href="/"', 'href="' + basePath + '/"')
  .replace('</main>', `<section aria-label="Talep Masası hakkında"><h2>Talep Masası nasıl çalışır?</h2><p>Talep Masası, Esma Bayraktar tarafından yönetilen ortak talep takip panosudur. Yönetici talepler oluşturur; katılımcılar yanıt, ürün SKU bilgisi, stok durumu ve fotoğraf ekleyerek işlerin durumunu takip eder.</p><p>Google ile giriş yalnızca kimliğinizi doğrulamak için kullanılır. Gmail veya Drive içeriğinize erişim istenmez. Ortak panoya gönderdiğiniz içerikler panoya erişen diğer katılımcılar tarafından görülebilir.</p><p><a href="${basePath}/privacy.html">Gizlilik politikası</a> · <a href="${basePath}/terms.html">Kullanım koşulları</a> · <a href="mailto:esmabayeaktar963@gmail.com">İletişim</a></p></section></main>`)
  .replace("<!-- STYLES -->", '<link rel="stylesheet" href="' + basePath + '/style.css">')
  .replace(
    "<!-- SCRIPT -->",
    '<script>window.TICKET_API_ORIGIN = ' + JSON.stringify(apiOrigin) + ';</script>' +
      '<script src="' + basePath + '/i18n.js" defer></script>' + '<script src="' + basePath + '/client.js" defer></script>',
  );

await mkdir("docs", { recursive: true });
await Promise.all([
  writeFile("docs/index.html", page),
  copyFile("worker/style.css", "docs/style.css"),
  copyFile("worker/client.js", "docs/client.js"),
  copyFile("worker/i18n.js", "docs/i18n.js"),
  writeFile("docs/.nojekyll", ""),
]);

const informationPages = {
  "privacy.html": ["Gizlilik politikası", `<h2>Hangi bilgiler işlenir?</h2><p>Google ile giriş sırasında Google hesap kimliği, adınız, e-posta adresiniz ve e-postanızın doğrulanma durumu kimliğinizi ve yönetici yetkinizi kontrol etmek için işlenir. Google şifrenizi almayız; Gmail mesajlarınıza veya Drive dosyalarınıza erişim istemeyiz.</p><p>Talep ve yanıtlara eklediğiniz metinler, SKU, stok durumu, adınız, işlem zamanları ve fotoğraflar saklanır. Pano yöneticisinin e-posta adresi ve hesap kimliğinden türetilen tanımlayıcı pano yönetimi için saklanır.</p><h2>Amaç ve görünürlük</h2><p>Bilgiler oturum açmayı, yetki kontrolünü ve ortak taleplerin takibini sağlamak için kullanılır. Ortak panodaki içerikler panoya erişen diğer katılımcılar tarafından görülebilir. Gizli veya başkalarına ait paylaşma izniniz olmayan bilgileri yüklemeyin.</p><h2>Hizmetler ve tarayıcı depolaması</h2><p>Arayüz GitHub Pages üzerinde sunulur. Giriş doğrulamasını Google sağlar. Uygulama sunucusu Sites altyapısında çalışır; talep ve dosya kayıtları Cloudflare R2 depolamasında tutulur. Bu hizmetler istekleri yerine getirmek için IP adresi ve tarayıcı bilgileri gibi teknik verileri işleyebilir.</p><p>Giriş belirteci tarayıcının oturum depolamasında tutulur ve uygulamadan çıkışta silinir. Tema tercihi tarayıcının yerel depolamasında saklanır. Uygulama kodunda reklam veya ziyaretçi analiz aracı bulunmaz.</p><h2>Saklama ve silme talepleri</h2><p>Talep ve yanıt kayıtları otomatik olarak süre sonunda silinmez; yönetici tarafından silinene kadar tutulur. Verilerinize erişim, düzeltme veya silme talebinizi aşağıdaki iletişim adresine gönderebilirsiniz. İlgili kayıtları tarif edin; talebiniz için kimlik doğrulaması istenebilir.</p>`],
  "terms.html": ["Kullanım koşulları", `<h2>Hizmetin amacı</h2><p>Talep Masası, ortak talepleri ve ürün yanıtlarını takip etmek için kullanılır. Yönetici talep oluşturur; Google hesabıyla giriş yapan katılımcılar ortak panodaki talepleri görüntüleyebilir, yanıtlayabilir ve durumlarını değiştirebilir. Giriş bağlantısı tamamlanana kadar bu özellikler kullanılamayabilir.</p><h2>Paylaşım sorumluluğu</h2><p>Yalnızca paylaşmaya yetkili olduğunuz içerikleri ve fotoğrafları yükleyin. Yanıtlarınızın, SKU ve stok bilgilerinin doğruluğunu kontrol edin. Başkalarının kişisel bilgilerini izinsiz paylaşmayın; zararlı, hukuka aykırı veya yanıltıcı içerik yüklemeyin.</p><h2>Ortak çalışma</h2><p>Panoya gönderilen içerikler diğer katılımcılar tarafından görülebilir. Diğer kullanıcıların çalışmalarını bozmayın, hesaplara izinsiz erişmeye çalışmayın ve hizmetin işleyişini engellemeyin.</p><h2>Hizmetin durumu</h2><p>Uygulama geliştirme aşamasındadır. Kesinti, hata veya özellik değişikliği yaşanabilir. Kritik iş bilgilerinin ayrı bir kopyasını saklayın. Sorunları ve uygunsuz içerikleri yöneticiye bildirebilirsiniz.</p>`],
};
for (const [file, [title, content]] of Object.entries(informationPages)) {
  await writeFile("docs/" + file, `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Talep Masası</title><style>body{margin:0;background:#f7f7fc;color:#25243c;font:17px/1.7 system-ui,sans-serif}main{max-width:800px;margin:auto;padding:40px 24px}a{color:#5437ce}h1{line-height:1.2}h2{margin-top:32px;font-size:23px}</style></head><body><main><a href="${basePath}/">← Talep Masası</a><h1>${title}</h1><p>Güncelleme: 18 Kasım 2026</p>${content}<h2>İletişim</h2><p>Uygulama yöneticisi: Esma Bayraktar<br><a href="mailto:esmabayeaktar963@gmail.com">esmabayeaktar963@gmail.com</a></p><p><a href="${basePath}/privacy.html">Gizlilik politikası</a> · <a href="${basePath}/terms.html">Kullanım koşulları</a></p></main></body></html>`);
}
