# ⭐ C4NAR QUIZ — Gerçek Zamanlı Çok Oyunculu Türkçe Bilgi Yarışması

Siyah + altın sarısı temalı, animasyonlu, **gerçek** çok oyunculu bilgi yarışması.
Oyunun tamamı **tek bir `index.html`** dosyasının içindedir ve **GitHub Pages gibi
statik bir barındırmada doğrudan çalışır**. Node.js sunucusu zorunlu değildir.

---

## 1. Neden tek dosya ile çok oyunculu çalışır?

Klasik yaklaşımda (Socket.IO + Node.js sunucu) GitHub Pages yetersizdir çünkü
Pages yalnızca statik dosya sunar, Node.js çalıştırmaz.

Bu proje bunu şöyle çözer:

| Katman | Görev |
|---|---|
| **WebRTC DataChannel** | Oyuncular arasında doğrudan, gerçek zamanlı çift yönlü veri |
| **Halka açık sinyalleşme aktarıcıları** | Oyuncuların birbirini bulması (STUN + relay WebSocket) |
| **Oda sahibi (HOST) = sunucu** | Soru sırası, süre, cevap toplama, puanlama, doğru cevap gizliliği |
| **BroadcastChannel** | Aynı tarayıcının farklı sekmeleri arasında ek taşıma kanalı |

Yani **farklı cihazlar, farklı ağlar** üzerinden aynı odada gerçek zamanlı oynar.
Doğru cevap anahtarı, soru kapanana kadar istemcilere **hiç gönderilmez**.

> İsterseniz kendi Node.js aktarıcınızı da çalıştırabilirsiniz (`server.js`) —
> LAN partileri veya kurumsal ağlarda genel aktarıcılara gerek kalmaz.

---

## 2. Dosyalar

| Dosya | Açıklama |
|---|---|
| `index.html` | **Oyunun tamamı**: arayüz, CSS, JavaScript, 650 hazır soru |
| `server.js` | *(Opsiyonel)* Node.js + Socket.IO aktarıcı sunucusu |
| `package.json` | Bağımlılıklar ve `npm start` betiği |
| `README.md` | Bu dosya |

---

## 3. Hızlı başlangıç (yerel)

```bash
# 1) Depoyu klonlayın
git clone https://github.com/KULLANICI_ADINIZ/c4nar-quiz.git
cd c4nar-quiz

# 2) index.html'i doğrudan açın (çift tıklama yeterlidir).
#    Veya basit bir yerel sunucu ile açın:
npx serve .
#   → http://localhost:3000
```

Çok oyunculu test için **iki farklı cihaz** (ör. bilgisayar + telefon) aynı sayfayı
açmalıdır. Aynı bilgisayarda test etmek için iki farklı tarayıcı ya da normal +
gizli pencere kullanın.

### Opsiyonel Node.js aktarıcı

```bash
npm install      # socket.io kurulur
npm start        # http://localhost:3000
```

Aynı ağdaki cihazlar `http://<bilgisayarın-ip-adresi>:3000` adresinden bağlanabilir.
Bu sunucu aynı zamanda `index.html`'i de sunar.

---

## 4. GitHub'a yükleme

```bash
git init
git add index.html server.js package.json README.md
git commit -m "C4NAR Quiz: tek dosyalık çok oyunculu bilgi yarışması"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/c4nar-quiz.git
git push -u origin main
```

---

## 5. GitHub Pages ile yayınlama

1. Depoyu açın → **Settings** → **Pages**.
2. **Source**: `Deploy from a branch`
3. **Branch**: `main` / klasör: `/ (root)` → **Save**.
4. Birkaç dakika sonra oyun şu adreste yayında olur:

   ```
   https://KULLANICI_ADINIZ.github.io/c4nar-quiz/
   ```

**Bu adres tek başına yeterlidir** — oyun buradan gerçek çok oyunculu çalışır.
`server.js` gerekmez.

### Backend URL'si ayarı

Oyun genel aktarıcıları kullanır; sabit kodlanmış bir sunucu adresi **yoktur**.
Kendi aktarıcınızı kullanmak isterseniz `index.html` içinde şu satırı düzenleyin:

```js
const RELAYS = [
  'wss://SIZIN-SUNUCUNUZ/',
  'wss://relay.socketo.me/',
  ...
];
```

---

## 6. Ortam değişkenleri (`server.js`)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` / `STARQUIZ_PORT` | `3000` | Dinlenecek port |
| `STARQUIZ_ORIGIN` | `*` | CORS izinli kaynak (ör. `https://adres.github.io`) |

```bash
STARQUIZ_PORT=8080 STARQUIZ_ORIGIN="https://adres.github.io" npm start
```

---

## 7. Node.js barındırma seçenekleri

| Sağlayıcı | Not |
|---|---|
| **Render** | Ücretsiz katman; 15 dk hareketsizlikte uyur |
| **Railway / Fly.io** | Ücretsiz kotalar; WebSocket destekli |
| **Kendi VPS'iniz** | Nginx + `pm2`; en yüksek performans |

Ortak sınırlama: ücretsiz katmanlarda bağlantı sayısı ve çalışma süresi sınırlıdır.
WebSocket bağlantıları bazı sağlayıcılarda ek yapılandırma ister.

---

## 8. Çok oyunculu test (2+ cihaz)

1. Cihaz A: adını yaz, avatarını seç → **ODA KUR**.
2. Ekranda çıkan 5 karakterlik kodu kopyala (ör. `aB7kQ`).
3. Cihaz B: **ODAYA KATIL** → kodu gir → **KATIL**.
4. A cihazında oyuncu listesinin anında güncellendiğini doğrula.
5. Oda sahibi: hazır soruları yükle → süreyi ayarla → **BAŞLAT**.
6. Her iki cihazda 5-4-3-2-1 geri sayımı ve aynı sorular görünmelidir.

> Oda sahibinin sekmesi açık kalmalıdır; oda sahibi ayrılırsa hostluk odadaki en
> eski oyuncuya otomatik devredilir.

---

## 9. Soru veritabanı

| Kategori | Soru sayısı |
|---|---|
| Minecraft | **240** |
| Brawl Stars | **210** |
| Yusufte | **200** |
| **Toplam** | **650** |

- Her soru: benzersiz kimlik, Türkçe soru, 4 Türkçe cevap, doğru cevap indeksi, kategori.
- Sorular her turda **rastgele** seçilir; aynı turda tekrar etmez.
- Önceki turlarda kullanılan sorular, yeterli kullanılmamış soru varsa tercih edilmez.
- Kategoriler birleştirilebilir; hazır sorular editörde düzenlenebilir.
- Tur başına en fazla **12 soru**.

> **Yusufte kategorisi hakkında:** Bu kategoride abone sayısı, izlenme rakamı, video
> başlığı, ekip üyesi adı gibi **zamanla değişen veya kişisel bilgiler sorulmamıştır**.
> Sorular yalnızca herkese açık ve doğrulanabilir genel bilgilere dayanır ve yayından
> önce gözden geçirilmek üzere işaretlenmiştir.

---

## 10. Puanlama

- Doğru cevap: **100 puan**
- Hız bonusu (açıksa): kalan süreye göre **en fazla +50 puan**
- Yanlış cevap: 0 puan, yanlış sayacı artar
- Cevap verilmeyen soru: 0 puan, "cevapsız" sayacı artar

Tüm hesaplama **oda sahibinde (sunucu tarafı)** yapılır; istemci puan gönderemez.

---

## 11. Güvenlik

- Doğru cevap anahtarı soru kapanana kadar istemcilere **gönderilmez**.
- Cevap verme yetkisi, süre kontrolü, tekrar cevap engeli sunucuda denetlenir.
- Oyuncu kimliği mesaj içeriğinden değil, **gönderilen kanaldan** alınır.
- Oda sahibi olmayan bir istemcinin soru düzenleme/başlatma mesajları yok sayılır.
- Kullanıcı metinleri `textContent` ile yazılır (HTML enjeksiyonu yok).
- Yüklenen avatar: yalnızca PNG/JPEG/WEBP/GIF, en fazla 3 MB, 192×192'ye küçültülür.
- Mesaj boyutu ve sohbet uzunluğu sınırlıdır.

---

## 12. Bilinen sınırlar

- WebRTC, çok kısıtlı kurumsal ağlarda (yalnızca TURN gerektiren durumlar) bağlanamayabilir.
- Oda sahibinin bağlantısı koparsa oyun o odada durur; hostluk devri uygulanır.
- Genel aktarıcılar ücretsiz ve zaman zaman yavaş olabilir; kendi aktarıcınız daha hızlıdır.

---

## 13. Lisans

MIT — özgürce kullanabilir, değiştirebilir ve dağıtabilirsiniz.
Tüm görsel ve işitsel varlıklar kod ile üretilmiştir; harici dosya kullanılmaz.
