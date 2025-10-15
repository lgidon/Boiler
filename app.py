from flask import Flask, render_template, jsonify, request, send_from_directory
import requests
import time
import threading
from datetime import datetime
import os
from icecream import ic

app = Flask(__name__)

# Configuration
BOILER_API_BASE = os.getenv('BOILER_API_BASE', 'https://api.dolphinboiler.com/HA/V1/')
UPDATE_INTERVAL = int(os.getenv('UPDATE_INTERVAL', '60'))  # seconds

# API Configuration (you can also move these to environment variables)
API_CONFIG = {
    'deviceName': os.getenv('BOLIER_DEVICE_NAME'),
    'email': os.getenv('BOILDER_EMAIL'),
    'API_Key': os.getenv('BOLIER_API_KEY')
}

# Global state (in a real app, you might want to use a proper data store)
current_temp = None
shower_data = []
boiler_status = False
target_temp = None
last_update = None
headers = {}
expected_end_time = None

# payload = {'deviceName': '4022D8956ABD',
# 'email': 'lgidon@gmail.com',
# 'API_Key': '+Br2YRmJBCqWeXfby518zA=='}

def get_base_payload():
    """Returns the base payload that's common to all API calls"""
    return API_CONFIG.copy()

def fetch_temperature_data():
    """Fetch temperature and shower data from API"""
    global current_temp, shower_data, last_update, boiler_status
    try:
        # Replace with your actual API call
        payload = get_base_payload()
        response = requests.request("post",f"{BOILER_API_BASE}/getMainScreenData.php", headers=headers, data=payload )
        if response.status_code == 200:
            data = response.json()
            current_temp = data.get('Temperature')
            shower_data = data.get('showerTemperature', [])
            if data.get('Power') == "ON":
                boiler_status = True
            else:
                boiler_status = False
            last_update = datetime.now()
    except Exception as e:
        ic(f"Error fetching temperature: {e}")


def fetch_boiler_status():
    """Fetch current boiler status including estimated time"""
    global expected_end_time
    try:
        payload = get_base_payload()
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}

        # Call your status API endpoint
        response = requests.post(
            f"{BOILER_API_BASE}/getBoilerStatus.php",  # You'll need to create this endpoint
            headers=headers,
            data=payload,
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            # Update the expected time if the API provides it
            if data.get('expectedEndTime'):
                expected_end_time = data.get('expectedEndTime')
            return True
    except Exception as e:
        print(f"Error fetching boiler status: {e}")
    return False

def background_updater():
    """Background thread to update temperature and boiler status periodically"""
    while True:
        fetch_temperature_data()
        if boiler_status:  # Only fetch boiler status if boiler is on
            fetch_boiler_status()
        time.sleep(UPDATE_INTERVAL)


# Start background updater
updater_thread = threading.Thread(target=background_updater, daemon=True)
updater_thread.start()


@app.route('/static/languages.json')
def serve_languages():
    return send_from_directory('static', 'languages.json')

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/status')
def api_status():
    """API endpoint for current status"""
    return jsonify({
        'current_temp': current_temp,
        'shower_data': shower_data,
        'boiler_status': boiler_status,
        'target_temp': target_temp,
        'expected_end_time': expected_end_time,
        'last_update': last_update.isoformat() if last_update else None
    })


@app.route('/api/refresh', methods=['POST'])
def api_refresh():
    """Manual refresh endpoint"""
    fetch_temperature_data()
    return jsonify({'success': True})


@app.route('/api/boiler/toggle', methods=['POST'])
def api_boiler_toggle():
    """Toggle boiler on/off"""
    global boiler_status, target_temp, expected_end_time

    data = request.get_json()

    if not boiler_status:  # Turning on
        temp = data.get('target_temp')
        if not temp:
            return jsonify({'success': False, 'error': 'Target temperature required'})

        # Call your water_on function
        success, expected_time = water_on(temp)
        if success:
            boiler_status = True
            target_temp = temp
            expected_end_time = expected_time
            return jsonify({'success': True,
                            'expectedEndTime': expected_time})
        else:
            return jsonify({'success': False, 'error': 'Failed to turn on boiler'})

    else:  # Turning off
        # Call your water_off function
        success = water_off()
        if success:
            boiler_status = False
            target_temp = None
            expected_end_time = None
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to turn off boiler'})


def water_on(target_temp):
    """Turn boiler on with specified temperature"""
    try:
        # Start with base payload
        payload = get_base_payload()
        # Add the temperature parameter for this specific call
        payload['temperature'] = str(target_temp)

        response = requests.post(
            f"{BOILER_API_BASE}/turnOnManually.php",
            headers=headers,
            data=payload,
            timeout=10
        )
        ic(f"Turn on response: {response.status_code} - {response.text}")
        if response.status_code == 200:
            # Parse the response to get expected time
            response_data = response.json()
            expected_time = response_data.get('expectedEndTime', 'Unknown')
            return True, expected_time
        return False, None
    except Exception as e:
        ic(f"Error turning on boiler: {e}")
        return False


def water_off():
    """Turn boiler off"""
    try:
        # Use base payload (no temperature needed for turn off)
        payload = get_base_payload()

        # You'll need to replace this with your actual "turn off" endpoint
        response = requests.post(
            f"{BOILER_API_BASE}/turnOffManually.php",  # or whatever your off endpoint is
            headers=headers,
            data=payload
        )

        ic(f"Turn off response: {response.status_code} - {response.text}")
        return response.status_code == 200
    except Exception as e:
        ic(f"Error turning off boiler: {e}")
        return False


if __name__ == '__main__':
    # Fetch initial data
    fetch_temperature_data()
    # Use environment variable for host/port with defaults
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', '5000'))
    # Disable debug mode in production
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

    app.run(host=host, port=port, debug=debug)