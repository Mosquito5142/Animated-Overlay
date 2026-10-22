#!/usr/bin/env python3
"""cutkuroko-highlight: เครื่องมือตัดไฮไลท์คลิปเกม Kuroko no Basket

คำสั่ง:
  probe       ดูข้อมูลไฟล์ (ความยาว ขนาด fps เสียง)
  sheets      ทำภาพตัวอย่างทั้งคลิป (contact sheet) มีเวลากำกับทุกช่อง
  transitions หาเฟรมดำ/ฉากเปลี่ยน (ใช้หาจังหวะรีเพลย์หลังทำแต้ม)
  popups      ดึงเฟรมรอบ ๆ เวลาที่กำหนด เพื่ออ่านป๊อปอัปแต้มสะสม
  frame       ดึงเฟรมเดียวแบบเต็มความละเอียดพร้อมเส้นพิกัด (ใช้หาตำแหน่งตัวละคร)
  cut         ตัดหลายช่วงแล้วต่อเป็นไฟล์เดียว + เขียนไฟล์ .segments.json
  endsheets   ดึงเฟรมช่วงท้ายของทุกช่วง (ช่วงลูกลง) ไว้ตรวจงาน
  tiktok      ทำแนวตั้ง 1080x1920 พื้นหลังเบลอ ซูมตามไฟล์ zooms.json และวางโอเวอร์เลย์
"""
import argparse
import json
import math
import os
import subprocess
import sys

import cv2
import numpy as np

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


# ---------- utilities ----------

def parse_time(s):
    """'83.5' หรือ '1:23.5' หรือ '0:01:23' -> วินาที"""
    s = str(s).strip()
    parts = s.split(":")
    t = 0.0
    for p in parts:
        t = t * 60 + float(p)
    return t


def fmt(t):
    m = int(t // 60)
    return f"{m}:{t - m * 60:04.1f}"


def parse_crop(s):
    if not s:
        return None
    x, y, w, h = (int(v) for v in s.split(","))
    return x, y, w, h


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration:stream=codec_type,width,height,r_frame_rate",
         "-of", "json", path],
        capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    n, dn = v["r_frame_rate"].split("/")
    return {
        "duration": float(d["format"]["duration"]),
        "width": int(v["width"]),
        "height": int(v["height"]),
        "fps": float(n) / float(dn),
        "audio": any(s["codec_type"] == "audio" for s in d["streams"]),
    }


def iter_frames(path, fps, width=None, start=0.0, end=None, crop=None, info=None):
    """อ่านเฟรมผ่าน ffmpeg pipe -> (เวลาในไฟล์, ภาพ BGR)"""
    info = info or probe(path)
    vf = []
    if crop:
        x, y, w, h = crop
        vf.append(f"crop={w}:{h}:{x}:{y}")
        sw, sh = w, h
    else:
        sw, sh = info["width"], info["height"]
    width = width or sw
    height = int(round(sh * width / sw / 2)) * 2
    vf += [f"fps={fps}", f"scale={width}:{height}"]
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{start:.3f}"]
    if end is not None:
        cmd += ["-t", f"{max(end - start, 0.01):.3f}"]
    cmd += ["-i", path, "-an", "-vf", ",".join(vf),
            "-f", "rawvideo", "-pix_fmt", "bgr24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    size = width * height * 3
    k = 0
    done = False
    try:
        while True:
            buf = p.stdout.read(size)
            if len(buf) < size:
                done = True
                break
            yield start + k / fps, np.frombuffer(buf, np.uint8).reshape(height, width, 3)
            k += 1
    finally:
        if not done:
            p.kill()  # ผู้เรียกหยุดอ่านกลางทาง
        p.stdout.close()
        p.wait()


def label(img, text, scale=0.5):
    th = int(22 * scale / 0.5)
    tw = int(len(text) * 11 * scale / 0.5) + 8
    cv2.rectangle(img, (0, 0), (tw, th), (0, 0, 0), -1)
    cv2.putText(img, text, (4, int(th * 0.73)), cv2.FONT_HERSHEY_SIMPLEX,
                scale, (255, 255, 255), 1, cv2.LINE_AA)


def write_sheets(frames, out_dir, prefix, cols, rows):
    """frames: iterator ของ (t, img) -> ไฟล์ jpg หลายแผ่น"""
    os.makedirs(out_dir, exist_ok=True)
    per = cols * rows
    paths, chunk = [], []

    def flush():
        h, w = chunk[0][1].shape[:2]
        used = math.ceil(len(chunk) / cols)
        sheet = np.zeros((used * h, cols * w, 3), np.uint8)
        for j, (t, f) in enumerate(chunk):
            f = f.copy()
            label(f, fmt(t))
            r, c = divmod(j, cols)
            sheet[r * h:(r + 1) * h, c * w:(c + 1) * w] = f
        p = os.path.join(out_dir, f"{prefix}_{len(paths) + 1:03d}.jpg")
        cv2.imwrite(p, sheet, [cv2.IMWRITE_JPEG_QUALITY, 85])
        paths.append(p)

    for item in frames:
        chunk.append(item)
        if len(chunk) == per:
            flush()
            chunk = []
    if chunk:
        flush()
    return paths


def encode_args(crf):
    return ["-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf),
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart"]


# ---------- commands ----------

def cmd_probe(a):
    print(json.dumps(probe(a.video), indent=2))


def cmd_sheets(a):
    info = probe(a.video)
    end = parse_time(a.end) if a.end else info["duration"]
    frames = iter_frames(a.video, 1 / a.every, a.width, parse_time(a.start), end,
                         parse_crop(a.crop), info)
    for p in write_sheets(frames, a.out, a.prefix, a.cols, a.rows):
        print(p)


def cmd_transitions(a):
    """เฟรมดำ (blackdetect) และฉากเปลี่ยนแรง ๆ (scene) -> JSON"""
    vf = f"scale=320:-2,blackdetect=d={a.min_black}:pix_th={a.pix_th}"
    if a.scene:
        vf += f",select='gt(scene\\,{a.scene})',showinfo"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", a.video, "-an", "-vf", vf,
                        "-f", "null", "-"], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    blacks, scenes = [], []
    for line in r.stderr.splitlines():
        if "black_start:" in line:
            kv = dict(tok.split(":", 1) for tok in line.split() if ":" in tok)
            s, e = float(kv["black_start"]), float(kv["black_end"])
            blacks.append({"start": round(s, 2), "end": round(e, 2), "at": fmt(s)})
        elif "showinfo" in line and "pts_time:" in line:
            t = float(line.split("pts_time:")[1].split()[0])
            scenes.append({"t": round(t, 2), "at": fmt(t)})
    print(json.dumps({"black": blacks, "scene": scenes}, indent=2, ensure_ascii=False))


def cmd_popups(a):
    info = probe(a.video)
    crop = parse_crop(a.crop)
    for raw in a.times.split(","):
        t = parse_time(raw)
        frames = iter_frames(a.video, 1 / a.step, a.width, max(t - a.before, 0),
                             min(t + a.after, info["duration"]), crop, info)
        for p in write_sheets(frames, a.out, f"popup_{t:07.2f}", a.cols, 100):
            print(p)


def cmd_frame(a):
    info = probe(a.video)
    t = parse_time(a.t)
    crop = parse_crop(a.crop)
    item = next(iter_frames(a.video, info["fps"], None, t, t + 1, crop, info), None)
    if item is None:
        sys.exit(f"อ่านเฟรมที่ {a.t} ไม่ได้")
    img = item[1].copy()
    ox, oy = (crop[0], crop[1]) if crop else (0, 0)
    h, w = img.shape[:2]
    if a.grid:
        for gx in range((ox // a.grid + 1) * a.grid, ox + w, a.grid):
            cv2.line(img, (gx - ox, 0), (gx - ox, h), (0, 255, 255), 1)
            cv2.putText(img, str(gx), (gx - ox + 2, 14), cv2.FONT_HERSHEY_SIMPLEX,
                        0.4, (0, 255, 255), 1, cv2.LINE_AA)
        for gy in range((oy // a.grid + 1) * a.grid, oy + h, a.grid):
            cv2.line(img, (0, gy - oy), (w, gy - oy), (0, 255, 255), 1)
            cv2.putText(img, str(gy), (2, gy - oy - 3), cv2.FONT_HERSHEY_SIMPLEX,
                        0.4, (0, 255, 255), 1, cv2.LINE_AA)
    label(img, fmt(t), 0.6)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    cv2.imwrite(a.out, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    print(a.out)


def parse_segments(s):
    segs = []
    for part in s.split(","):
        a, b = part.split("-")
        segs.append((parse_time(a), parse_time(b)))
    return segs


def cmd_cut(a):
    info = probe(a.video)
    segs = parse_segments(a.segments)
    cmd = ["ffmpeg", "-y", "-v", "error", "-stats"]
    for s, e in segs:
        cmd += ["-ss", f"{s:.3f}", "-t", f"{e - s:.3f}", "-i", a.video]
    n = len(segs)
    if info["audio"]:
        ins = "".join(f"[{i}:v][{i}:a]" for i in range(n))
        fc = f"{ins}concat=n={n}:v=1:a=1[v][a]"
        maps = ["-map", "[v]", "-map", "[a]"]
    else:
        ins = "".join(f"[{i}:v]" for i in range(n))
        fc = f"{ins}concat=n={n}:v=1:a=0[v]"
        maps = ["-map", "[v]"]
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    subprocess.run(cmd + ["-filter_complex", fc] + maps + encode_args(a.crf) + [a.out],
                   check=True)

    table, pos = [], 0.0
    for i, (s, e) in enumerate(segs, 1):
        table.append({"n": i, "src_start": s, "src_end": e,
                      "out_start": round(pos, 3), "out_end": round(pos + e - s, 3)})
        pos += e - s
    seg_path = os.path.splitext(a.out)[0] + ".segments.json"
    with open(seg_path, "w", encoding="utf-8") as f:
        json.dump(table, f, indent=2)
    print(f"{a.out}  ({fmt(pos)})")
    print(seg_path)
    for r in table:
        print(f"  #{r['n']}: src {fmt(r['src_start'])}-{fmt(r['src_end'])}"
              f"  ->  out {fmt(r['out_start'])}-{fmt(r['out_end'])}")


def cmd_endsheets(a):
    info = probe(a.video)
    with open(a.segments_json, encoding="utf-8") as f:
        segs = json.load(f)
    for r in segs:
        e = min(r["out_end"], info["duration"])
        s = max(r["out_start"], e - a.last)
        frames = iter_frames(a.video, 1 / a.step, a.width, s, e, None, info)
        for p in write_sheets(frames, a.out, f"end_{r['n']:02d}", a.cols, 100):
            print(p)


# ---------- tiktok ----------

def smoothstep(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


class Layout:
    """จัดภาพแนวตั้ง: พื้นหลังเบลอ + ภาพเกมตัดกลางสนาม (ซูมได้)"""

    def __init__(self, sw, sh, a, zooms):
        self.sw, self.sh = sw, sh
        self.W, self.H = 1080, 1920
        self.cw = sw * a.fg_width            # ความกว้างที่ตัดจากต้นฉบับ
        self.ch = sh
        self.fw = self.W
        self.fh = int(round(self.W * self.ch / self.cw / 2)) * 2
        self.fy = int(a.fg_y - self.fh / 2)
        self.wide = ((sw - self.cw) / 2 + a.fg_shift, 0.0, self.cw, self.ch)
        self.zooms = zooms
        self.ease_in, self.ease_out = a.ease_in, a.ease_out
        self.blur, self.dim = a.blur, a.dim

    def rect_at(self, t):
        x0, y0, w0, h0 = self.wide
        for z in self.zooms:
            s, e = z["start"], z["end"]
            if s <= t <= e + self.ease_out:
                k = smoothstep((t - s) / self.ease_in) if self.ease_in > 0 else 1.0
                if t > e:
                    k = 1 - smoothstep((t - e) / self.ease_out)
                zw, zh = w0 / z["zoom"], h0 / z["zoom"]
                zx = min(max(z["x"] - zw / 2, 0), self.sw - zw)
                zy = min(max(z["y"] - zh / 2, 0), self.sh - zh)
                return (x0 + (zx - x0) * k, y0 + (zy - y0) * k,
                        w0 + (zw - w0) * k, h0 + (zh - h0) * k)
        return self.wide

    def compose(self, frame, t):
        # พื้นหลัง: ย่อเล็ก -> ตัดให้เต็ม 9:16 -> เบลอ -> ขยาย -> ทำให้มืดลง
        bw, bh = self.W // 8, self.H // 8
        s = max(bw / self.sw, bh / self.sh)
        small = cv2.resize(frame, (max(bw, round(self.sw * s)), max(bh, round(self.sh * s))),
                           interpolation=cv2.INTER_AREA)
        ox, oy = (small.shape[1] - bw) // 2, (small.shape[0] - bh) // 2
        small = cv2.GaussianBlur(small[oy:oy + bh, ox:ox + bw], (0, 0), self.blur / 8)
        out = cv2.resize(small, (self.W, self.H), interpolation=cv2.INTER_LINEAR)
        out = (out * self.dim).astype(np.uint8)
        # ภาพหลัก
        x, y, w, h = self.rect_at(t)
        x, y = int(round(x)), int(round(y))
        w, h = int(round(w)), int(round(h))
        x, y = min(max(x, 0), self.sw - w), min(max(y, 0), self.sh - h)
        fg =cv2.resize(frame[y:y + h, x:x + w], (self.fw, self.fh),
                        interpolation=cv2.INTER_LINEAR)
        y0 = max(self.fy, 0)
        out[y0:y0 + self.fh] = fg[: self.H - y0]
        return out


def overlay_frame(path, t, W, H):
    info = probe(path)
    t = t % info["duration"]
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", path,
                        "-frames:v", "1", "-vf", f"scale={W}:{H}",
                        "-f", "rawvideo", "-pix_fmt", "bgra", "-"],
                       capture_output=True, check=True)
    return np.frombuffer(r.stdout[:W * H * 4], np.uint8).reshape(H, W, 4)


def load_zooms(path):
    if not path:
        return []
    with open(path, encoding="utf-8") as f:
        zs = json.load(f)
    for z in zs:
        z["start"], z["end"] = parse_time(z["start"]), parse_time(z["end"])
        z.setdefault("zoom", 2.0)
    return sorted(zs, key=lambda z: z["start"])


def cmd_tiktok(a):
    info = probe(a.input)
    lay = Layout(info["width"], info["height"], a, load_zooms(a.zooms))

    if a.preview is not None:
        t = parse_time(a.preview)
        item = next(iter_frames(a.input, info["fps"], None, t, t + 1, None, info))
        img = lay.compose(item[1], t)
        if a.overlay:
            ov = overlay_frame(a.overlay, t, lay.W, lay.H).astype(np.float32)
            al = ov[:, :, 3:4] / 255.0
            img = (img * (1 - al) + ov[:, :, :3] * al).astype(np.uint8)
        cv2.imwrite(a.out, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        print(a.out)
        return

    cmd = ["ffmpeg", "-y", "-v", "error",
           "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{lay.W}x{lay.H}",
           "-r", str(a.fps), "-i", "-", "-i", a.input]
    if a.overlay:
        cmd += ["-stream_loop", "-1", "-i", a.overlay,
                "-filter_complex",
                f"[2:v]scale={lay.W}:{lay.H},format=rgba[ov];"
                f"[0:v][ov]overlay=0:0:shortest=1:format=auto,format=yuv420p[v]",
                "-map", "[v]"]
    else:
        cmd += ["-map", "0:v"]
    if info["audio"]:
        cmd += ["-map", "1:a"]
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    cmd += encode_args(a.crf) + ["-r", str(a.fps), "-shortest", a.out]

    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    total = int(info["duration"] * a.fps)
    n = 0
    try:
        for t, frame in iter_frames(a.input, a.fps, None, 0, None, None, info):
            enc.stdin.write(lay.compose(frame, t).tobytes())
            n += 1
            if n % 150 == 0:
                print(f"  {n}/{total} เฟรม ({fmt(t)})", flush=True)
    finally:
        enc.stdin.close()
        enc.wait()
    if enc.returncode != 0:
        sys.exit("ffmpeg เข้ารหัสไม่สำเร็จ")
    print(f"{a.out}  ({n} เฟรม)")


# ---------- main ----------

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("probe")
    p.add_argument("video")
    p.set_defaults(fn=cmd_probe)

    p = sub.add_parser("sheets")
    p.add_argument("video")
    p.add_argument("--out", required=True)
    p.add_argument("--prefix", default="sheet")
    p.add_argument("--every", type=float, default=2.0, help="วินาทีต่อช่อง")
    p.add_argument("--width", type=int, default=320)
    p.add_argument("--cols", type=int, default=6)
    p.add_argument("--rows", type=int, default=5)
    p.add_argument("--start", default="0")
    p.add_argument("--end")
    p.add_argument("--crop", help="x,y,w,h เช่นตัดเฉพาะสกอร์บอร์ด")
    p.set_defaults(fn=cmd_sheets)

    p = sub.add_parser("transitions")
    p.add_argument("video")
    p.add_argument("--min-black", type=float, default=0.1)
    p.add_argument("--pix-th", type=float, default=0.10)
    p.add_argument("--scene", type=float, default=0, help="เช่น 0.4 เพื่อหาฉากเปลี่ยนด้วย")
    p.set_defaults(fn=cmd_transitions)

    p = sub.add_parser("popups")
    p.add_argument("video")
    p.add_argument("--times", required=True, help="เช่น 0:05,0:28,1:26")
    p.add_argument("--out", required=True)
    p.add_argument("--before", type=float, default=1.0)
    p.add_argument("--after", type=float, default=4.0)
    p.add_argument("--step", type=float, default=0.5)
    p.add_argument("--width", type=int, default=640)
    p.add_argument("--cols", type=int, default=4)
    p.add_argument("--crop")
    p.set_defaults(fn=cmd_popups)

    p = sub.add_parser("frame")
    p.add_argument("video")
    p.add_argument("--t", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--grid", type=int, default=100)
    p.add_argument("--crop")
    p.set_defaults(fn=cmd_frame)

    p = sub.add_parser("cut")
    p.add_argument("video")
    p.add_argument("--segments", required=True, help="เช่น 0:01-0:07,0:19-0:30")
    p.add_argument("--out", required=True)
    p.add_argument("--crf", type=int, default=20)
    p.set_defaults(fn=cmd_cut)

    p = sub.add_parser("endsheets")
    p.add_argument("video")
    p.add_argument("--segments-json", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--last", type=float, default=4.0)
    p.add_argument("--step", type=float, default=0.5)
    p.add_argument("--width", type=int, default=320)
    p.add_argument("--cols", type=int, default=4)
    p.set_defaults(fn=cmd_endsheets)

    p = sub.add_parser("tiktok")
    p.add_argument("input")
    p.add_argument("--out", required=True)
    p.add_argument("--overlay", help="ไฟล์ .mov/.webm พื้นหลังโปร่งใส 1080x1920 (วนซ้ำ)")
    p.add_argument("--zooms", help="ไฟล์ JSON ช่วงซูม")
    p.add_argument("--fg-width", type=float, default=0.75, help="สัดส่วนความกว้างที่ตัดจากกลางภาพ")
    p.add_argument("--fg-shift", type=float, default=0, help="เลื่อนกรอบตัดซ้าย(-)/ขวา(+) เป็นพิกเซล")
    p.add_argument("--fg-y", type=int, default=960, help="จุดกึ่งกลางแนวตั้งของภาพหลัก")
    p.add_argument("--ease-in", type=float, default=0.5)
    p.add_argument("--ease-out", type=float, default=0.0)
    p.add_argument("--blur", type=float, default=30)
    p.add_argument("--dim", type=float, default=0.6)
    p.add_argument("--fps", type=int, default=30)
    p.add_argument("--crf", type=int, default=20)
    p.add_argument("--preview", help="เรนเดอร์ภาพนิ่งเดียวที่เวลานี้ (ใส่ --out เป็น .jpg)")
    p.set_defaults(fn=cmd_tiktok)

    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
