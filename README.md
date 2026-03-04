🏫 Digital Twin School Platform
A real-time, interactive 3D Digital Twin for school campus monitoring — built with React, Vite, and Three.js. Navigate a live 3D campus, monitor sensor data across every room, simulate occupancy scenarios, and receive instant alerts when environmental thresholds are exceeded.
🌐 Live Demo: https://rishu-coder.github.io/school-digital-twin/
________________________________________
📸 Preview
Campus 3D View	Room Detail	Scenario Simulator
Interactive 3D campus with colour-coded overlays	Live sensor cards + timetable	What-if occupancy prediction
________________________________________
📋 Table of Contents
•	Overview
•	Key Features
•	Architecture
•	Tech Stack
•	Project Structure
•	Getting Started
•	How to Use the App
•	Sensor Overlays
•	Alert System
•	Deploying to GitHub Pages
•	Roadmap
________________________________________
Overview
A Digital Twin is a live virtual replica of a physical environment. This platform creates digital twins of every room in a school campus — each one continuously updated with simulated sensor data (temperature, CO₂, occupancy, energy).
Administrators, teachers, and facility managers can:
•	View the entire campus in an interactive 3D scene
•	See live sensor readings overlaid on each room in real time
•	Drill into any room for detailed metrics, trends, and today's timetable
•	Run what-if simulations to predict how changing occupancy affects comfort and energy
________________________________________
Key Features
🗺️ Interactive 3D Campus
•	Full Three.js 3D scene with 6 rooms: 4 classrooms, a Gymnasium, and a Library
•	Drag to orbit, scroll to zoom, click any building to select it
•	Rooms animate upward when selected and glow with alert colours when thresholds are exceeded
•	Ambient fog and directional lighting create a realistic campus atmosphere
📡 Live Sensor Data Engine
•	All rooms update every 1.8 seconds with realistic sensor drift (no backend required)
•	Four live metrics per room: Temperature (°C), CO₂ (ppm), Occupancy, Energy (kW)
•	Data history is stored and visualised as a real-time sparkline chart
🎨 Colour-Coded Overlays
Switch the 3D view between four overlay modes — every room is instantly recoloured:
Overlay	Green (OK)	Amber (Warning)	Red (Critical)
Temperature	≤ 23°C	23–26°C	> 26°C
CO₂	≤ 900 ppm	900–1200 ppm	> 1200 ppm
Occupancy	< 60% capacity	60–85%	> 85%
Energy	< 2 kW	2–3 kW	> 3 kW
📊 Room Detail Dashboard
•	Four metric cards with live values and gauge bars
•	Temperature trend sparkline (last 20 readings)
•	Comfort status, air quality status, twin state indicators
•	Mock timetable showing today's class schedule with a "NOW" indicator
🔬 Scenario Simulator (What-If)
•	Drag a slider to set a simulated occupancy for any room
•	Instantly see predicted impact: CO₂ rise, temperature rise, comfort score, estimated energy
•	Campus-wide summary panel: average temperature, total occupancy, active alerts, average energy
•	Room comparison table — click any row to jump to that room's detail view
🚨 Alert System
•	Automatic alerts when temperature exceeds 26°C or CO₂ exceeds 1,200 ppm
•	Pulsing red alert banners appear in the detail view
•	Blinking ⚠ badges appear in the sidebar room list
•	Alert rooms glow red in the 3D scene
________________________________________
Architecture
┌─────────────────────────────────────────────────────┐
│                  Browser (React + Vite)              │
│                                                      │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────┐  │
│  │  3D Campus   │  │  Room Detail   │  │  Sim /  │  │
│  │  (Three.js)  │  │  Dashboard     │  │ What-If │  │
│  └──────┬───────┘  └───────┬────────┘  └────┬────┘  │
│         └──────────────────┼───────────────┘        │
│                            │                         │
│              ┌─────────────▼──────────────┐          │
│              │   Digital Twin State       │          │
│              │   (React useState)         │          │
│              │                            │          │
│              │  RoomTwin {                │          │
│              │    temp, co2,              │          │
│              │    occupancy, energy,      │          │
│              │    alert, history          │          │
│              │  }                         │          │
│              └─────────────┬──────────────┘          │
│                            │                         │
│              ┌─────────────▼──────────────┐          │
│              │   Sensor Simulation Engine │          │
│              │   (setInterval, 1.8s tick) │          │
│              └────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
In a production deployment, the Sensor Simulation Engine would be replaced by:
•	A WebSocket / Socket.IO connection to a live backend
•	An MQTT broker ingesting real IoT sensor data
•	A Node.js / NestJS backend with PostgreSQL + TimescaleDB
________________________________________
Tech Stack
Layer	Technology
Framework	React 18 + Vite
3D Rendering	Three.js (WebGL)
Language	JavaScript (JSX)
Styling	Inline CSS with CSS variables
State Management	React useState + useRef
Data	Simulated live sensor engine (client-side)
Deployment	GitHub Pages via gh-pages
________________________________________
Project Structure
school-digital-twin/
├── public/
│   └── vite.svg
├── src/
│   ├── App.jsx          ← Entire application (single-file architecture)
│   ├── main.jsx         ← React entry point
│   └── index.css        ← Minimal global reset
├── index.html
├── vite.config.js       ← Base path set to /school-digital-twin/
├── package.json
└── README.md
The app uses a single-file architecture — all components, state, and 3D logic live in App.jsx for simplicity and portability.

How to Use the App
Navigation Bar (Top)
Control	Description
CAMPUS tab	Switch to the 3D interactive campus view
DETAIL tab	View full sensor dashboard for the selected room
SIM tab	Open the What-If scenario simulator
Overlay buttons (top right)	Change the colour mode: occupancy temp co2 energy
LIVE indicator	Confirms sensor data is actively updating
________________________________________
Campus Tab — 3D View
1.	Click any building to select it. The building lifts up and the sidebar highlights the room.
2.	Drag with your mouse to orbit around the campus.
3.	Scroll to zoom in and out.
4.	Switch overlays using the buttons in the top-right to recolour the campus by temperature, CO₂, occupancy, or energy.
5.	Alert rooms automatically glow red and show a floating alert card at the bottom of the view.
________________________________________
Detail Tab — Room Dashboard
After clicking a room (in the campus or sidebar), switch to the Detail tab to see:
•	Metric Cards — live temp, CO₂, occupancy, and energy with colour-coded gauge bars
•	Sparkline Chart — temperature history for the last 20 sensor readings
•	Status Grid — air quality, comfort index, occupancy status, and twin state
•	Timetable — today's schedule with the current lesson marked NOW
________________________________________
Sim Tab — Scenario Simulator
1.	Select a room from the sidebar first.
2.	Go to the Sim tab.
3.	Drag the occupancy slider to a hypothetical value.
4.	The Predicted Impact panel instantly updates with: 
o	Estimated CO₂ rise (ppm)
o	Estimated temperature rise (°C)
o	Comfort score (0–100%)
o	Estimated energy load (kW)
5.	Scroll down to see a campus-wide summary and a full room comparison table. Click any row to jump to that room's detail view.
________________________________________
Sidebar — Room List
The left sidebar shows all 6 rooms at a glance:
•	Room name and subject
•	Live temperature (colour-coded)
•	Live occupancy vs capacity
•	⚠ blinking badge if the room is in alert state
Click any room in the sidebar to select it and switch to the Detail tab.
________________________________________
Sensor Overlays
The 3D campus can be coloured by four different sensor dimensions. Use the overlay buttons in the top navigation to switch modes.
Temperature Overlay
Measures room air temperature in °C. Elevated temperatures can indicate HVAC issues or overcrowding.
🟢 ≤ 23°C    Comfortable
🟡 23–26°C   Warm — monitor
🔴 > 26°C    ALERT — too hot
CO₂ Overlay
Measures carbon dioxide concentration in parts per million (ppm). High CO₂ indicates poor ventilation and affects student concentration.
🟢 ≤ 900 ppm    Good air quality
🟡 900–1200 ppm Moderate — ventilate
🔴 > 1200 ppm   ALERT — open windows
Occupancy Overlay
Shows how full each room is as a percentage of its maximum capacity.
🟢 < 60% capacity    Plenty of space
🟡 60–85% capacity   Getting busy
🔴 > 85% capacity    ALERT — near full
Energy Overlay
Shows estimated electrical load in kilowatts (kW), useful for identifying rooms consuming excessive energy.
🟢 < 2 kW    Efficient
🟡 2–3 kW    Moderate load
🔴 > 3 kW    High consumption
________________________________________
Alert System
Alerts trigger automatically when:
•	Temperature > 26°C, or
•	CO₂ > 1,200 ppm
When an alert fires:
Location	Behaviour
3D Campus	Room glows red with pulsing emissive material
Sidebar	Blinking ⚠ badge appears next to the room name
Detail Tab	Red pulsing alert banner appears at the top
Campus Tab	Floating red alert card appears at the bottom of the 3D view
Alerts clear automatically when values return below the threshold on the next sensor tick.

Roadmap
Future enhancements planned for this platform:
•	[ ] Real IoT integration — connect to MQTT broker for live sensor feeds
•	[ ] Node.js backend — NestJS API with PostgreSQL + TimescaleDB
•	[ ] WebSocket live updates — push sensor changes via Socket.IO
•	[ ] GLB model support — load real architectural models exported from Revit/Blender
•	[ ] User authentication — role-based access (Admin, Teacher, Student, Facilities)
•	[ ] Room booking — timetable integration with booking UI
•	[ ] Student/Staff dashboards — attendance tracking and at-risk signals
•	[ ] Historical analytics — weekly/monthly energy and comfort reports
•	[ ] Mobile responsive — tablet and phone optimised layout
•	[ ] Multi-floor navigation — floor selector for multi-storey buildings
________________________________________
Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
________________________________________
License
MIT
________________________________________
Built with React + Three.js · Deployed on GitHub Pages

