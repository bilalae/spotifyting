# app.py
from flask import Flask, request, jsonify, redirect, session
from flask_cors import CORS
import pandas as pd
import json, os, zipfile, tempfile, shutil
from datetime import datetime, timedelta
from collections import Counter
import spotipy
from spotipy import Spotify
from spotipy.oauth2 import SpotifyOAuth, SpotifyClientCredentials
from dotenv import load_dotenv
import matplotlib.pyplot as plt
from io import BytesIO
import base64

# load env
load_dotenv()

# ---------------- Flask Setup ----------------
app = Flask(__name__)
from flask_cors import CORS

# Allow credentials and specify origin
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "http://127.0.0.1:5173"}})


app.secret_key = os.getenv("FLASK_SECRET_KEY", "supersecret")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------------- Spotify Config ----------------
CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIPY_REDIRECT_URI", "http://127.0.0.1:5000/callback")
SCOPE = "user-read-playback-state user-read-currently-playing user-top-read user-modify-playback-state"

# Public Spotify client (Client Credentials) — used for searching tracks/artwork without user auth
sp_public = None
if CLIENT_ID and CLIENT_SECRET:
    cc_manager = SpotifyClientCredentials(client_id=CLIENT_ID, client_secret=CLIENT_SECRET)
    sp_public = Spotify(auth_manager=cc_manager)

# Auth manager (handles refresh automatically, uses .cache for persistence for user auth)
sp_oauth = SpotifyOAuth(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    redirect_uri=REDIRECT_URI,
    scope=SCOPE,
    cache_path=".cache"
)

# ---------------- Token Helper ----------------
def get_token():
    token_info = session.get("token_info")
    if not token_info:
        return None
    if sp_oauth.is_token_expired(token_info):
        token_info = sp_oauth.refresh_access_token(token_info["refresh_token"])
        session["token_info"] = token_info
    return token_info["access_token"]

# ---------------- Login / Callback Routes ----------------
@app.route("/login")
def login():
    auth_url = sp_oauth.get_authorize_url()
    return redirect(auth_url)

@app.route("/callback")
def callback():
    code = request.args.get("code")
    token_info = sp_oauth.get_access_token(code)
    session["token_info"] = token_info
    return jsonify({"message": "Login successful! You can now call /current_track or /api_stats."})

# ---------------- Helper to get Spotify client per user ----------------
def get_spotify_client():
    access_token = get_token()
    if not access_token:
        return None
    return Spotify(auth=access_token)

# ---------------- API endpoints ----------------
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

    recent = sp.current_user_recently_played(limit=10).get('items', [])
    api_stats = {
        "recent_tracks": [f"{t['track']['name']} by {t['track']['artists'][0]['name']}" for t in recent],
        "now_playing": sp.current_playback(),
        "top_stats": {
            "tracks": [t['name'] for t in top_tracks['items']],
            "artists": [a['name'] for a in top_artists['items']],
            "genres": genre_counts.most_common(10)
        }
    }
    return jsonify(api_stats)

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

# ---------------- Upload (JSON dump) and Stats ----------------
@app.route("/upload", methods=["POST"])
def upload_zip():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    zip_file = request.files["file"]
    timeframe = request.form.get("timeframe", "lifetime")
    artist_name = request.args.get("artist")  # optional ?artist=Eminem
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
        AllHistory["ms_played"] = AllHistory["ms_played"].fillna(0) / 60000  # minutes
        AllHistory["ts"] = pd.to_datetime(AllHistory["ts"], errors="coerce").dt.tz_localize(None)
        AllHistory["hour"] = AllHistory["ts"].dt.hour
        AllHistory["day"] = AllHistory["ts"].dt.day_name()
        AllHistory = AllHistory[AllHistory['ms_played'] >= 0.25]

        # timeframe filter
        now = datetime.now()
        if timeframe == "30_days":
            AllHistory = AllHistory[AllHistory["ts"] >= now - timedelta(days=30)]
        elif timeframe == "6_months":
            AllHistory = AllHistory[AllHistory["ts"] >= now - timedelta(days=180)]
        elif timeframe == "1_year":
            AllHistory = AllHistory[AllHistory["ts"] >= now - timedelta(days=365)]

        if AllHistory.empty:
            return jsonify({"error": "No listening history in this timeframe"}), 400

        # prepare global skips stats (we'll recompute below if artist is filtered)
        # apply artist filter (if any) and compute stats on the df (filtered or full)
        df = AllHistory.copy()
        if artist_name:
            df = df[df["master_metadata_album_artist_name"].str.contains(artist_name, case=False, na=False)]
            if df.empty:
                return jsonify({"error": f"No listening history for artist '{artist_name}'"}), 400

        # compute skips & other stats ON df (so artist filter applies correctly)
        skips = df[df["ms_played"] < 15]
        track_counts = df['master_metadata_track_name'].value_counts()
        skips_regular = skips[skips['master_metadata_track_name'].isin(track_counts[track_counts >= 3].index)]
        least_skipped = skips_regular['master_metadata_track_name'].value_counts().sort_values().head(10).to_dict()
        most_skipped_dict = skips_regular['master_metadata_track_name'].value_counts().head(10).to_dict()


        stats = {
            "timeframe": timeframe,
            "artist_filter": artist_name or None,
            "amount_of_tracks": int(df["master_metadata_track_name"].count()),
            "total_listening_hours": round(float(df["ms_played"].sum() / 60), 2),
            "avg_track_duration": round(float(df["ms_played"].mean() or 0), 2),
            "top_10_artists": df["master_metadata_album_artist_name"].value_counts().head(10).to_dict(),
            "top_10_songs": df["master_metadata_track_name"].value_counts().head(10).to_dict(),
            "most_skipped": most_skipped_dict,
            "least_skipped": least_skipped
        }
        return jsonify(stats)

    finally:
        # cleanup
        try:
            os.remove(zip_path)
        except Exception:
            pass
        shutil.rmtree(temp_dir, ignore_errors=True)

# ---------------- Listening trend graph endpoint ----------------
@app.route("/graph/listening_trend", methods=["POST"])
def graph_listening_trend():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    zip_file = request.files["file"]
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
        AllHistory = AllHistory[AllHistory["ms_played"] >= 0.25]

        listening_trend = (
            AllHistory.groupby(AllHistory["ts"].dt.to_period("M"))["ms_played"]
            .sum()
            .reset_index()
        )

        listening_trend["date"] = listening_trend["ts"].dt.to_timestamp()
        listening_trend = listening_trend[["date", "ms_played"]]
        listening_trend = listening_trend.rename(columns={"ms_played": "minutes_played"})

        plt.figure(figsize=(12, 6))
        plt.plot(listening_trend["date"], listening_trend["minutes_played"], marker="o")
        plt.xlabel("Date")
        plt.ylabel("Minutes Played")
        plt.title("Spotify Listening Trend Over Time")
        plt.xticks(rotation=45)
        plt.tight_layout()

        buf = BytesIO()
        plt.savefig(buf, format="png")
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode("utf-8")
        plt.close()

        return jsonify({
            "graph_type": "listening_trend",
            "image_base64": img_base64
        })

    finally:
        try:
            os.remove(zip_path)
        except Exception:
            pass
        shutil.rmtree(temp_dir, ignore_errors=True)

# ---------------- Track details (search) ----------------
@app.route("/track-details", methods=["POST"])
def track_details():
    if sp_public is None:
        return jsonify({"error": "Server missing SPOTIPY_CLIENT_ID / SPOTIPY_CLIENT_SECRET"}), 500

    data = request.get_json(silent=True) or {}
    track_name = data.get("trackdetails")

    if not track_name:
        return jsonify({"error": "No track provided"}), 400

    results = sp_public.search(q=track_name, type="track", limit=1)

    if not results or not results.get("tracks", {}).get("items"):
        return jsonify({"error": "Track not found"}), 404

    track = results["tracks"]["items"][0]
    response = {
        "name": track["name"],
        "artist": track["artists"][0]["name"],
        "album": track["album"]["name"],
        "release_date": track["album"]["release_date"],
        "image": track["album"]["images"][0]["url"] if track["album"]["images"] else None,
        "spotify_url": track["external_urls"].get("spotify"),
        "preview_url": track.get("preview_url"),
    }
    return jsonify(response)

# -------------------------------common hours and days----------------------------

@app.route("/graph/common_day_time", methods=["POST"])
def graph_common_day_time():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    zip_file = request.files["file"]
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

        # Combine JSONs into single DataFrame
        AllHistory = pd.concat(dfs, ignore_index=True)
        AllHistory["ms_played"] = AllHistory["ms_played"].fillna(0) / 60000
        AllHistory["ts"] = pd.to_datetime(AllHistory["ts"], errors="coerce").dt.tz_localize(None)
        AllHistory = AllHistory[AllHistory["ms_played"] >= 0.25]

        # Extract hour and day
        AllHistory["hour"] = AllHistory["ts"].dt.hour
        AllHistory["day"] = AllHistory["ts"].dt.day_name()

        # Group by (day, hour) → play counts
        heatmap_data = AllHistory.groupby(["day", "hour"]).size().unstack(fill_value=0)

        # Order days Mon–Sun
        day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        heatmap_data = heatmap_data.reindex(day_order)

        # Plot heatmap
        plt.figure(figsize=(12, 6))
        plt.imshow(heatmap_data, aspect="auto", cmap="Greens")

        # Styling (black background, white labels)
        plt.gca().set_facecolor("black")
        plt.gcf().patch.set_facecolor("black")
        plt.colorbar(label="Play Count")
        plt.xticks(range(24), range(24), color="white")  # hours
        plt.yticks(range(len(heatmap_data.index)), heatmap_data.index, color="white")  # days
        plt.title("Listening Habits Heatmap", color="white")
        plt.xlabel("Hour of Day", color="white")
        plt.ylabel("Day of Week", color="white")

        # Save to base64
        buf = BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight", facecolor="black")
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode("utf-8")
        plt.close()

        return jsonify({
            "graph_type": "common_day_time",
            "image_base64": img_base64
        })

    finally:
        try:
            os.remove(zip_path)
        except Exception:
            pass
        shutil.rmtree(temp_dir, ignore_errors=True)

# ---------------- Main ----------------
if __name__ == "__main__":
    app.run(debug=True)
