# Animated-Overlay

สร้างกรอบ/ป้ายโฆษณาแบบเคลื่อนไหวที่มี**พื้นหลังโปร่งใส** แล้วเอาไปวางบน Track บนสุดของโปรแกรมตัดต่อ (FilmCraft, Premiere, DaVinci, CapCut ฯลฯ)
ทำไฟล์เดียว ใช้กับคลิปไหนก็ได้ ส่วนแผนงานดูได้ที่ [PLAN.md](PLAN.md)

## ติดตั้ง

ต้องมี [Node.js](https://nodejs.org) 18 ขึ้นไป และ [FFmpeg](https://ffmpeg.org/download.html) (ต้องเรียก `ffmpeg` จาก command line ได้)

```bash
npm install                       # ติดตั้งแพ็กเกจ (ต้องทำก่อนใช้ทุกคำสั่ง)
npx playwright install chromium   # ทำครั้งแรกครั้งเดียว
npm run check                     # ตรวจว่าเครื่องพร้อม
```

**Windows (PowerShell):** ติดตั้ง FFmpeg ได้ด้วยคำสั่ง `winget install Gyan.FFmpeg` แล้ว**ปิดและเปิด PowerShell ใหม่**ก่อนรัน `npm run check`

> ถ้าเจอ `Cannot find package 'playwright'` แปลว่ายังไม่ได้รัน `npm install` ในโฟลเดอร์โปรเจกต์

## ใช้งาน

```bash
npm start
```
แล้วเปิด **http://127.0.0.1:5173** ในเบราว์เซอร์ จะเจอหน้า **Studio**:

- **งานของฉัน:** งานทุกชิ้นพร้อมภาพตัวอย่างที่ขยับได้ ทุกงานมีปุ่ม
  - **✏️ ปรับแต่ง:** ลากวาง, แก้ข้อความ/สี/ขนาด, เปิด/ปิดชิ้นส่วน
  - **▶ ดูตัวอย่าง**
  - **🎬 เรนเดอร์:** มีแถบความคืบหน้า เสร็จแล้วมีลิงก์ดาวน์โหลดไฟล์
  - **⧉ ทำสำเนา**
- **สร้างงานใหม่จากเทมเพลต:** ตั้งชื่อ เลือกแนวนอน/แนวตั้ง แล้วกด "ใช้เทมเพลตนี้" ระบบจะเปิดหน้าปรับแต่งให้ทันที หรือกด "ลองปรับดูก่อน" เพื่อลองเล่นโดยยังไม่บันทึก
- ทุกหน้ามีปุ่มกลับหน้าแรก และสลับระหว่างหน้า "ดูตัวอย่าง" กับ "ปรับแต่ง" ได้

แต่ละงานคือไฟล์ `<ชื่อ>.config.json` ในโฟลเดอร์โปรเจกต์ ไฟล์ที่เรนเดอร์ได้จะอยู่ใน `output/`

### ใช้ผ่าน command line

```bash
npm run render                     # ได้ output/overlay.mov (ProRes 4444) + output/overlay.webm
npm run still                      # ได้ output/overlay.png ภาพนิ่งโปร่งใส
npm run composite -- --bg clip.mp4 # ซ้อน overlay ลงคลิปจริง → output/overlay-composite.mp4
npm run render -- -c popup.config.json   # เรนเดอร์งานอื่น
```

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
