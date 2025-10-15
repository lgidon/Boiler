# Boiler

![Static Badge](https://img.shields.io/badge/Language-HE-blue)
![Static Badge](https://img.shields.io/badge/Language-EN-blue)

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)

Web control for the dolphin water heater app.
Currently supports English and Hebrew.

<img width="493" height="715" alt="image" src="https://github.com/user-attachments/assets/95bc0932-9820-4d4c-a853-93c1f2626500" />


## Prerequisits
1. Get API key for the dolphin (Use email and password for the Dolphin app).
```powershell
   curl https://api.dolphinboiler.com/HA/V1/getAPIkey.php -d "email=abc@abc.com" -d "password=XXXXXXXXXX"
```
2. Get the device name - Located at the top of the Dolphin app and also on the device.
3. Verify that host machine has Docker and Docker Compose installed

   
## Installation

1. Add .env file:
```python
  # Flask Configuration
  FLASK_APP=app.py
  FLASK_ENV=production
  FLASK_HOST=0.0.0.0
  FLASK_PORT=5000
  FLASK_DEBUG=false
  
  # Boiler API Configuration
  BOILER_API_BASE=https://api.dolphinboiler.com/HA/V1/
  UPDATE_INTERVAL=60
  
  # API Credentials -- Update these values!
  BOILER_DEVICE_NAME=XXXXXXXX
  BOILER_EMAIL=abc@abc.com
  BOILER_API_KEY=XXXXXXXXXXX
```
2. Copy files to host machine

3. Make the start script executable:
```bash
chmod +x start.sh
```
4. Run the start script:
```bash
./start.sh
```
5. Verify that the container is running
```bash
docker ps
docker-compose logs -f
```
6. Open the app in a browser:
```bash
http://your-host-ip:5000
```