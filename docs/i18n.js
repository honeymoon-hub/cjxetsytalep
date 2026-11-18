let language = localStorage.getItem('ticket-language') === 'en' ? 'en' : 'tr';
const translations = {
'Talep Masası':'Ticket Desk','TALEP MASASI':'TICKET DESK','ÇALIŞMA ALANI / 01':'WORKSPACE / 01','Talepler':'Tickets','Toplam talep':'Total tickets','Pano özeti':'Board overview','Açık':'Open','Devam ediyor':'In progress','Tamamlandı':'Completed','Normal':'Normal','Yüksek':'High','Acil':'Urgent','Tümü':'All','Yeni talep':'New ticket','Talebi oluştur':'Create ticket','Panoyu paylaş':'Share board','Açtığınız talepleri ve gelen yanıtları takip edin.':'Track your requests and incoming replies.','Ticket ID veya başlık ara…':'Search ticket ID or title…','Kartlarda ara':'Search tickets','Duruma göre filtrele':'Filter by status','Kartları buraya taşıyın':'Drag tickets here','Fotoğraf':'Photo','▧ Fotoğraf':'▧ Photo','Çıkış':'Sign out','Açık görünüm':'Light mode','Koyu görünüm':'Dark mode','Açık temaya geç':'Switch to light mode','Koyu temaya geç':'Switch to dark mode','Panona hoş geldin':'Welcome to your workspace','Talepleri görüntülemek ve yanıtlamak için Google hesabınla giriş yap.':'Sign in with your Google account to view and reply to tickets.','Yükleniyor…':'Loading…','Başlık':'Title','Talebin kısa başlığı':'A short title for your ticket','Açıklama veya soru':'Description or question','Karşı tarafın bilmesi veya yanıtlaması gerekenleri yazın.':'Describe what the other party needs to know or answer.','Öncelik':'Priority','· isteğe bağlı':'· optional','JPG, PNG veya WebP · en fazla 5 MB':'JPG, PNG or WebP · up to 5 MB','Kapat':'Close','← Panoya dön':'← Back to board','Talep':'Ticket','Henüz yanıt yok.':'No replies yet.','Stok durumu':'Stock status','Ürün SKU kodunu yazın':'Enter the product SKU','Örn. Stokta · 12 adet · Tükendi':'e.g. In stock · 12 units · Sold out','CJ linki':'CJ link','Ek açıklama':'Additional notes','Yanıtınıza ek bilgi ekleyin…':'Add details to your reply…','Yanıtı gönder':'Send reply','Durum':'Status','Talebin durumu':'Ticket status','Durumu güncelle':'Update status','Yanıt bağlantısı':'Ticket link','Bu bağlantı talebi açar. Giriş yapan katılımcılar ortak panoya erişebilir.':'This link opens the ticket. Signed-in participants can access the shared board.','Bağlantıyı kopyala':'Copy link','Bağlantı kopyalandı.':'Link copied.','Pano bağlantısı kopyalandı.':'Board link copied.','Bağlantıyı seçili alandan kopyalayabilirsiniz.':'Copy the link from the selected field.','Pano bağlantısı':'Board link','Bu bağlantıya sahip olan ve siteye erişimi bulunan kişiler panodaki kartları görüntüleyip durumlarını değiştirebilir.':'People with access to the site can use this link to view the board and update ticket statuses.','ID kopyala':'Copy ID','ID kopyalandı':'ID copied','ID’yi üstteki metinden kopyalayın':'Copy the ID from the text above','Fotoğrafı büyüt':'Enlarge photo','Fotoğraf yükleniyor…':'Loading photo…','Eklenen fotoğraf':'Attached photo','Talebe eklenen fotoğraf':'Ticket attachment','Fotoğraf yüklenemedi.':'Could not load photo.','Gizlilik politikası':'Privacy policy','Kullanım koşulları':'Terms of use','İletişim':'Contact','Talep Masası nasıl çalışır?':'How does Ticket Desk work?',
'Talep Masası, Esma Bayraktar tarafından yönetilen ortak talep takip panosudur. Yönetici talepler oluşturur; katılımcılar yanıt, ürün SKU bilgisi, stok durumu ve fotoğraf ekleyerek işlerin durumunu takip eder.':'Ticket Desk is a shared request board managed by Esma Bayraktar. The administrator creates tickets; participants add replies, product SKUs, stock information and photos to track progress.',
'Google ile giriş yalnızca kimliğinizi doğrulamak için kullanılır. Gmail veya Drive içeriğinize erişim istenmez. Ortak panoya gönderdiğiniz içerikler panoya erişen diğer katılımcılar tarafından görülebilir.':'Google sign-in is used only to verify your identity. Access to Gmail or Drive content is not requested. Content posted on the shared board is visible to other participants with board access.',
'Bağlantıyı kontrol edip tekrar deneyin.':'Check your connection and try again.','Google giriş ekranı yüklenemedi.':'Could not load Google sign-in.','Google girişi henüz yapılandırılmadı.':'Google sign-in is not configured yet.','Google hesabıyla giriş yapın.':'Sign in with your Google account.','Google oturumu geçersiz veya süresi dolmuş. Tekrar giriş yapın.':'Your Google session is invalid or expired. Sign in again.','Google oturumu geçersiz. Tekrar giriş yapın.':'Invalid Google session. Sign in again.','Google oturumu geçersiz.':'Invalid Google session.','Google ile giriş doğrulanamadı.':'Could not verify Google sign-in.','Pano sahibi önce Google hesabıyla giriş yapmalı.':'The board owner must sign in with Google first.','Birden fazla eski pano bulundu; yönetici aktarımı gerekiyor.':'Multiple existing boards found; administrator migration is required.','Depolama şu anda kullanılamıyor.':'Storage is currently unavailable.','Lütfen zorunlu alanları kontrol edin.':'Check the required fields.','En fazla 5 MB boyutunda JPG, PNG veya WebP yükleyin.':'Upload a JPG, PNG or WebP up to 5 MB.','İstek doğrulanamadı.':'The request could not be verified.','Dosya çok büyük.':'The file is too large.','Yeni talepleri yalnızca pano sahibi açabilir.':'Only the board owner can create tickets.','Geçerli bir öncelik seçin.':'Choose a valid priority.','Talep bulunamadı.':'Ticket not found.','Fotoğraf bulunamadı.':'Photo not found.','SKU ve stok durumu alanlarını doldurun.':'Enter the SKU and stock status.','Geçerli bir CJ bağlantısı girin.':'Enter a valid HTTP or HTTPS CJ link.','Geçerli bir durum seçin.':'Choose a valid status.','İşlem bulunamadı.':'Action not found.','İşlem tamamlanamadı. Tekrar deneyin.':'Could not complete the action. Try again.','Failed to fetch':'Connection unavailable. Please try again.'
};
const reverseTranslations = Object.fromEntries(Object.entries(translations).map(([tr,en])=>[en,tr]));
function translateText(value) {
  const trimmed = value.trim();
  const original = reverseTranslations[trimmed] || trimmed;
  let translated = language === 'en' ? (translations[original] || original) : original;
  const replies = /^(?:Yanıtlar|Replies) \((\d+)\)$/.exec(original);
  if (replies) translated = (language === 'en' ? 'Replies' : 'Yanıtlar') + ' (' + replies[1] + ')';
  return value.replace(trimmed, translated);
}
function translateInterface() {
  translationObserver.disconnect();
  document.documentElement.lang = language;
  document.title = language === 'en' ? 'Ticket Desk' : 'Talep Masası';
  const protectedContent = '[data-user-content],.message,.card-title,.card-description,.card-foot,.meta,.answer-data strong,.ticket-reference,#account,script,style,textarea';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node=walker.currentNode;
    if (!node.parentElement.closest(protectedContent) && node.nodeValue.trim()) {
      const next=translateText(node.nodeValue); if(next!==node.nodeValue) node.nodeValue=next;
    }
  }
  for(const element of document.querySelectorAll('[placeholder],[aria-label],img[alt]')) {
    if(element.closest('[data-user-content]')) continue;
    for(const attr of ['placeholder','aria-label','alt']) if(element.hasAttribute(attr)) element.setAttribute(attr,translateText(element.getAttribute(attr)));
  }
  translationObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
}
const translationObserver=new MutationObserver(translateInterface);
const languageSelect=document.getElementById('languageSelect');
languageSelect.value=language;
languageSelect.addEventListener('change',()=>{
  language=languageSelect.value;localStorage.setItem('ticket-language',language);translateInterface();
  if(!document.getElementById('dashboard').hidden) renderBoard();
  if(!document.getElementById('loginPanel').hidden) showLogin();
});
translateInterface();
