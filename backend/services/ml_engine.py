import math
from datetime import datetime, timedelta
from typing import Dict, List, Any

# --- ENGINE 1: Queueing Theory (Features 1, 2, 3) ---
def calculate_mandi_congestion_and_wait(
    active_vehicles_count: int,
    weighbridge_count: int = 2,
    service_rate_per_hour: float = 5.0, # Average 12 mins per vehicle per counter
    holding_capacity: int = 40
) -> Dict[str, Any]:
    """
    Features 1 & 3: Waiting Time Prediction & Congestion Index using M/M/c Queueing Logic.
    """
    c = max(1, weighbridge_count)
    mu = service_rate_per_hour
    effective_service_rate = c * mu

    # Congestion Percentage
    congestion_pct = min(100.0, round((active_vehicles_count / max(1, holding_capacity)) * 100, 1))

    # Little's Law / Queue delay in minutes
    if effective_service_rate > 0:
        raw_wait_hours = active_vehicles_count / effective_service_rate
        wait_time_minutes = int(raw_wait_hours * 60)
    else:
        wait_time_minutes = 0

    if congestion_pct < 50:
        congestion_level = "LOW (Smooth)"
        status_color = "#16a34a"
    elif congestion_pct <= 80:
        congestion_level = "MODERATE"
        status_color = "#eab308"
    else:
        congestion_level = "HIGH (Congested)"
        status_color = "#dc2626"

    return {
        "active_vehicles": active_vehicles_count,
        "estimated_wait_minutes": wait_time_minutes,
        "congestion_percentage": congestion_pct,
        "congestion_level": congestion_level,
        "status_color": status_color
    }

def forecast_future_queue(hourly_booked_tokens: List[int], weighbridge_count: int = 2) -> List[Dict[str, Any]]:
    """
    Feature 2: Next 4-Hour Queue Forecasting.
    """
    forecast = []
    current_hour = datetime.now().hour
    accumulated_backlog = 0
    service_capacity = weighbridge_count * 5  # 10 vehicles served per hour

    for i, bookings in enumerate(hourly_booked_tokens[:4]):
        hour_slot = f"{(current_hour + i + 1) % 24}:00"
        net_flow = (accumulated_backlog + bookings) - service_capacity
        accumulated_backlog = max(0, net_flow)
        forecast.append({
            "time_slot": hour_slot,
            "incoming_demand": bookings,
            "projected_queue_size": accumulated_backlog,
            "expected_wait_minutes": int((accumulated_backlog / (weighbridge_count * 5 or 1)) * 60)
        })
    return forecast

# --- ENGINE 2: Arrival & No-Show Engine (Features 4, 7) ---
def predict_no_show_risk(
    distance_km: float,
    transport_mode: str,
    time_of_day_hour: int,
    farmer_past_no_shows: int = 0
) -> Dict[str, Any]:
    """
    Feature 7: No-Show Probability Scoring (Logistic Scoring Formulation).
    """
    # Log-odds weights calibrated on historical agro-procurement attendance
    z = -1.8  # baseline low risk
    z += 0.04 * distance_km
    z += -0.5 if transport_mode == "POOL" else (0.2 if transport_mode == "MANUAL_CART" else 0.0)
    z += 0.3 if (time_of_day_hour > 16 or time_of_day_hour < 8) else -0.2
    z += 0.6 * min(3, farmer_past_no_shows)

    prob = round(1 / (1 + math.exp(-z)), 2)
    return {
        "no_show_probability": prob,
        "risk_category": "High Risk" if prob > 0.45 else ("Medium Risk" if prob > 0.25 else "Low Risk"),
        "expected_turnout_pct": round((1 - prob) * 100, 1)
    }

def forecast_hourly_arrivals(tokens_with_metadata: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Feature 4: True Expected Demand/Arrivals factoring out no-shows.
    """
    total_booked = len(tokens_with_metadata)
    expected_arrivals = 0.0

    for token in tokens_with_metadata:
        dist = token.get("distance_km", 6.0)
        mode = token.get("transport_mode", "OWN")
        hour = token.get("slot_hour", 10)
        risk = predict_no_show_risk(dist, mode, hour)
        expected_arrivals += (1.0 - risk["no_show_probability"])

    return {
        "gross_booked_tokens": total_booked,
        "net_expected_arrivals": round(expected_arrivals, 1),
        "predicted_no_shows": round(total_booked - expected_arrivals, 1)
    }

# --- ENGINE 3: Smart Recommendation & Dynamic Load Balancer (Features 5, 6) ---
def recommend_optimal_mandi_and_slot(
    farmer_lat: float,
    farmer_lon: float,
    candidate_mandis: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Feature 5: Smart Centre and Slot Recommendation.
    Scores candidates based on distance penalty, queue wait penalty, and center capacity.
    """
    ranked = []
    for mandi in candidate_mandis:
        # Distance (mock/haversine)
        dist = mandi.get("distance_km", 5.0)
        wait_mins = mandi.get("estimated_wait_minutes", 30)
        available_slots = mandi.get("remaining_slots_today", 10)

        # Composite Cost Score (Lower score = Better Recommendation)
        # Score = (Distance * 1.5) + (Wait_Mins * 0.8) - (Available_Slots * 0.5)
        score = round((dist * 1.5) + (wait_mins * 0.8) - (available_slots * 0.5), 2)

        ranked.append({
            "mandi_id": mandi["id"],
            "mandi_name": mandi["name"],
            "distance_km": dist,
            "wait_time_minutes": wait_mins,
            "recommendation_score": score,
            "is_best_choice": False,
            "reasoning": f"Save ~{max(5, 60 - wait_mins)} mins wait time vs peak centers."
        })

    ranked.sort(key=lambda x: x["recommendation_score"])
    if ranked:
        ranked[0]["is_best_choice"] = True
    return ranked

def simulate_dynamic_load_balancing(
    centers_data: List[Dict[str, Any]],
    surge_multiplier: float = 1.3
) -> Dict[str, Any]:
    """
    Feature 6: Dynamic Load-Balancing Simulation (What-If Harvest Peak Analysis).
    """
    simulated_centers = []
    overflow_tokens = 0

    for center in centers_data:
        current_load = center.get("active_load", 30)
        max_cap = center.get("capacity", 50)
        simulated_load = int(current_load * surge_multiplier)
        bottleneck = simulated_load > max_cap
        excess = max(0, simulated_load - max_cap)
        overflow_tokens += excess

        simulated_centers.append({
            "center_name": center["name"],
            "base_load": current_load,
            "simulated_load": simulated_load,
            "max_capacity": max_cap,
            "bottleneck": bottleneck,
            "overflow_volume": excess,
            "status": "CRITICAL BOTTLENECK" if bottleneck else "STABLE"
        })

    return {
        "surge_multiplier": surge_multiplier,
        "total_diverted_overflow": overflow_tokens,
        "centers": simulated_centers,
        "recommended_redirection": "Shift 30% traffic to nearest low-load Sub-Centres." if overflow_tokens > 0 else "Network capacity optimal."
    }
