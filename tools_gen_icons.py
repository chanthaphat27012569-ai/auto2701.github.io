# -*- coding: utf-8 -*-
"""สร้างไอคอน PWA จากรูปทรงโลโก้ SMS (ทรงเดียวกับ SMS_SCHOOL_LOGO ใน data.js)"""
from PIL import Image, ImageDraw

OUT = "icons"
import os
os.makedirs(OUT, exist_ok=True)

C1 = (99, 102, 241)    # #6366F1
C2 = (139, 92, 246)    # #8B5CF6


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def make_gradient(size):
    """ไล่เฉดทแยงจาก #6366F1 (มุมบนซ้าย) ไป #8B5CF6 (มุมล่างขวา)"""
    small = 256
    img = Image.new("RGB", (small, small))
    px = img.load()
    for y in range(small):
        for x in range(small):
            t = (x + y) / (2 * (small - 1))
            px[x, y] = lerp(C1, C2, t)
    return img.resize((size, size), Image.BILINEAR)


def rounded_mask(size, radius_frac):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    r = int(size * radius_frac)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return m


def draw_logo(canvas_size, content_scale=1.0, rounded=False):
    """วาดโลโก้ลงบนแคนวาสโปร่งใสแล้วคืนเป็น RGBA"""
    SS = 4                       # supersample กันขอบหยัก
    S = canvas_size * SS
    s = S / 100.0                # scale จากพิกัดต้นแบบ 100x100

    base = make_gradient(S)
    if rounded:
        mask = rounded_mask(S, 0.26)
        base = base.convert("RGBA")
        base.putalpha(mask)
    else:
        base = base.convert("RGBA")
    d = ImageDraw.Draw(base, "RGBA")

    def p(v):
        return v * s

    # ปรับสเกลเนื้อหาให้อยู่ใน safe zone (สำหรับ maskable)
    cx = cy = 50.0
    k = content_scale

    def q(v, axis):
        return (v - (cx if axis == "x" else cy)) * k + (cx if axis == "x" else cy)

    def X(v):
        return p(q(v, "x"))

    def Y(v):
        return p(q(v, "y"))

    def W(v):
        return v * s * k

    # ตัวบ้าน (สีเหลืองอ่อน) + หลังคา (ส้ม)
    d.polygon([(X(50), Y(14)), (X(82), Y(35)), (X(82), Y(83)), (X(18), Y(83)), (X(18), Y(35))],
              fill=(253, 230, 138, 255))
    d.rounded_rectangle([X(18), Y(35), X(82), Y(83)], radius=W(3.5),
                        fill=(253, 230, 138, 255))
    d.polygon([(X(50), Y(14)), (X(82), Y(35)), (X(18), Y(35))],
              fill=(245, 158, 11, 255))

    # หน้าปัดนาฬิกา
    d.ellipse([X(40), Y(31), X(60), Y(51)], fill=(255, 255, 255, 255))
    d.ellipse([X(42.4), Y(33.4), X(57.6), Y(48.6)], fill=(248, 250, 252, 255))
    d.line([(X(50), Y(41)), (X(50), Y(35))], fill=(79, 70, 229, 255), width=max(1, int(W(2))))
    d.line([(X(50), Y(41)), (X(54.6), Y(41))], fill=(236, 72, 153, 255), width=max(1, int(W(2))))

    # หน้าต่าง 2 บาน
    for x0 in (28, 59):
        d.rounded_rectangle([X(x0), Y(57), X(x0 + 13), Y(70)], radius=W(3.5),
                            fill=(56, 189, 248, 255))
        d.line([(X(x0 + 6.5), Y(57)), (X(x0 + 6.5), Y(70))], fill=(255, 255, 255, 255),
               width=max(1, int(W(1.4))))
        d.line([(X(x0), Y(63.5)), (X(x0 + 13), Y(63.5))], fill=(255, 255, 255, 255),
               width=max(1, int(W(1.4))))

    # ประตูสีชมพู + ลูกบิด
    d.rounded_rectangle([X(43), Y(63), X(57), Y(83)], radius=W(3),
                        fill=(236, 72, 153, 255))
    d.rectangle([X(43), Y(76), X(57), Y(83)], fill=(236, 72, 153, 255))
    d.ellipse([X(51.2), Y(72.2), X(54.8), Y(75.8)], fill=(253, 224, 71, 255))

    # ดาวมุมขวาบน
    star = [(85, 18), (87, 23), (92, 24), (87, 27), (85, 32), (83, 27), (78, 24), (83, 23)]
    d.polygon([(X(px_), Y(py_)) for px_, py_ in star], fill=(244, 63, 94, 255))

    return base.resize((canvas_size, canvas_size), Image.LANCZOS)


def save(img, path, sizes=None, ico=False):
    if ico:
        img.save(path, format="ICO", sizes=sizes or [(16, 16), (32, 32), (48, 48)])
        print("saved", path, "(ico)")
        return
    img.save(path, format="PNG", optimize=True)
    print("saved", path, img.size)


# ไอคอนทั่วไป (มุมมน โปร่งใส) — สำหรับ home screen ปกติ / favicon
save(draw_logo(512, rounded=True), f"{OUT}/icon-512.png")
save(draw_logo(192, rounded=True), f"{OUT}/icon-192.png")
save(draw_logo(64, rounded=True), f"{OUT}/favicon.png")

# maskable — พื้นเต็มหน้าจอ + เนื้อหาหดเข้า safe zone 80%
save(draw_logo(512, content_scale=0.82, rounded=False), f"{OUT}/icon-maskable-512.png")

# Apple touch icon — เต็มหน้าจอ (iOS มาส์กทรงให้เอง)
save(draw_logo(180, content_scale=0.9, rounded=False), f"{OUT}/apple-touch-icon.png")

# favicon.ico หลายขนาด
ico_src = draw_logo(48, rounded=True)
save(ico_src, "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], ico=True)
print("done")
