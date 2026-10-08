# 📱 Instagram Unfollowers

[![Maintenance](https://img.shields.io/maintenance/yes/2026)](https://github.com/davidarroyo1234/InstagramUnfollowers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

**Bunu diğer dillerde oku:**

<p>
  <a href="../../README.md"><img src="https://flagcdn.com/w40/gb.png" width="32" alt="English" title="English"></a>
  <a href="README.es.md"><img src="https://flagcdn.com/w40/es.png" width="32" alt="Español" title="Español"></a>
</p>

---

Instagram'da seni geri takip etmeyenleri görmeni sağlayan pratik bir araç.  
<u>Tarayıcıda çalışır, herhangi bir indirme veya kurulum gerektirmez!</u>

> ⚡ **Canlı Akış ve Hızlı Önbellek:** Hesaplar, Instagram'dan gruplar halinde alındıkça ekranda gerçek zamanlı olarak belirir. Ayrıca tamamlanan taramalar yerel olarak önbelleğe alınır; böylece gereksiz API istekleri yapmadan sonuçlarını anında (0ms) yeniden yükleyebilirsin!

## 🖥️ Masaüstünde Kullanım

1. Kodu şu sayfadan kopyala: [InstagramUnfollowers Aracı](https://davidarroyo1234.github.io/InstagramUnfollowers/)
2. Kodu kopyalamak için **COPY** butonuna bas:
   <br/><img src="../../assets/copy_code.png" alt="Kodu kopyala butonu" />
3. Instagram web sitesine git ve hesabına giriş yap.
4. Geliştirici konsolunu aç:
   - Windows / Linux: `Ctrl + Shift + J`
   - Mac OS: `⌘ + ⌥ + I`
5. Kodu konsola yapıştır ve `Enter`'a bas. Şu arayüzü göreceksin:
   <br/><img src="../../assets/initial.png" alt="Başlangıç ekranı" />
6. Taramayı başlatmak için **"Taramayı Başlat"**'a tıkla (veya kayıtlı sonuçlarını anında açmak için **"⚡ Önceki taramayı yükle"**'ye).
7. Tarama sürerken hesaplar ekranda canlı olarak belirir ve geri takip durumu otomatik olarak güncellenir:
   <br/><img src="../../assets/results.png" alt="Sonuç ekranı" />
8. 🤍 Profil fotoğraflarına tıklayarak **kullanıcıları beyaz listeye ekle**.
9. 🌐 Üst çubuktaki `🌐` dil menüsünden istediğin zaman **dili değiştir**.
10. 💾 Ayarlar üzerinden **beyaz listeni (korunanları) yönet**:
    - Dışa Aktar: Beyaz listeni JSON yedek dosyası olarak kaydet
    - İçe Aktar: Beyaz listedeki kullanıcıları bir dosyadan geri yükle veya birleştir
    - Yapıştır: Kullanıcı adlarını toplu olarak doğrudan beyaz listeye yapıştır
    - Temizle: Beyaz listedeki tüm kullanıcıları kaldır
    <br/><img src="../../assets/settings_whitelist.png" alt="Beyaz liste ayarları ekranı" />
11. ✅ Onay kutularını kullanarak takibini bırakmak istediğin **kullanıcıları seç**.
12. ⚙️ "Ayarlar" butonundan **zamanlamaları ve dili özelleştir**:
    <br/><img src="../../assets/settings.png" alt="Ayarlar ekranı" />

## 📱 Mobilde Kullanım (Android)

Mobilde kullanmak isteyen Android kullanıcıları için:
1. [Eruda Android Browser](https://github.com/liriliri/eruda-android/releases/)'ın son sürümünü indir
2. Instagram'ın web sürümünü Eruda tarayıcısı üzerinden aç
3. Masaüstündeki adımların aynısını uygula (Eruda simgesine dokunduğunda konsol otomatik olarak açılır)

## ✨ Özellikler

- 🔍 **Tara ve Tespit Et**: Seni geri takip etmeyen kullanıcıları doğru şekilde bulur.
- ⚡ **Canlı Kademeli Akış**: Her grup geldikçe hesaplar ekrana akar; büyük hesaplarda boş bekleme ekranlarını ortadan kaldırır.
- ⚡ **Anında Yerel Önbellek (0ms)**: Daha önce tamamlanan taramaları sıfırdan tekrar taramadan anında aç ve incele.
- 🌐 **Çok Dilli (EN / ES / TR)**: Anında geçiş yapılabilen İngilizce, İspanyolca ve Türkçe desteği.
- 🛡️ **Engel ve Oturum Koruması**: Zorla çıkış yapılmasını ve şüpheli etkinlik uyarılarını önlemek için tam Instagram Web başlıklarını (`X-ASBD-ID`, `X-CSRFToken`, `XMLHttpRequest`) kullanır.
- 🛡️ **İşlem Engeli Koruması**: Hayalet takip bırakmaları önlemek için takip bırakma API yanıtlarını iki kez kontrol eder; Instagram `feedback_required` döndürürse hesabını korumak için kuyruğu otomatik olarak durdurur.
- ⏳ **Akıllı Hız Sınırı ve Geçici Engel Yönetimi**: Instagram HTTP 429 veya HTTP 400 (`feedback_required`) döndürürse başarısız olmak yerine giderek artan bekleme süreleriyle otomatik olarak duraklar ve yeniden dener.
- ⚠️ **Yanlış Tespit Koruması**: On binlerce takipçisi olan hesapları destekleyen genişletilmiş sayfa limitleri; tarama yarıda kesilirse yanlışlıkla takip bırakmayı önleyen güvenlik kilidi.
- 🤍 **Kalıcı ve Toplu Beyaz Liste**: Belirli hesapları yerel kayıt, JSON dışa/içe aktarma ve doğrudan kullanıcı adı yapıştırma ile koru.
- ⚙️ **Özelleştirilebilir Zamanlamalar**: İstek hızını hesap güvenliği tercihlerine göre ayarla.
- 🎨 **Apple'dan İlham Alan Arayüz**: Temiz, duyarlı ve minimalist tasarım.
- 🔒 **%100 İstemci Tarafında Gizlilik**: Tüm veriler tarayıcında yerel olarak işlenir. Hiçbir giriş bilgisi veya veri harici sunuculara gönderilmez.

---

## 🛠️ Geliştirme

- Node sürümü: Node 16+ / Node 18+ / Node 20+
- Bağımlılıkları yükle: `npm install`
- Derle: `npm run build`
- Otomatik yenilemeli geliştirme sunucusu: `npm run build-dev`

## ⚖️ Yasal Uyarı ve Lisans

**Uyarı:** Bu araç Instagram ile bağlantılı değildir; Instagram tarafından onaylanmamış, desteklenmemiş veya resmi olarak ilişkilendirilmemiştir.

⚠️ **Kullanım riski tamamen sana aittir!**

📜 [MIT Lisansı](../../LICENSE) ile lisanslanmıştır
