from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

API_KEY = "180f18324c36da011459254d9d7539d4"


@app.route("/")
def home():
   return send_from_directory(".", "index.html")


@app.route("/api/weather")
def weather():
    city = request.args.get("city", "Lucknow")

    url = "https://api.openweathermap.org/data/2.5/weather"

    params = {
        "q": city,
        "appid": API_KEY,
        "units": "metric"
    }

    response = requests.get(url, params=params)

    if response.status_code != 200:
        return jsonify({
            "error": "City not found or weather API error"
        }), response.status_code

    return jsonify(response.json())


if __name__ == "__main__":
    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )