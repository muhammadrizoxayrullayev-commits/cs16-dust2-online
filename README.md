# Counter-Strike 1.6: Dust II Online (Web 3D FPS)

> **CS 1.6 ning 1-ga-1 nusxasi (de_dust2, qurollar, personajlar, iqtisodiyot, IP orqali tarmoqda o'ynash va 24/7 server)**

![CS 1.6 Banner](https://img.shields.io/badge/Counter--Strike-1.6_Dust_II-orange?style=for-the-badge&logo=counter-strike)
![Platform](https://img.shields.io/badge/Platform-Mac_|_Windows_|_Linux-blue?style=for-the-badge)
![FPS](https://img.shields.io/badge/FPS-60--120+-green?style=for-the-badge)
![Multiplayer](https://img.shields.io/badge/Multiplayer-IP_Direct_Connect-red?style=for-the-badge)
![Hosting](https://img.shields.io/badge/24%2F7_Server-Docker_|_PM2_|_Cloud-yellow?style=for-the-badge)

---

## 🇺🇿 O'zbekcha Qo'llanma

Ushbu loyiha afsonaviy **Counter-Strike 1.6** o'yinining to'liq veb-versiyasi bo'lib, Three.js 3D grafika dvigateli va Node.js WebSocket real-vaqt serveri asosida qurilgan. Hech qanday o'rnatish talab qilmasdan to'g'ridan-to'g'ri brauzerda (Mac, Windows, Linux) yuqori FPS da ishlaydi.

### Asosiy Xususiyatlar:
1. **de_dust2 Xaritasi (1-ga-1)**:
   - **T Spawn**, **Suicide**, **Outside Long**, **Long Doors**, **Pit**, **Ramp**.
   - **Bombsite A**: platforma, afsonaviy ikkitalik qutilar (A-site boxes), Goose burchagi, Catwalk / Short A zina.
   - **Middle**: Mid eshiklari (o'rtasida AWP snayper tirqishi bilan), Xbox qutisi, pastki tunnellar.
   - **Tunnels**: Yuqori tunnel (Upper Dark) va pastki tunnel (Lower Dark).
   - **Bombsite B**: B platformasi, B qutilari, B deraza (window) va B eshiklari.
   - **CT Spawn**: orqa maydon, A ga chiquvchi yo'l va B ga o'tuvchi koridor.

2. **Personajlar (1-ga-1 model va animatsiyalar)**:
   - **Terroristlar (T)**: Phoenix Connexion — qizil/jigarrang kamuflyaj nimcha, qora balaklava niqob, harbiy shim va etaklar.
   - **Counter-Terroristlar (CT)**: Seal Team 6 / Urban — to'q ko'k rangli maxsus kiyim, jangovar dubulg'a, himoya ko'zoynagi va Kevlar nimcha.
   - Yurish animatsiyalari, o'tirish (crouch), sakrash, boshga otish (Headshot) hitbokslari va yiqilish (ragdoll) effektlari.

3. **Qurollar va Boshqaruv (CS 1.6 Arsenali)**:
   - **AK-47**: Klassik yog'och qo'ndoq, po'lat stvol, kuchli zarba (boshga 1 ta o'q).
   - **M4A1**: Glushitel (silencer) o'rnatilgan aniq zarbali karabin.
   - **AWP Magnum Sniper**: Ko'krak yoki boshga 1 ta otishda yo'q qiluvchi snayper (O'ng tugma orqali optik zum).
   - **Desert Eagle (.50 AE)**: Og'ir to'pponcha.
   - **Glock-18** va **USP .45 Tactical**: Standart to'pponchalar.
   - **Tactical Knife**: Pichoq bilan tezkor zarba.
   - **C4 Explosive**: Bomba o'rnatish (Site A yoki B da E yoki sichqoncha bilan 3.2 soniya).
   - **Defuse Kit**: CT lar uchun 5 soniyada bombani zararsizlantirish (usiz 10 soniya).

4. **CS 1.6 Iqtisodiyoti (Economy & Buy Menu)**:
   - `B` tugmasini bosib qurollar do'konini ochish:
     - **Pistols**: Glock ($400), USP ($500), Deagle ($650)
     - **Shotguns**: M3 Super 90 ($1700)
     - **SMGs**: MP5 Navy ($1500), P90 ($2350)
     - **Rifles**: AK-47 ($2500), M4A1 ($3100), AWP ($4750)
     - **Equipment**: Kevlar ($650), Kevlar + Dubulg'a ($1000), Defuse Kit ($200)
   - **Pul mukofotlari**:
     - Boshlang'ich summa: **$800**
     - Har bir dushmanni o'ldirganda: **+$300** (Pichoqda: **+$1500**)
     - Raundda yutganda: **+$3,250** (yo'q qilish) / **+$3,500** (bomba portlaganda yoki zararsizlantirilganda)
     - Raundda yutqazganda: **+$1,400** (ketma-ket yutqazilganda har safar +$500 qo'shiladi, maksimal $3,400 gacha)
     - Bomba qo'yilgan bo'lsa (T lar yutqazsa ham): har bir Terroristga **+$800** bonus.
     - Maksimal pul: **$16,000**.

5. **Tezkor O'yin (Instant Play with Bots)**:
   - Hech qanday IP kiritish majburiyati yo'q! Kirishingiz bilan **▶ PLAY NOW (INSTANT WITH BOTS)** tugmasini bosasiz va darhol xaritada aqlli botlar bilan o'yin boshlanadi.

6. **CS 1.6 Dasturchilar Konsoli (Developer Console `~`)**:
   - Klaviaturada **`~`** (Tilda / Backquote) tugmasini yoki ekrandagi **`[~] CONSOLE`** tugmasini bosib konsolni ochishingiz mumkin.
   - **`status`**: Serverning barcha ma'lumotlari va ulanish uchun tayyor IP manzillarini ko'rsatadi (masalan: `connect 172.20.10.2:3000`).
   - **`connect <ip:port>`**: Boshqa o'yinchi / do'stingizning serveriga IP orqali to'g'ridan-to'g'ri ulanish (masalan: `connect 192.168.1.15:3000`).
   - **`add_bot [soni]`**: Kerakli miqdordagi botlarni qo'shish (masalan: `add_bot 4` bir vaqtning o'zida 4 ta bot qo'shadi).
   - **`kick_bot`**: Barcha botlarni serverdan chiqarib yuborish.
   - **`restart`**: Raundni qaytadan boshlash (`sv_restart 1`).
   - **`help`**: Barcha buyruqlar ro'yxatini chiqarish.

7. **24/7 Uzluksiz Ishlash**:
   - `start-24-7.sh` skripti serverni fonda ishga tushiradi va server qulasa avtomatik 2 soniyada qayta ko'taradi.
   - `docker-compose up -d` orqali Docker konteynerida butun umr 24/7 ishlash kafolati.
   - Render.com yoki har qanday VPS da `render.yaml` orqali bepul 24/7 hosting.

---

## 🎮 O'yin Boshqaruvi (Controls)

| Tugma | Vazifasi |
| :--- | :--- |
| **W, A, S, D** | Oldinga, chapga, orqaga, o'ngga harakat |
| **Sichqoncha** | Qarab nishonga olish |
| **Chap tugma (LMB)** | Otish / C4 o'rnatish |
| **O'ng tugma (RMB)** | Snayper zumini ochish / Maxsus rejim |
| **Space** | Sakrash |
| **Ctrl yoki C** | O'tirish (Crouch) |
| **Shift** | Sekin va tovushsiz yurish (Walk) |
| **R** | Qurolni o'q bilan to'ldirish (Reload) |
| **B** | Qurollar do'koni (Buy Menu) |
| **E** | Bombani zararsizlantirish (Defuse) / Ishlatish |
| **1, 2, 3, 4, 5** | Qurollarni almashtirish (Miltiq, To'pponcha, Pichoq, Granata, C4) |
| **TAB** | Natijalar jadvali (Scoreboard: Ping, Kills, Deaths) |
| **Y** | Chat yozish |

---

## 🚀 Ishga Tushirish (How to Run)

### 1-Usul: Tezkor Mahalliy Ishga Tushirish (Local Dev)
```bash
# Kutubxonalarni o'rnatish
npm install

# Serverni ishga tushirish
npm start
# yoki
node server.js
```
Brauzerda oching: **`http://localhost:3000`**

### 2-Usul: Do'stlar bilan IP orqali Tarmoqda O'ynash (LAN / Wi-Fi)
1. Server ishga tushganda konsolda sizning mahalliy IP manzilingiz chiqadi (masalan: `192.168.1.50:3000`).
2. Do'stingiz Mac yoki Windows kompyuteridagi brauzerga kirib shu IP manzilni kiritadi:
   `http://192.168.1.50:3000`
3. O'yin ochilganda "Multiplayer Server Address" qatoriga server IP sini kiritadi va **JOIN MATCH** tugmasini bosadi!

### 3-Usul: 24/7 Fondagi Daemon Rejimi
```bash
./start-24-7.sh
```
Server kompyuter o'chmaguncha doimiy fonda ishlaydi, xatolik yuz bersa o'zi qayta ishga tushadi.

### 4-Usul: Docker orqali 24/7 Ishga Tushirish
```bash
docker-compose up -d
```

### 5-Usul: Bulutda (Cloud) Butun Dunyo Uchun 24/7 Hosting (Render.com / Railway)
1. GitHub repozitoriyasini [Render.com](https://render.com) ga ulang.
2. `render.yaml` faylini tanlang.
3. Server 24/7 bepul ishlaydi va sizga `https://cs16-dust2-online.onrender.com` kabi bepul manzil beradi.
4. Bu manzilni istalgan do'stingizga yuborsangiz, dunyoning istalgan nuqtasidan Mac yoki Windows orqali to'g'ridan-to'g'ri brauzerdan ulanib o'ynashlari mumkin!
