from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import json
from datetime import datetime, timedelta
import os
import zipfile
import tempfile
import shutil

print("🚀 Starting Flask app...")

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/upload", methods=["POST"])
def upload_zip():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    zip_file = request.files["file"]
    timeframe = request.form.get("timeframe", "lifetime")

    if not zip_file.filename.endswith(".zip"):
        return jsonify({"error": "Only .zip files are allowed"}), 400

    # Save the uploaded zip
    zip_path = os.path.join(UPLOAD_FOLDER, zip_file.filename)
    zip_file.save(zip_path)

    # Create a temporary directory
    temp_dir = tempfile.mkdtemp()

    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(temp_dir)

        dfs = []
        # Read all JSON files inside the zip
        for root, _, files in os.walk(temp_dir):
            for fname in files:
                if fname.endswith(".json"):
                    fpath = os.path.join(root, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            data = json.load(f)
                    except Exception as e:
                        return jsonify({"error": f"Error parsing {fname}: {str(e)}"}), 400

                    if isinstance(data, dict):
                        dfs.append(pd.DataFrame([data]))
                    else:
                        dfs.append(pd.DataFrame(data))

        if not dfs:
            return jsonify({"error": "No JSON files found inside zip"}), 400

        AllHistory = pd.concat(dfs, ignore_index=True)

        # Ensure required columns exist
        required_cols = [
            "ms_played",
            "ts",
            "master_metadata_track_name",
            "master_metadata_album_artist_name",
        ]
        for col in required_cols:
            if col not in AllHistory.columns:
                AllHistory[col] = None

        # Convert ms_played → minutes, ts → datetime
        AllHistory["ms_played"] = AllHistory["ms_played"].fillna(0) / 60000
        AllHistory["ts"] = pd.to_datetime(AllHistory["ts"], errors="coerce").dt.tz_localize(None)

        # Apply timeframe filter
        now = datetime.now()
        if timeframe == "30_days":
            cutoff = now - timedelta(days=30)
            AllHistory = AllHistory[AllHistory["ts"] >= cutoff]
        elif timeframe == "6_months":
            cutoff = now - timedelta(days=180)
            AllHistory = AllHistory[AllHistory["ts"] >= cutoff]
        elif timeframe == "1_year":
            cutoff = now - timedelta(days=365)
            AllHistory = AllHistory[AllHistory["ts"] >= cutoff]

        # Handle empty dataset
        if AllHistory.empty:
            return jsonify({
                "timeframe": timeframe,
                "amount_of_tracks": 0,
                "total_listening_hours": 0,
                "avg_track_duration": 0,
                "top_10_artists": {},
                "top_10_songs": {}
            })

        # Metrics
        amount_of_tracks = int(AllHistory["master_metadata_track_name"].count())
        total_listening_hours = float(AllHistory["ms_played"].sum() / 60)
        avg_track_duration = float(AllHistory["ms_played"].mean() or 0)

        top_10_artists = (
            AllHistory["master_metadata_album_artist_name"]
            .value_counts()
            .head(10)
            .to_dict()
        )
        top_10_songs = (
            AllHistory["master_metadata_track_name"]
            .value_counts()
            .head(10)
            .to_dict()
        )

        return jsonify({
            "timeframe": timeframe,
            "amount_of_tracks": amount_of_tracks,
            "total_listening_hours": round(total_listening_hours, 2),
            "avg_track_duration": round(avg_track_duration, 2),
            "top_10_artists": top_10_artists,
            "top_10_songs": top_10_songs
        })

    finally:
        # Always cleanup
        if os.path.exists(zip_path):
            os.remove(zip_path)
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    app.run(debug=True)
