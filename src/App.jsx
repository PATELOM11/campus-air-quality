import { useEffect, useState } from "react";
import mqtt from "mqtt";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";


function getStatus(score) {
  if (score >= 80) return "GOOD";
  if (score >= 50) return "MODERATE";
  return "POOR";
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function App() {
  const [adc, setAdc] = useState(0);
  const [voltage, setVoltage] = useState(0);
  const [score, setScore] = useState(0);
  const [nh3, setNh3] = useState(0);
  const [co2, setCo2] = useState(0);
  const [smoke, setSmoke] = useState(0);
  const [history, setHistory] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [sensorOnline, setSensorOnline] = useState(false);

  const status = getStatus(score);

    useEffect(() => {
    const host = import.meta.env.VITE_MQTT_HOST;
    const port = import.meta.env.VITE_MQTT_WS_PORT;
    const username = import.meta.env.VITE_MQTT_USERNAME;
    const password = import.meta.env.VITE_MQTT_PASSWORD;
    const topic = import.meta.env.VITE_MQTT_TOPIC;

    const client = mqtt.connect(`wss://${host}:${port}/mqtt`, {
      username,
      password,
      protocol: "wss",
    });

    client.on("connect", () => {
      console.log("✅ MQTT Connected");

      client.subscribe(topic, (error) => {
        if (error) {
          console.error("❌ MQTT subscription error:", error);
        } else {
          console.log("✅ Subscribed to:", topic);
        }
      });
    });

    client.on("message", (receivedTopic, payload) => {
      console.log("📨 MQTT message received:", receivedTopic);

      try {
        const data = JSON.parse(payload.toString());

        const newAdc = Number(data.adc) || 0;
        const newVoltage = Number(data.voltage) || 0;
        const newScore = Number(data.score) || 0;
        const newNh3 = Number(data.nh3) || 0;
        const newCo2 = Number(data.co2) || 0;
        const newSmoke = Number(data.smoke) || 0;

        setAdc(newAdc);
        setVoltage(newVoltage);
        setScore(newScore);
        setNh3(newNh3);
        setCo2(newCo2);
        setSmoke(newSmoke);

        setSensorOnline(data.sensor === "ONLINE");

        const now = new Date();

        setLastUpdate(now);

        setHistory((previousHistory) => [
          ...previousHistory,
          {
            time: formatTime(now),
            adc: newAdc,
            score: newScore,
          },
        ].slice(-20));

      } catch (error) {
        console.error("❌ Invalid MQTT JSON:", error);
      }
    });

    client.on("error", (error) => {
      console.error("❌ MQTT connection error:", error);
      setSensorOnline(false);
    });

    client.on("close", () => {
      console.log("🔴 MQTT connection closed");
      setSensorOnline(false);
    });

    return () => {
      client.end();
    };
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">IOT AIR QUALITY MONITORING</p>
          <h1>Campus Air Quality Monitor</h1>
          <p className="subtitle">
            Real-time environmental monitoring using ESP32 + MQ-135
          </p>
        </div>

        <div className="connection">
          <span
            className="online-dot"
            style={{
              opacity: sensorOnline ? 1 : 0.35,
            }}
          ></span>

          <div>
            <strong>
              {sensorOnline ? "ESP32 ONLINE" : "ESP32 OFFLINE"}
            </strong>
            <small>
              {sensorOnline
                ? "Live sensor connection"
                : "Waiting for sensor data"}
            </small>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="location-bar">
          <div>
            <span className="label">MONITORING LOCATION</span>
            <h2>Scenario 1 · MQ-135 Air Quality</h2>
          </div>

          <div className="updated">
            Last update
            <strong>
              {lastUpdate ? lastUpdate.toLocaleTimeString() : "Waiting..."}
            </strong>
          </div>
        </section>

        <section className="cards">
          <div className="card">
            <span className="card-label">MQ-135 ADC</span>
            <div className="value">{adc}</div>
            <span className="unit">ADC units</span>
          </div>

          <div className="card">
            <span className="card-label">SENSOR VOLTAGE</span>
            <div className="value">{voltage}</div>
            <span className="unit">Volts</span>
          </div>

          <div className={`card score-card ${status.toLowerCase()}`}>
            <span className="card-label">AIR QUALITY SCORE</span>
            <div className="value">{score}</div>
            <span className="unit">out of 100</span>
          </div>

          <div className={`card status-card ${status.toLowerCase()}`}>
            <span className="card-label">CURRENT STATUS</span>
            <div className="status-value">{status}</div>
            <span className="unit">MQ-135 indicator</span>
          </div>
        </section>

        <section className="section-grid">
          <div className="panel large">
            <div className="panel-header">
              <div>
                <h3>MQ-135 Sensor Response</h3>
                <p>Historical sensor reading</p>
              </div>
              <span className="live-badge">● LIVE</span>
            </div>

            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="adc"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Air Quality</h3>
                <p>Current project score</p>
              </div>
            </div>

            <div className="score-circle">
              <div>
                <strong>{score}</strong>
                <span>/100</span>
              </div>
            </div>

            <div className={`status-pill ${status.toLowerCase()}`}>
              <span>●</span> {status}
            </div>
          </div>
        </section>

        <section className="panel gas-panel">
          <div className="panel-header">
            <div>
              <h3>Gas Response Indicators</h3>
              <p>Relative / estimated MQ-135 response indicators</p>
            </div>
          </div>

          <div className="gas-grid">
            <div className="gas-card">
              <span>NH₃</span>
              <strong>{nh3}</strong>
              <small>Response indicator</small>
            </div>

            <div className="gas-card">
              <span>CO₂</span>
              <strong>{co2}</strong>
              <small>Response indicator</small>
            </div>

            <div className="gas-card">
              <span>SMOKE</span>
              <strong>{smoke}</strong>
              <small>Response indicator</small>
            </div>
          </div>

          <div className="notice">
            These values are project indicators for the prototype. They are not
            calibrated gas concentrations or official AQI measurements.
          </div>
        </section>

        <section className="bottom-grid">
          <div className="panel">
            <h3>System Status</h3>

            <div className="system-row">
              <span>ESP32 Controller</span>
              <strong
                className={sensorOnline ? "good-text" : ""}
              >
                {sensorOnline ? "ONLINE" : "OFFLINE"}
              </strong>
            </div>

            <div className="system-row">
              <span>MQ-135 Sensor</span>
              <strong
                className={sensorOnline ? "good-text" : ""}
              >
                {sensorOnline ? "CONNECTED" : "WAITING"}
              </strong>
            </div>

            <div className="system-row">
              <span>Data Transmission</span>
              <strong
                className={sensorOnline ? "good-text" : ""}
              >
                {sensorOnline ? "ACTIVE" : "INACTIVE"}
              </strong>
            </div>
          </div>

          <div className="panel">
            <h3>Monitoring Information</h3>

            <div className="info-row">
              <span>Sensor</span>
              <strong>MQ-135</strong>
            </div>

            <div className="info-row">
              <span>Controller</span>
              <strong>ESP32</strong>
            </div>

            <div className="info-row">
              <span>Data source</span>
              <strong>HiveMQ MQTT</strong>
            </div>
          </div>
        </section>
      </main>

      <footer>
        Campus Air Quality Monitoring System · ESP32 + MQ-135
      </footer>
    </div>
  );
}

export default App;