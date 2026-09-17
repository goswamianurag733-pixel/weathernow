from statistics import mean
import numpy as np
from sklearn.linear_model import LinearRegression

def forecast_demand(history, horizon=7):
    """Simple demo demand forecast using linear regression."""
    values = np.array(history, dtype=float)
    if len(values) < 2:
        base = float(values[-1]) if len(values) else 0
        return [{"day": i + 1, "predicted": round(base, 2)} for i in range(horizon)]

    x = np.arange(len(values)).reshape(-1, 1)
    model = LinearRegression().fit(x, values)
    future_x = np.arange(len(values), len(values) + horizon).reshape(-1, 1)
    predictions = np.maximum(model.predict(future_x), 0)

    return [
        {"day": i + 1, "predicted": round(float(v), 2)}
        for i, v in enumerate(predictions)
    ]

def stockout_risk(current_stock, daily_consumption, safety_stock):
    if daily_consumption <= 0:
        return {"risk": "LOW", "days": 999}

    days = current_stock / daily_consumption
    if current_stock <= safety_stock:
        risk = "CRITICAL"
    elif days <= 3:
        risk = "HIGH"
    elif days <= 7:
        risk = "WATCH"
    else:
        risk = "LOW"

    return {"risk": risk, "days": round(days, 1)}

def build_redistribution_plan(resources, medicine=None):
    selected = [
        r for r in resources
        if not medicine or r["medicine"].lower() == medicine.lower()
    ]

    donors, receivers = [], []
    for r in selected:
        days = r["current_stock"] / max(r["daily_consumption"], 0.1)
        surplus = max(0, int(r["current_stock"] - r["safety_stock"] - r["daily_consumption"] * 3))
        deficit = max(0, int(r["safety_stock"] + r["daily_consumption"] * 3 - r["current_stock"]))

        if surplus > 0:
            donors.append({"resource": r, "surplus": surplus, "days": days})
        if deficit > 0:
            receivers.append({"resource": r, "deficit": deficit, "days": days})

    plan = []
    for receiver in sorted(receivers, key=lambda x: x["deficit"], reverse=True):
        need = receiver["deficit"]
        for donor in sorted(donors, key=lambda x: x["surplus"], reverse=True):
            if need <= 0:
                break
            if donor["surplus"] <= 0:
                continue
            qty = min(need, donor["surplus"])
            plan.append({
                "medicine": receiver["resource"]["medicine"],
                "from": donor["resource"]["facility_name"],
                "to": receiver["resource"]["facility_name"],
                "quantity": int(qty),
                "priority": "HIGH" if receiver["days"] <= 3 else "MEDIUM"
            })
            donor["surplus"] -= qty
            need -= qty

    return plan

def federated_average(state_models):
    total = sum(max(1, x.get("samples", 1)) for x in state_models)
    length = len(state_models[0]["weights"]) if state_models else 0
    output = []

    for i in range(length):
        value = sum(
            x["weights"][i] * max(1, x.get("samples", 1))
            for x in state_models
        ) / total
        output.append(round(value, 5))

    return output
