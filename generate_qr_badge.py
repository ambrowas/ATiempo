from PIL import Image, ImageDraw, ImageFont
import qrcode

# === Employee info ===
employee_id = "2847893"
employee_name = "Víctor Elebi"
photo_path = "foto_2847893.jpg"   # Replace with your actual path
output_file = f"qr_badge_{employee_id}.png"

# === Step 1: Create the QR code ===
qr = qrcode.QRCode(
    version=1,
    box_size=10,
    border=4
)
qr.add_data(employee_id)
qr.make(fit=True)
qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

# === Step 2: Resize employee photo ===
try:
    photo = Image.open(photo_path).convert("RGB")
    photo = photo.resize((140, 140))
except FileNotFoundError:
    # Placeholder if no photo
    photo = Image.new("RGB", (140, 140), (200, 200, 200))
    draw = ImageDraw.Draw(photo)
    draw.text((20, 60), "No Foto", fill="black")

# === Step 3: Combine photo + QR + text ===
badge_width = qr_img.width + photo.width + 60
badge_height = max(qr_img.height, photo.height) + 100

badge = Image.new("RGB", (badge_width, badge_height), "white")
draw = ImageDraw.Draw(badge)

# Paste photo and QR
badge.paste(photo, (30, 30))
badge.paste(qr_img, (photo.width + 60, 30))

# === Step 4: Add text below ===
try:
    font = ImageFont.truetype("Arial.ttf", 28)
except:
    font = ImageFont.load_default()

text_y = max(qr_img.height, photo.height) + 50
draw.text((30, text_y), f"{employee_name}", fill="black", font=font)
draw.text((photo.width + 60, text_y), f"ID: {employee_id}", fill="black", font=font)

# === Step 5: Save ===
badge.save(output_file)
print(f"✅ Saved employee badge as {output_file}")
