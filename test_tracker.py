#!/usr/bin/env python3
"""
Automated verification test suite for USPS DFA Network Modernization Tracker.
Validates datasets, network topology links, file presence, and HTTP serving.
"""

import json
import csv
import os
import sys

BASE_DIR = "/Users/benz/.gemini/antigravity/scratch/usps-dfa-tracker"

def run_tests():
    passed = 0
    total = 0

    print("Running USPS DFA Tracker Verification Tests...\n")

    # Test 1: Check required files exist
    required_files = [
        "index.html",
        "css/styles.css",
        "js/app.js",
        "js/network_map.js",
        "js/charts.js",
        "js/facility_inspector.js",
        "js/data_loader.js",
        "data/facilities.json",
        "data/facilities.csv",
        "data/us_states.json",
        "serve.py",
        "README.md"
    ]

    for rf in required_files:
        total += 1
        path = os.path.join(BASE_DIR, rf)
        assert os.path.exists(path), f"Missing file: {rf}"
        passed += 1
    print(f"✅ [1/5] All {len(required_files)} core files present.")

    # Test 2: Verify JSON dataset integrity
    total += 1
    with open(os.path.join(BASE_DIR, "data/facilities.json")) as f:
        data = json.load(f)
        assert "facilities" in data
        assert "connections" in data
        assert len(data["facilities"]) == 211
        assert len(data["connections"]) == 193
        assert data["rpdc_count"] == 18
        assert data["lpc_count"] == 16
        assert data["sdc_count"] == 21
        assert data["spoke_count"] == 156
    passed += 1
    print(f"✅ [2/5] Facilities JSON dataset verified: 211 facilities & 193 connections.")

    # Test 3: Verify CSV dataset integrity & schema
    total += 1
    with open(os.path.join(BASE_DIR, "data/facilities.csv")) as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        expected_headers = [
            "facility_id", "name", "type", "type_label", "city", "state", "latitude", "longitude",
            "square_footage", "status", "launch_wave", "launch_date", "parent_hub", "ev_chargers",
            "carrier_routes", "spoke_count", "notes"
        ]
        for eh in expected_headers:
            assert eh in headers, f"Missing header {eh} in CSV"
        rows = list(reader)
        assert len(rows) == 211, f"Expected 211 rows, got {len(rows)}"
    passed += 1
    print(f"✅ [3/5] Facilities CSV dataset verified: 211 rows matching schema.")

    # Test 4: Verify Network Hub-and-Spoke Referential Integrity
    total += 1
    with open(os.path.join(BASE_DIR, "data/facilities.json")) as f:
        data = json.load(f)
        fac_ids = {f["facility_id"] for f in data["facilities"]}
        for conn in data["connections"]:
            assert conn["from_id"] in fac_ids, f"Invalid connection from_id: {conn['from_id']}"
            assert conn["to_id"] in fac_ids, f"Invalid connection to_id: {conn['to_id']}"
    passed += 1
    print(f"✅ [4/5] Hub-and-Spoke connection referential integrity verified.")

    # Test 5: Check HTTP Server MIME handler
    total += 1
    sys.path.insert(0, BASE_DIR)
    from serve import DFAHTTPRequestHandler

    class DummyHandler(DFAHTTPRequestHandler):
        def __init__(self):
            pass

    handler = DummyHandler()
    assert handler.guess_type("app.js") == "text/javascript"
    assert handler.guess_type("styles.css") == "text/css"
    assert handler.guess_type("data.json") == "application/json"
    assert handler.guess_type("facilities.csv") == "text/csv"
    passed += 1
    print(f"✅ [5/5] HTTP server MIME types verified for ES modules and data files.")

    print(f"\n🎉 All {passed}/{total} verification tests passed successfully!")

if __name__ == "__main__":
    run_tests()
