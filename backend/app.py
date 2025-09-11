from flask import Flask, request, jsonify, redirect, session, url_for
from flask_cors import CORS
import pandas as pd
import json, os, zipfile, tempfile, shutil
from datetime import datetime, timedelta
from collections import Counter
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv
load_dotenv()


# ---------------- Flask Setup ----------------
app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = "super_secret_key"  # Needed for per-user sessions

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------------- Spotify Config ----------------
CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID", "your_client_id_here")
CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET", "your_client_secret_here")
REDIRECT_URI = "http://127.0.0.1:5000/callback"
SCOPE = "user-read-playback-state user-read-currently-playing user-top-read"

# ---------------- Login Route ----------------
@app.route("/login")
def login():
    REDIRECT_URI = "http://127.0.0.1:5000/callback"
    sp_oauth = SpotifyOAuth(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
        scope=SCOPE,
        cache_path=None
    )
    auth_url = sp_oauth.get_authorize_url()
    return redirect(auth_url)


# ---------------- Callback Route ----------------
@app.route("/callback")
def callback():
    sp_oauth = SpotifyOAuth(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
        scope=SCOPE,
        cache_path=None
    )
    code = request.args.get("code")
    token_info = sp_oauth.get_access_token(code)
    session["token_info"] = token_info
    return jsonify({"message": "Login successful! You can now call /current_track or /api_stats."})


# ---------------- Helper to get Spotify client per user ----------------
def get_spotify_client():
    token_info = session.get("token_info")
    if not token_info:
        return None
    return spotipy.Spotify(auth=token_info["access_token"])


# ---------------- Spotify API Endpoint ----------------
@app.route("/api_stats", methods=["GET"])
def api_stats():
    sp = get_spotify_client()
    if not sp:
        return jsonify({"error": "Not logged in"}), 401

    timeframe = request.args.get("timeframe", "medium_term")
    top_tracks = sp.current_user_top_tracks(limit=50, time_range=timeframe)
    top_artists = sp.current_user_top_artists(limit=50, time_range=timeframe)

    all_genres = []
    for artist in top_artists['items']:
        all_genres.extend(artist['genres'])
    genre_counts = Counter(all_genres)

    api_stats = {
        "recent_tracks": [f"{t['track']['name']} by {t['track']['artists'][0]['name']}" for t in
                          sp.current_user_recently_played(limit=10)['items']],
        "now_playing": sp.current_playback(),
        "top_stats": {
            "tracks": [t['name'] for t in top_tracks['items']],
            "artists": [a['name'] for a in top_artists['items']],
            "genres": genre_counts.most_common(10)
        }
    }
    return jsonify(api_stats)


# ---------------- Spotify Current Track Endpoint ----------------
@app.route("/current_track", methods=["GET"])
def current_track():
    sp = get_spotify_client()
    if not sp:
        return jsonify({"error": "Not logged in"}), 401

    current = sp.current_playback()
    if current:
        return jsonify(current)
    else:
        return jsonify({"error": "Nothing is currently playing"}), 404


# ---------------- JSON Upload Endpoint (unchanged) ----------------
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
        dfs = []
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(temp_dir)
        for root, _, files in os.walk(temp_dir):
            for fname in files:
                if fname.endswith(".json"):
                    with open(os.path.join(root, fname), "r", encoding="utf-8") as f:
                        data = json.load(f)
                    dfs.append(pd.DataFrame(data if isinstance(data, list) else [data]))
        if not dfs:
            return jsonify({"error": "No JSON files found"}), 400

        AllHistory = pd.concat(dfs, ignore_index=True)
        AllHistory["ms_played"] = AllHistory["ms_played"].fillna(0) / 60000
        AllHistory["ts"] = pd.to_datetime(AllHistory["ts"], errors="coerce").dt.tz_localize(None)
        AllHistory = AllHistory[AllHistory['ms_played'] >= 0.25]

        now = datetime.now()
        if timeframe == "30_days":
            AllHistory = AllHistory[AllHistory["ts"] >= now - timedelta(days=30)]
        elif timeframe == "6_months":
            AllHistory = AllHistory[AllHistory["ts"] >= now - timedelta(days=180)]
        elif timeframe == "1_year":
            AllHistory = AllHistory[AllHistory["ts"] >= now - timedelta(days=365)]
        if AllHistory.empty:
            return jsonify({"error": "No listening history in this timeframe"}), 400

        skips = AllHistory[AllHistory["ms_played"] < 15]
        track_counts = AllHistory['master_metadata_track_name'].value_counts()
        skips_regular = skips[skips['master_metadata_track_name'].isin(track_counts[track_counts >= 3].index)]
        least_skipped = skips_regular['master_metadata_track_name'].value_counts().sort_values().head(10).to_dict()
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


# ---------------- Main ----------------
if __name__ == "__main__":
    app.run(debug=True)
