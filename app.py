from flask import Flask, jsonify, request, send_from_directory
from pathlib import Path
from database import load_data
from ai_engine import forecast_demand, build_redistribution_plan, federated_average

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="/static")

def data():
    return load_data(BASE_DIR / "data" / "health_data.json")

@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "SwasthyaGrid AI"})

@app.get("/api/dashboard")
def dashboard():
    d = data()
    facilities = d["facilities"]
    resources = d["resources"]

    beds_total = sum(x["beds_total"] for x in facilities)
    beds_available = sum(x["beds_available"] for x in facilities)
    staff_total = sum(x["staff_total"] for x in facilities)
    staff_present = sum(x["staff_present"] for x in facilities)

    return jsonify({
        "metrics": {
            "facilities": len(facilities),
            "beds_total": beds_total,
            "beds_available": beds_available,
            "occupancy_pct": round((beds_total - beds_available) / beds_total * 100, 1) if beds_total else 0,
            "staff_present": staff_present,
            "staff_total": staff_total,
            "staff_pct": round(staff_present / staff_total * 100, 1) if staff_total else 0,
            "active_alerts": len([a for a in d["alerts"] if a["status"] == "ACTIVE"])
        },
        "states": sorted(list({f["state"] for f in facilities})),
        "facilities": facilities,
        "resources": resources,
        "alerts": d["alerts"]
    })

@app.get("/api/facilities")
def facilities():
    return jsonify(data()["facilities"])

@app.get("/api/resources")
def resources():
    return jsonify(data()["resources"])

@app.get("/api/alerts")
def alerts():
    return jsonify(data()["alerts"])

@app.get("/api/forecast")
def forecast():
    d = data()
    facility_id = request.args.get("facility_id")
    medicine = request.args.get("medicine")

    matches = [
        r for r in d["resources"]
        if (not facility_id or r["facility_id"] == facility_id)
        and (not medicine or r["medicine"].lower() == medicine.lower())
    ]
    if not matches:
        return jsonify({"error": "Resource not found"}), 404

    result = []
    for r in matches:
        prediction = forecast_demand(r["history"], horizon=7)
        result.append({
            "facility_id": r["facility_id"],
            "facility_name": r["facility_name"],
            "medicine": r["medicine"],
            "current_stock": r["current_stock"],
            "safety_stock": r["safety_stock"],
            "daily_consumption": r["daily_consumption"],
            "days_of_stock": round(r["current_stock"] / max(r["daily_consumption"], 0.1), 1),
            "forecast": prediction
        })
    return jsonify(result)

@app.get("/api/redistribution")
def redistribution():
    medicine = request.args.get("medicine")
    d = data()
    plan = build_redistribution_plan(d["resources"], medicine)
    return jsonify(plan)

@app.post("/api/federated/train")
def federated_train():
    payload = request.get_json(silent=True) or {}
    state_models = payload.get("state_models") or [
        {"state": "Uttar Pradesh", "weights": [0.72, 0.81, 0.65], "samples": 1200},
        {"state": "Kerala", "weights": [0.68, 0.77, 0.71], "samples": 900},
        {"state": "Madhya Pradesh", "weights": [0.75, 0.70, 0.69], "samples": 700}
    ]
    return jsonify({
        "algorithm": "FedAvg (simulation)",
        "participating_states": [x["state"] for x in state_models],
        "global_weights": federated_average(state_models),
        "note": "Demo only: no patient-level data is transmitted."
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
