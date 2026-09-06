import json
import csv
import random

RPDC_LIST = [
    {"id": "RPDC-ATL", "name": "Palmetto RPDC (Atlanta Metro)", "city": "Palmetto", "state": "GA", "lat": 33.5204, "lon": -84.6699, "sqft": 1300000, "status": "Operational", "launch_date": "2024-02-24", "wave": "Wave 5", "notes": "Major Southeast mega-hub; experienced acute transition delays in Q2 2024 before stabilizing."},
    {"id": "RPDC-RIC", "name": "Sandston RPDC (Richmond Metro)", "city": "Sandston", "state": "VA", "lat": 37.5188, "lon": -77.3094, "sqft": 850000, "status": "Operational", "launch_date": "2023-07-15", "wave": "Wave 3", "notes": "First operational RPDC flagship; subject of OIG baseline efficiency review."},
    {"id": "RPDC-HOU", "name": "North Houston RPDC", "city": "Houston", "state": "TX", "lat": 29.9678, "lon": -95.3855, "sqft": 1100000, "status": "Operational", "launch_date": "2023-11-04", "wave": "Wave 4", "notes": "Gulf Coast processing hub; centralized parcel sorter deployment."},
    {"id": "RPDC-CLT", "name": "Gastonia / Charlotte RPDC", "city": "Gastonia", "state": "NC", "lat": 35.2621, "lon": -81.1873, "sqft": 620000, "status": "Operational", "launch_date": "2023-09-09", "wave": "Wave 4", "notes": "Serves Carolinas regional parcel and originating mail pipeline."},
    {"id": "RPDC-BET", "name": "Bethlehem RPDC (Lehigh Valley)", "city": "Bethlehem", "state": "PA", "lat": 40.6259, "lon": -75.3705, "sqft": 950000, "status": "Operational", "launch_date": "2024-04-20", "wave": "Wave 6", "notes": "Northeast regional sorting facility connecting PA, NJ, and NY corridors."},
    {"id": "RPDC-IND", "name": "Indianapolis RPDC", "city": "Indianapolis", "state": "IN", "lat": 39.7684, "lon": -86.1581, "sqft": 820000, "status": "Operational", "launch_date": "2024-03-16", "wave": "Wave 5", "notes": "Midwest surface and air hub serving Central Area network."},
    {"id": "RPDC-CHI", "name": "South Suburban Chicago RPDC", "city": "Bedford Park", "state": "IL", "lat": 41.7656, "lon": -87.7781, "sqft": 1200000, "status": "Operational", "launch_date": "2024-01-20", "wave": "Wave 5", "notes": "Consolidated high-speed package processing for Greater Chicago."},
    {"id": "RPDC-PDX", "name": "Portland RPDC", "city": "Portland", "state": "OR", "lat": 45.5152, "lon": -122.6784, "sqft": 750000, "status": "Operational", "launch_date": "2024-06-01", "wave": "Wave 6", "notes": "Pacific Northwest primary sorting node."},
    {"id": "RPDC-DEN", "name": "Denver RPDC", "city": "Denver", "state": "CO", "lat": 39.7392, "lon": -104.9903, "sqft": 900000, "status": "Operational", "launch_date": "2024-05-18", "wave": "Wave 6", "notes": "Mountain West operational hub."},
    {"id": "RPDC-DAL", "name": "North Texas Dallas RPDC", "city": "Dallas", "state": "TX", "lat": 32.7767, "lon": -96.7970, "sqft": 1050000, "status": "Operational", "launch_date": "2024-02-10", "wave": "Wave 5", "notes": "Central distribution plant handling North Texas volumes."},
    {"id": "RPDC-LAX", "name": "Anaheim / Orange County RPDC", "city": "Anaheim", "state": "CA", "lat": 33.8366, "lon": -117.9143, "sqft": 1150000, "status": "Operational", "launch_date": "2024-06-15", "wave": "Wave 6", "notes": "Southern California package and originating mail plant."},
    {"id": "RPDC-SEA", "name": "Seattle RPDC", "city": "Seattle", "state": "WA", "lat": 47.6062, "lon": -122.3321, "sqft": 880000, "status": "In Progress", "launch_date": "2024-11-01", "wave": "Wave 7", "notes": "Under final equipment installation; sorter integration underway."},
    {"id": "RPDC-DET", "name": "Detroit RPDC", "city": "Detroit", "state": "MI", "lat": 42.3314, "lon": -83.0458, "sqft": 800000, "status": "In Progress", "launch_date": "2024-10-15", "wave": "Wave 7", "notes": "Renovating existing facility with modernized package processing equipment."},
    {"id": "RPDC-PHX", "name": "Phoenix RPDC", "city": "Phoenix", "state": "AZ", "lat": 33.4484, "lon": -112.0740, "sqft": 920000, "status": "In Progress", "launch_date": "2025-01-20", "wave": "Wave 8", "notes": "Southwest growth corridor regional processing mega-center."},
    {"id": "RPDC-BOS", "name": "North Reading RPDC (Boston Metro)", "city": "North Reading", "state": "MA", "lat": 42.5784, "lon": -71.0778, "sqft": 780000, "status": "In Progress", "launch_date": "2025-02-15", "wave": "Wave 8", "notes": "Consolidation of Greater Boston parcel handling."},
    {"id": "RPDC-RNO", "name": "Reno Processing Center", "city": "Reno", "state": "NV", "lat": 39.5296, "lon": -119.8138, "sqft": 450000, "status": "Paused", "launch_date": "Paused", "wave": "Wave 7", "notes": "Downsizing paused following Senate inquiries and community opposition over winter mountain passes."},
    {"id": "RPDC-GRI", "name": "Grand Island Processing Center", "city": "Grand Island", "state": "NE", "lat": 40.9264, "lon": -98.3420, "sqft": 320000, "status": "Paused", "launch_date": "Paused", "wave": "Wave 7", "notes": "Consolidation into Omaha paused pending PRC advisory opinion."},
]

LPC_LIST = [
    {"id": "LPC-ATL", "name": "Atlanta Local Processing Center", "city": "Atlanta", "state": "GA", "lat": 33.7490, "lon": -84.3880, "sqft": 480000, "status": "Operational", "rpdc_id": "RPDC-ATL"},
    {"id": "LPC-RIC", "name": "Richmond Local Processing Center", "city": "Richmond", "state": "VA", "lat": 37.5407, "lon": -77.4360, "sqft": 420000, "status": "Operational", "rpdc_id": "RPDC-RIC"},
    {"id": "LPC-HOU", "name": "South Houston Local Processing Center", "city": "Missouri City", "state": "TX", "lat": 29.6186, "lon": -95.5377, "sqft": 510000, "status": "Operational", "rpdc_id": "RPDC-HOU"},
    {"id": "LPC-RDU", "name": "Raleigh Local Processing Center", "city": "Raleigh", "state": "NC", "lat": 35.7796, "lon": -78.6382, "sqft": 390000, "status": "Operational", "rpdc_id": "RPDC-CLT"},
    {"id": "LPC-PHL", "name": "Philadelphia LPC", "city": "Philadelphia", "state": "PA", "lat": 39.9526, "lon": -75.1652, "sqft": 550000, "status": "Operational", "rpdc_id": "RPDC-BET"},
    {"id": "LPC-IND", "name": "Indianapolis South LPC", "city": "Indianapolis", "state": "IN", "lat": 39.7122, "lon": -86.1384, "sqft": 380000, "status": "Operational", "rpdc_id": "RPDC-IND"},
    {"id": "LPC-CHI", "name": "Chicago Central LPC", "city": "Chicago", "state": "IL", "lat": 41.8781, "lon": -87.6298, "sqft": 600000, "status": "Operational", "rpdc_id": "RPDC-CHI"},
    {"id": "LPC-PDX", "name": "Portland Destinating LPC", "city": "Portland", "state": "OR", "lat": 45.5450, "lon": -122.6500, "sqft": 410000, "status": "Operational", "rpdc_id": "RPDC-PDX"},
    {"id": "LPC-DEN", "name": "Denver Central LPC", "city": "Denver", "state": "CO", "lat": 39.7500, "lon": -104.9800, "sqft": 440000, "status": "Operational", "rpdc_id": "RPDC-DEN"},
    {"id": "LPC-DAL", "name": "Dallas Downtown LPC", "city": "Dallas", "state": "TX", "lat": 32.7800, "lon": -96.8000, "sqft": 490000, "status": "Operational", "rpdc_id": "RPDC-DAL"},
    {"id": "LPC-LAX", "name": "Los Angeles Metro LPC", "city": "Los Angeles", "state": "CA", "lat": 34.0522, "lon": -118.2437, "sqft": 580000, "status": "Operational", "rpdc_id": "RPDC-LAX"},
    {"id": "LPC-SEA", "name": "Seattle Destinating LPC", "city": "Seattle", "state": "WA", "lat": 47.5900, "lon": -122.3200, "sqft": 430000, "status": "In Progress", "rpdc_id": "RPDC-SEA"},
    {"id": "LPC-DET", "name": "Detroit Destinating LPC", "city": "Detroit", "state": "MI", "lat": 42.3400, "lon": -83.0500, "sqft": 420000, "status": "In Progress", "rpdc_id": "RPDC-DET"},
    {"id": "LPC-PHX", "name": "Phoenix South Mountain LPC", "city": "Phoenix", "state": "AZ", "lat": 33.4200, "lon": -112.0600, "sqft": 460000, "status": "In Progress", "rpdc_id": "RPDC-PHX"},
    {"id": "LPC-BOS", "name": "Boston Fort Point LPC", "city": "Boston", "state": "MA", "lat": 42.3500, "lon": -71.0500, "sqft": 470000, "status": "In Progress", "rpdc_id": "RPDC-BOS"},
]

SDC_LIST = [
    # Wave 1 (Fall 2022)
    {"id": "SDC-ATH", "name": "Athens S&DC", "city": "Athens", "state": "GA", "lat": 33.9519, "lon": -83.3576, "sqft": 125000, "status": "Operational", "wave": "Wave 1", "launch_date": "2022-09-24", "rpdc_id": "RPDC-ATL", "ev_chargers": 48, "spoke_count": 8, "routes": 92},
    {"id": "SDC-GNV", "name": "Gainesville S&DC", "city": "Gainesville", "state": "FL", "lat": 29.6516, "lon": -82.3248, "sqft": 110000, "status": "Operational", "wave": "Wave 1", "launch_date": "2022-09-24", "rpdc_id": "RPDC-ATL", "ev_chargers": 42, "spoke_count": 6, "routes": 78},
    {"id": "SDC-PAN", "name": "Panama City S&DC", "city": "Panama City", "state": "FL", "lat": 30.1588, "lon": -85.6602, "sqft": 95000, "status": "Operational", "wave": "Wave 1", "launch_date": "2022-09-24", "rpdc_id": "RPDC-ATL", "ev_chargers": 36, "spoke_count": 5, "routes": 64},

    # Wave 2 (Feb 2023)
    {"id": "SDC-BRY", "name": "Bryan S&DC", "city": "Bryan", "state": "TX", "lat": 30.6744, "lon": -96.3697, "sqft": 105000, "status": "Operational", "wave": "Wave 2", "launch_date": "2023-02-25", "rpdc_id": "RPDC-HOU", "ev_chargers": 40, "spoke_count": 7, "routes": 82},
    {"id": "SDC-UTI", "name": "Utica S&DC", "city": "Utica", "state": "NY", "lat": 43.1009, "lon": -75.2327, "sqft": 130000, "status": "Operational", "wave": "Wave 2", "launch_date": "2023-02-25", "rpdc_id": "RPDC-BET", "ev_chargers": 52, "spoke_count": 8, "routes": 96},

    # Wave 3 (June 2023)
    {"id": "SDC-KOK", "name": "Kokomo S&DC", "city": "Kokomo", "state": "IN", "lat": 40.4864, "lon": -86.1336, "sqft": 98000, "status": "Operational", "wave": "Wave 3", "launch_date": "2023-06-03", "rpdc_id": "RPDC-IND", "ev_chargers": 38, "spoke_count": 6, "routes": 74},
    {"id": "SDC-TOP", "name": "Topeka S&DC", "city": "Topeka", "state": "KS", "lat": 39.0473, "lon": -95.6752, "sqft": 140000, "status": "Operational", "wave": "Wave 3", "launch_date": "2023-06-03", "rpdc_id": "RPDC-IND", "ev_chargers": 56, "spoke_count": 9, "routes": 108},

    # Wave 4 (Sept 2023)
    {"id": "SDC-RIC", "name": "Richmond S&DC (Sandston)", "city": "Sandston", "state": "VA", "lat": 37.5250, "lon": -77.3150, "sqft": 185000, "status": "Operational", "wave": "Wave 4", "launch_date": "2023-09-09", "rpdc_id": "RPDC-RIC", "ev_chargers": 72, "spoke_count": 10, "routes": 132},
    {"id": "SDC-GAS", "name": "Gastonia S&DC", "city": "Gastonia", "state": "NC", "lat": 35.2550, "lon": -81.1800, "sqft": 115000, "status": "Operational", "wave": "Wave 4", "launch_date": "2023-09-09", "rpdc_id": "RPDC-CLT", "ev_chargers": 46, "spoke_count": 7, "routes": 86},
    {"id": "SDC-SBN", "name": "South Bend S&DC", "city": "South Bend", "state": "IN", "lat": 41.6764, "lon": -86.2520, "sqft": 128000, "status": "Operational", "wave": "Wave 4", "launch_date": "2023-09-09", "rpdc_id": "RPDC-IND", "ev_chargers": 50, "spoke_count": 8, "routes": 94},

    # Wave 5 (Jan/Feb 2024)
    {"id": "SDC-PAL", "name": "Palmetto S&DC", "city": "Palmetto", "state": "GA", "lat": 33.5250, "lon": -84.6650, "sqft": 210000, "status": "Operational", "wave": "Wave 5", "launch_date": "2024-01-13", "rpdc_id": "RPDC-ATL", "ev_chargers": 88, "spoke_count": 12, "routes": 154},
    {"id": "SDC-BKN", "name": "Brooklyn Cadman S&DC", "city": "Brooklyn", "state": "NY", "lat": 40.6928, "lon": -73.9903, "sqft": 160000, "status": "Operational", "wave": "Wave 5", "launch_date": "2024-01-13", "rpdc_id": "RPDC-BET", "ev_chargers": 60, "spoke_count": 6, "routes": 112},
    {"id": "SDC-TAC", "name": "Tacoma S&DC", "city": "Tacoma", "state": "WA", "lat": 47.2529, "lon": -122.4443, "sqft": 145000, "status": "Operational", "wave": "Wave 5", "launch_date": "2024-02-24", "rpdc_id": "RPDC-PDX", "ev_chargers": 58, "spoke_count": 9, "routes": 118},

    # Wave 6 (June 2024)
    {"id": "SDC-BOI", "name": "Boise S&DC", "city": "Boise", "state": "ID", "lat": 43.6150, "lon": -116.2023, "sqft": 120000, "status": "Operational", "wave": "Wave 6", "launch_date": "2024-06-01", "rpdc_id": "RPDC-PDX", "ev_chargers": 46, "spoke_count": 7, "routes": 88},
    {"id": "SDC-DSM", "name": "Des Moines S&DC", "city": "Des Moines", "state": "IA", "lat": 41.5868, "lon": -93.6250, "sqft": 135000, "status": "Operational", "wave": "Wave 6", "launch_date": "2024-06-01", "rpdc_id": "RPDC-IND", "ev_chargers": 54, "spoke_count": 8, "routes": 98},
    {"id": "SDC-COS", "name": "Colorado Springs S&DC", "city": "Colorado Springs", "state": "CO", "lat": 38.8339, "lon": -104.8214, "sqft": 130000, "status": "Operational", "wave": "Wave 6", "launch_date": "2024-06-01", "rpdc_id": "RPDC-DEN", "ev_chargers": 50, "spoke_count": 8, "routes": 94},

    # Wave 7 (In Progress / Paused)
    {"id": "SDC-LAN", "name": "Lansing S&DC", "city": "Lansing", "state": "MI", "lat": 42.7325, "lon": -84.5555, "sqft": 115000, "status": "In Progress", "wave": "Wave 7", "launch_date": "2024-11-02", "rpdc_id": "RPDC-DET", "ev_chargers": 44, "spoke_count": 6, "routes": 76},
    {"id": "SDC-GEG", "name": "Spokane S&DC", "city": "Spokane", "state": "WA", "lat": 47.6588, "lon": -117.4260, "sqft": 125000, "status": "In Progress", "wave": "Wave 7", "launch_date": "2024-11-02", "rpdc_id": "RPDC-SEA", "ev_chargers": 48, "spoke_count": 7, "routes": 84},
    {"id": "SDC-GRB", "name": "Green Bay S&DC", "city": "Green Bay", "state": "WI", "lat": 44.5192, "lon": -88.0198, "sqft": 105000, "status": "Paused", "wave": "Wave 7", "launch_date": "Paused", "rpdc_id": "RPDC-CHI", "ev_chargers": 0, "spoke_count": 5, "routes": 62},
    {"id": "SDC-RNO", "name": "Reno / Sparks S&DC", "city": "Reno", "state": "NV", "lat": 39.5350, "lon": -119.7800, "sqft": 110000, "status": "Paused", "wave": "Wave 7", "launch_date": "Paused", "rpdc_id": "RPDC-RNO", "ev_chargers": 0, "spoke_count": 6, "routes": 70},
]

# Generate Spoke Post Offices linked to each S&DC
SPOKE_TEMPLATES = [
    ("North Station", 4.2, 11),
    ("Downtown Station", 6.8, 16),
    ("West End Station", 9.4, 21),
    ("Highland Branch", 13.5, 27),
    ("Valley Post Office", 17.8, 33),
    ("Oak Ridge Post Office", 22.1, 41),
    ("Meadow Creek Branch", 26.4, 48),
    ("Pine Hills Station", 31.2, 54),
    ("Summit Station", 36.8, 62),
    ("Lakeside Branch", 42.0, 71),
    ("Forest Park Station", 14.8, 29),
    ("Airport Station", 11.2, 24),
]

def generate_full_network():
    random.seed(42)
    all_facilities = []
    connections = []

    # Add RPDCs
    for r in RPDC_LIST:
        facility = {
            "facility_id": r["id"],
            "name": r["name"],
            "type": "RPDC",
            "type_label": "Regional Processing & Distribution Center",
            "city": r["city"],
            "state": r["state"],
            "latitude": r["lat"],
            "longitude": r["lon"],
            "square_footage": r["sqft"],
            "status": r["status"],
            "launch_wave": r["wave"],
            "launch_date": r["launch_date"],
            "parent_hub": "HQ Network",
            "ev_chargers": 0,
            "carrier_routes": 0,
            "spoke_count": 0,
            "notes": r["notes"]
        }
        all_facilities.append(facility)

    # Add LPCs
    for l in LPC_LIST:
        facility = {
            "facility_id": l["id"],
            "name": l["name"],
            "type": "LPC",
            "type_label": "Local Processing Center",
            "city": l["city"],
            "state": l["state"],
            "latitude": l["lat"],
            "longitude": l["lon"],
            "square_footage": l["sqft"],
            "status": l["status"],
            "launch_wave": "Integrated",
            "launch_date": "2023-2024",
            "parent_hub": l["rpdc_id"],
            "ev_chargers": 0,
            "carrier_routes": 0,
            "spoke_count": 0,
            "notes": f"Destination processing center subordinate to {l['rpdc_id']}."
        }
        all_facilities.append(facility)

        # Connection from RPDC to LPC
        rpdc = next((r for r in RPDC_LIST if r["id"] == l["rpdc_id"]), None)
        if rpdc:
            connections.append({
                "from_id": l["rpdc_id"],
                "to_id": l["id"],
                "type": "RPDC_TO_LPC",
                "distance_miles": round(random.uniform(12.0, 45.0), 1)
            })

    # Add S&DCs and their Spokes
    for s in SDC_LIST:
        facility = {
            "facility_id": s["id"],
            "name": s["name"],
            "type": "S&DC",
            "type_label": "Sorting & Delivery Center",
            "city": s["city"],
            "state": s["state"],
            "latitude": s["lat"],
            "longitude": s["lon"],
            "square_footage": s["sqft"],
            "status": s["status"],
            "launch_wave": s["wave"],
            "launch_date": s["launch_date"],
            "parent_hub": s["rpdc_id"],
            "ev_chargers": s["ev_chargers"],
            "carrier_routes": s["routes"],
            "spoke_count": s["spoke_count"],
            "notes": f"Consolidates {s['routes']} carrier routes from {s['spoke_count']} spoke post offices."
        }
        all_facilities.append(facility)

        # Connection from RPDC to S&DC
        connections.append({
            "from_id": s["rpdc_id"],
            "to_id": s["id"],
            "type": "RPDC_TO_SDC",
            "distance_miles": round(random.uniform(15.0, 60.0), 1)
        })

        # Generate Spokes
        num_spokes = s["spoke_count"]
        for sp_idx in range(num_spokes):
            sp_name_suffix, base_dist, base_time = SPOKE_TEMPLATES[sp_idx % len(SPOKE_TEMPLATES)]
            sp_id = f"SPOKE-{s['id'][4:]}-{sp_idx+1:02d}"
            sp_name = f"{s['city']} {sp_name_suffix}"
            
            # Offset lat/lon slightly based on distance
            dist = round(base_dist + random.uniform(-1.5, 2.0), 1)
            drive_time = int(base_time + (dist * 1.3) + random.randint(-3, 4))
            angle = (sp_idx / num_spokes) * 6.28318 # radiate around S&DC
            lat_offset = (dist / 69.0) * 0.8 * random.choice([1, -1]) * (0.5 + 0.5 * random.random())
            lon_offset = (dist / 54.0) * 0.8 * random.choice([1, -1]) * (0.5 + 0.5 * random.random())
            
            routes_moved = random.randint(8, 22)

            spoke_fac = {
                "facility_id": sp_id,
                "name": sp_name,
                "type": "SPOKE",
                "type_label": "Consolidated Spoke Post Office",
                "city": s["city"],
                "state": s["state"],
                "latitude": round(s["lat"] + lat_offset, 4),
                "longitude": round(s["lon"] + lon_offset, 4),
                "square_footage": random.randint(6500, 18000),
                "status": s["status"],
                "launch_wave": s["wave"],
                "launch_date": s["launch_date"],
                "parent_hub": s["id"],
                "ev_chargers": 0,
                "carrier_routes": routes_moved,
                "spoke_count": 0,
                "distance_to_sdc": dist,
                "drive_time_minutes": drive_time,
                "notes": f"Retail and P.O. Box lobby remains open. {routes_moved} carrier routes relocated to {s['name']}."
            }
            all_facilities.append(spoke_fac)

            connections.append({
                "from_id": s["id"],
                "to_id": sp_id,
                "type": "SDC_TO_SPOKE",
                "distance_miles": dist,
                "drive_time_minutes": drive_time,
                "carrier_routes": routes_moved
            })

    return all_facilities, connections

if __name__ == "__main__":
    facilities, connections = generate_full_network()
    print(f"Generated {len(facilities)} facilities ({len(connections)} network connection links).")

    with open("/Users/benz/.gemini/antigravity/scratch/usps-dfa-tracker/data/facilities.json", "w") as f:
        json.dump({
            "total_facilities": len(facilities),
            "rpdc_count": len([f for f in facilities if f["type"] == "RPDC"]),
            "lpc_count": len([f for f in facilities if f["type"] == "LPC"]),
            "sdc_count": len([f for f in facilities if f["type"] == "S&DC"]),
            "spoke_count": len([f for f in facilities if f["type"] == "SPOKE"]),
            "facilities": facilities,
            "connections": connections
        }, f, indent=2)

    csv_fields = [
        "facility_id", "name", "type", "type_label", "city", "state", "latitude", "longitude",
        "square_footage", "status", "launch_wave", "launch_date", "parent_hub", "ev_chargers",
        "carrier_routes", "spoke_count", "notes"
    ]
    with open("/Users/benz/.gemini/antigravity/scratch/usps-dfa-tracker/data/facilities.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(facilities)

    print("Successfully created data/facilities.json and data/facilities.csv.")
