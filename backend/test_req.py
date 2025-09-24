import requests, base64

url = "http://127.0.0.1:5000/graph/common_day_time"
files = {"file": open("my_spotify_data_3.zip", "rb")}

r = requests.post(url, files=files)

print(r.status_code)
if r.ok:
    data = r.json()
    with open("heatmap.png", "wb") as f:
        f.write(base64.b64decode(data["image_base64"]))
    print("✅ Saved heatmap.png")
else:
    print("❌ Error:", r.text)
