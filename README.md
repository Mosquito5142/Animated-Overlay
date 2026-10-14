# Animated-Overlay

สร้างกรอบ/ป้ายโฆษณาแบบเคลื่อนไหวที่มี**พื้นหลังโปร่งใส** แล้วเอาไปวางบน Track บนสุดของโปรแกรมตัดต่อ (FilmCraft, Premiere, DaVinci, CapCut ฯลฯ)
ทำไฟล์เดียว ใช้กับคลิปไหนก็ได้ ส่วนแผนงานดูได้ที่ [PLAN.md](PLAN.md)

## ติดตั้ง

ต้องมี [Node.js](https://nodejs.org) 18 ขึ้นไป และ [FFmpeg](https://ffmpeg.org/download.html) (ต้องเรียก `ffmpeg` จาก command line ได้)

```bash
npm install
npx playwright install chromium   # ทำครั้งแรกครั้งเดียว
npm run check                     # ตรวจว่าเครื่องพร้อม
```

## ใช้งาน

```bash
npm run preview                    # เปิด http://127.0.0.1:5173 เพื่อดู overlay ขยับจริง
npm run render                     # ได้ output/overlay.mov (ProRes 4444) + output/overlay.webm
npm run still                      # ได้ output/overlay.png ภาพนิ่งโปร่งใส
npm run composite -- --bg clip.mp4 # ซ้อน overlay ลงคลิปจริง → output/overlay-composite.mp4
```

### เทมเพลต

| เทมเพลต | สไตล์ | ไฟล์ตัวอย่าง |
|---|---|---|
| `sponsor-gaming` | ชุดโฆษณาคลิปเกมครบชุด (HIGHLIGHT, โดเนท, กรอบกล้อง, แถบโปรโม, ตัววิ่ง) | `overlay.config.json`, `vertical.config.json` |
| `sponsor-popup` | ป้ายสปอนเซอร์**เด้งเข้ามุมจอ**ทีละอัน แล้วสไลด์ออก + ป้ายเล็กถาวร | `popup.config.json` |
| `neon-frame` | **กรอบไฟนีออน**รอบจอ: แสงวิ่ง / กะพริบ / หายใจ / สายรุ้ง + หลอดไฟ + มุมกรอบ + ป้ายข้อความ | `neon.config.json` |

สร้าง config ของตัวเองจากเทมเพลตไหนก็ได้ แล้วแต่งให้เป็นแบบของคุณ:

```bash
npm run templates                                   # ดูรายชื่อเทมเพลต
npm run new -- sponsor-popup mybrand.config.json    # สร้าง config ใหม่
npm run new -- neon-frame mylive.config.json --vertical   # แนวตั้ง
npm run edit -- -c mybrand.config.json              # แต่งด้วยการลากวาง
npm run render -- -c mybrand.config.json            # ได้ output/mybrand.mov
```

**sponsor-popup:** ป้ายแต่ละอันมี `start` (วินาทีที่เริ่มโผล่), `hold` (ค้างกี่วินาที), `color`, `tag`, `title`, `subtitle`, `image`
- ป้ายจะเด้งเข้ามาจากขอบจอที่ใกล้ที่สุด ลากไปมุมไหนก็เด้งจากขอบนั้น หรือบังคับทิศด้วย `from`
- กด "ทำสำเนา" เพื่อเพิ่มป้าย (ระบบตั้งเวลาให้โผล่ต่อจากป้ายเดิม) หรือกด "ลบ"
- ใส่ `persistent: true` ถ้าอยากให้ป้ายค้างตลอด และ `compact: true` ถ้าอยากได้ป้ายเล็ก
- ความยาวรวม (`duration`) ควรมากกว่าเวลาเริ่มของป้ายสุดท้าย + `hold` + 1.2 วินาที

**neon-frame:**
- `frame.effect` = `chase` / `blink` / `pulse` / `rainbow`
- `bulbs.pattern` = `alternate` / `chase` / `twinkle`
- `theme.primary` / `theme.secondary` คือสีไฟ 2 สี
- ทุกอย่างคำนวณตามขนาดจอ ใช้กับแนวตั้งได้ทันที

### หน้าแก้ไขแบบลากวาง

```bash
npm run edit                       # เปิด http://127.0.0.1:5173/?mode=edit
npm run edit:vertical              # แก้เลย์เอาต์แนวตั้ง
```

- **ลาก**ชิ้นส่วนบนจอเพื่อย้าย ลูกศรขยับทีละ 1px (กด Shift ค้างไว้ = 10px)
- แผงด้านขวาใช้**ติ๊กเปิด/ปิด**ชิ้นส่วน, **ปรับขนาด**, แก้**ข้อความ/ราคา/รูป**, เปลี่ยน**สี**, และตั้งรูปพื้นหลังตัวอย่าง
- ช่อง "แสดงทุกชิ้นค้างไว้" ทำให้ป้ายที่โผล่เป็นช่วงๆ แสดงค้างไว้ให้ลากได้ ถ้าปิดไว้จะเห็นจังหวะจริง
- **Ctrl+S** บันทึกกลับลงไฟล์ config (ถ้าค่าผิด ระบบจะไม่เขียนทับไฟล์เดิม) / **Ctrl+Z** ย้อนกลับ
- ตำแหน่งจะยึดกับขอบจอที่ใกล้ที่สุด เช่น ป้ายมุมขวาบนจะยึดขอบขวาและขอบบน
- แก้เสร็จแล้วสั่ง `npm run render` ตามปกติ

### คลิปแนวตั้ง (Shorts / TikTok / Reels)

ใช้ `vertical.config.json` (1080×1920) เลย์เอาต์จะจัดใหม่ให้อัตโนมัติ และเว้นขอบขวากับขอบล่างไว้ให้ปุ่มและคำบรรยายของแอป

```bash
npm run preview:vertical
npm run render:vertical            # ได้ output/vertical.mov + output/vertical.webm
npm run still:vertical
npm run composite -- -c vertical.config.json --bg short.mp4
```

ระบบเลือกเลย์เอาต์ตาม `resolution` (สูงกว่ากว้างจะเป็นแนวตั้ง) หรือบังคับเองด้วย `"layout": "portrait"` / `"landscape"` ใน config

ตัวเลือกที่ใช้บ่อย (ใส่หลัง `--` เช่น `npm run render -- --intro`):

| ตัวเลือก | ความหมาย |
|---|---|
| `-c, --config <ไฟล์>` | ใช้ config อื่น เช่น `-c sponsorB.config.json` (ชื่อไฟล์ผลลัพธ์จะตามชื่อ config) |
| `-f, --format prores,webm,png` | เลือกชนิดไฟล์ที่จะได้ |
| `-d, --duration 15` / `--fps 60` | ความยาวและเฟรมเรต |
| `--intro` | มีแอนิเมชันเข้าฉากตอนต้น (ไฟล์จะวนลูปไม่เนียน ใช้ต่อหัวคลิป) |
| `-o, --out <โฟลเดอร์>` | โฟลเดอร์ผลลัพธ์ |

ดู preview บนพื้นหลังจริงได้โดยเอารูปหรือคลิปไปไว้ใน `assets/` แล้วเปิด `http://127.0.0.1:5173/?bg=assets/ชื่อไฟล์.jpg`
หรือใส่ไว้ใน `preview.background` ของ config ก็ได้

## ใส่ใน FilmCraft / โปรแกรมตัดต่อ

1. วางคลิปเกมไว้ **Track 1**
2. ลาก `output/overlay.mov` ไปไว้ **Track บนสุด**
3. ไฟล์วนลูปได้เนียน ถ้าคลิปยาวกว่าให้วางต่อกันหรือตั้ง Loop
4. ถ้าโปรแกรมไม่เห็นพื้นหลังโปร่งใส ลอง `.webm` หรือ PNG sequence (`-f png`)

## แก้ข้อความ / โลโก้ / ตำแหน่ง

แก้ได้ทั้งหมดใน `overlay.config.json` ไม่ต้องแตะโค้ด

| คีย์ใน `elements` | ชิ้นส่วน |
|---|---|
| `highlight` | ป้าย HIGHLIGHT ขวาบน |
| `topDonate` | กล่อง TOP DONATE (`name`, `amount`, `currency`) |
| `sponsorLogo` | โลโก้สปอนเซอร์ (`image` หรือ `text`) |
| `webcamFrame` | กรอบกล้อง ตรงกลางโปร่งใส (`channel`, `label`, `live`, `camSize`) |
| `promoBar` | แถบโปรโมชันด้านล่าง (`logo`, `text`, `oldPrice`, `price`, `unit`, `note`) |
| `ticker` | ข้อความวิ่ง (`tag`, `items`, `speed` px/วินาที) |
| `notice` | กล่องข้อความที่วนเปลี่ยน (`messages`, `secondsEach`) |

- ปิดชิ้นไหนก็ใส่ `"enabled": false`
- ย้ายตำแหน่ง/ขนาดได้ด้วย `"style"` เช่น `"style": { "top": 40, "right": 60, "transform-origin": "right top", "scale": "1.2" }` (ตัวเลขหน่วยเป็น px)
- เปลี่ยนสีทั้งชุดได้ที่ `theme.primary` / `theme.accent` / `theme.panel`
- ใส่โลโก้ของตัวเองใน `assets/` (แนะนำ PNG หรือ SVG ที่พื้นหลังโปร่งใส) แล้วแก้ path ใน config

> โลโก้ใน `assets/logos/` เป็นแค่ตัวอย่าง ให้เปลี่ยนเป็นโลโก้จริงที่ได้รับอนุญาตให้ใช้

## ทำเทมเพลตใหม่

สร้างโฟลเดอร์ `templates/<ชื่อ>/` ที่มี `index.html`, `style.css`, `timeline.js` (ก๊อปจาก `sponsor-gaming` ไปแก้ก็ได้) แล้วตั้ง `"template": "<ชื่อ>"` ใน config

`timeline.js` export ออบเจกต์ที่มี (ใส่ `data-key="<ชื่อใน config>"` ให้ element หลักของแต่ละชิ้น หน้าแก้ไขจะลากได้):
- `build(stage, ctx)`: สร้าง DOM จาก `ctx.config`
- `measure()` (ไม่ใส่ก็ได้): วัดขนาดหลังโหลดฟอนต์/รูปเสร็จ
- `frame(t, ctx)`: จัดท่าทางทุกชิ้นที่เวลา `t` วินาที
- `labels` (ไม่ใส่ก็ได้): ชื่อภาษาไทยของแต่ละชิ้นที่จะแสดงในหน้าแก้ไข
- `fixed`, `dynamic`, `choices`, `labelFor`, `onDuplicate` (ไม่ใส่ก็ได้): ตัวเลือกของหน้าแก้ไข ดูตัวอย่างจาก `sponsor-popup` และ `neon-frame`
- `default.config.json`: config เริ่มต้นที่คำสั่ง `new` จะคัดลอกไปให้ ใส่ `description` ไว้แสดงใน `npm run templates`

**กติกา:** ทุกการขยับต้องคำนวณจาก `t` เท่านั้น ห้ามใช้ CSS animation/transition หรือ timer
ใช้ `ctx.cycle(t, คาบโดยประมาณ)` สำหรับแอนิเมชันที่วนซ้ำ ระบบจะปัดคาบให้หารความยาวลงตัว ไฟล์จึงวนลูปได้เนียน

## ไลเซนส์ของ asset
ฟอนต์ Kanit ใช้ SIL Open Font License 1.1 (ดู `assets/fonts/kanit/OFL.txt`)
