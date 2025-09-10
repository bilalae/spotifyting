from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import json, os, zipfile, tempfile, shutil
from datetime import datetime, timedelta
from collections import Counter
import spotipy
from spotipy.oauth2 import SpotifyOAuth

# ---------------- Flask Setup ----------------
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------------- Spotify API Setup ----------------
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id="d048a8d239e746f08e19d0f2b8fc41c7",
    client_secret="119dd15ab5ce45278d820496c91e50cc",
    redirect_uri="http://127.0.0.1:8888/callback",
    scope="user-read-playback-state user-read-currently-playing user-top-read"
))

def get_recent_tracks(limit=10):
    recent = sp.current_user_recently_played(limit=limit)
    return [f"{item['track']['name']} by {item['track']['artists'][0]['name']}"
            for item in recent['items']]

def get_current_playing():
    current = sp.current_playback()
    if current and current['is_playing']:
        return f"Now Playing: {current['item']['name']} by {current['item']['artists'][0]['name']}"
    return None

def get_top_stats(time_range="medium_term", limit=50):
    top_tracks = sp.current_user_top_tracks(limit=limit, time_range=time_range)
    top_artists = sp.current_user_top_artists(limit=limit, time_range=time_range)

    all_genres = []
    for artist in top_artists['items']:
        all_genres.extend(artist['genres'])
    genre_counts = Counter(all_genres)

    return {
        "tracks": [t['name'] for t in top_tracks['items']],
        "artists": [a['name'] for a in top_artists['items']],
        "genres": genre_counts.most_common(10)
    }

# ---------------- JSON Upload Endpoint ----------------
@app.route("/upload", methods=["POST"])
def upload_zip():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    zip_file = request.files["file"]
    timeframe = request.form.get("timeframe", "lifetime")

    if not zip_file.filename.endswith(".zip"):
        return jsonify({"error": "Only .zip files are allowed"}), 400

    zip_path = os.path.join(UPLOAD_FOLDER, zip_file.filename)
    zip_file.save(zip_path)
    temp_dir = tempfile.mkdtemp()

    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(temp_dir)

        dfs = []
        for root, _, files in os.walk(temp_dir):
            for fname in files:
                if fname.endswith(".json"):
                    with open(os.path.join(root, fname), "r", encoding="utf-8") as f:
                        data = json.load(f)
                    dfs.append(pd.DataFrame(data if isinstance(data, list) else [data]))

        if not dfs:
            return jsonify({"error": "No JSON files found"}), 400

        AllHistory = pd.concat(dfs, ignore_index=True)

        # Standardize columns
        AllHistory["ms_played"] = AllHistory["ms_played"].fillna(0) / 60000
        AllHistory["ts"] = pd.to_datetime(AllHistory["ts"], errors="coerce").dt.tz_localize(None)

        #Only consider songs played more than 15s:
        AllHistory = AllHistory[AllHistory['ms_played'] >= 0.25]

        # Apply timeframe filter
        now = datetime.now()
        if timeframe == "30_days":
            AllHistory = AllHistory[AllHistory["ts"] >= now - timedelta(days=30)]
        elif timeframe == "6_months":
            AllHistory = AllHistory[AllHistory["ts"] >= now - timedelta(days=180)]
        elif timeframe == "1_year":
            AllHistory = AllHistory[AllHistory["ts"] >= now - timedelta(days=365)]

        # Handle empty dataset
        if AllHistory.empty:
            return jsonify({"error": "No listening history in this timeframe"}), 400

        #skips
        skips = AllHistory[AllHistory["ms_played"] < 15]
        #Count how many times each track was listened overall
        track_counts = AllHistory['master_metadata_track_name'].value_counts()
        #Filter skips to only include tracks listened at least, say, 3 times overall
        skips_regular = skips[skips['master_metadata_track_name'].isin(track_counts[track_counts >= 3].index)] #this means semi regular songs are shown to be skipped
        #get least skipped among those
        least_skipped = skips_regular['master_metadata_track_name'].value_counts().sort_values().head(10).to_dict()
        # Convert skips_regular to dictionary counts
        most_skipped_dict = skips_regular['master_metadata_track_name'].value_counts().to_dict()

        json_stats = {
            "timeframe": timeframe,
            "amount_of_tracks": int(AllHistory["master_metadata_track_name"].count()),
            "total_listening_hours": round(float(AllHistory["ms_played"].sum() / 60), 2),
            "avg_track_duration": round(float(AllHistory["ms_played"].mean() or 0), 2),
            "top_10_artists": AllHistory["master_metadata_album_artist_name"].value_counts().head(10).to_dict(),
            "top_10_songs": AllHistory["master_metadata_track_name"].value_counts().head(10).to_dict(),
            "most_skipped": most_skipped_dict,
            "least_skipped": least_skipped
        }

        return jsonify(json_stats)

    finally:
        os.remove(zip_path)
        shutil.rmtree(temp_dir, ignore_errors=True)

# ---------------- Spotify API Endpoint ----------------
@app.route("/api_stats", methods=["GET"])
def api_stats():
    timeframe = request.args.get("timeframe", "medium_term")

    api_stats = {
        "recent_tracks": get_recent_tracks(),
        "now_playing": get_current_playing(),
        "top_stats": get_top_stats(time_range=timeframe)
    }

    return jsonify(api_stats)


# ---------------- Spotify API Raw Endpoint ----------------
from flask_cors import cross_origin

@app.route("/current_track", methods=["GET"])
def current_track():
    current = sp.current_playback()
    if current:
        return jsonify(current)
    else:
        return jsonify({"error": "Nothing is currently playing"}), 404



if __name__ == "__main__":
    app.run(debug=True)
