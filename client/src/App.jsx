import React, { useState, useEffect } from "react";

export default function App() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [response, setResponse] = useState(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const API = "http://localhost:5000";

  // 🔐 Generate fingerprint
  const generateFingerprint = async () => {
    return [
      navigator.userAgent,
      navigator.platform,
      screen.width,
      screen.height,
    ].join("|");
  };

  // 🔐 Init device
  useEffect(() => {
    const initDevice = async () => {
      if (!localStorage.getItem("deviceId")) {
        localStorage.setItem(
          "deviceId",
          Math.random().toString(36).slice(2)
        );
      }

      if (!localStorage.getItem("deviceFingerprint")) {
        const fp = await generateFingerprint();
        localStorage.setItem("deviceFingerprint", fp);
      }
    };

    initDevice();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getLocation = () => ({
    lat: 28.6139,
    lon: 77.209,
  });

  // 🔐 LOGIN / SIGNUP
  const submit = async () => {
    setLoading(true);

    const deviceId = localStorage.getItem("deviceId");
    const fingerprint = localStorage.getItem("deviceFingerprint");
    const loc = getLocation();

    const url =
      mode === "login"
        ? `${API}/api/auth/login`
        : `${API}/api/auth/signup`;

    const payload =
      mode === "login"
        ? { email: form.email, password: form.password }
        : form;

    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": deviceId,
          "X-Device-Fingerprint": fingerprint,
          "X-Lat": loc.lat,
          "X-Lon": loc.lon,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setResponse(data);

    } catch (err) {
      setResponse({ error: err.message });
    }

    setLoading(false);
  };

  // 🔑 OTP VERIFY
  const verifyOtp = async () => {
    const deviceId = localStorage.getItem("deviceId");
    const fingerprint = localStorage.getItem("deviceFingerprint");

    const res = await fetch(`${API}/api/auth/verify-device`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": deviceId,
        "X-Device-Fingerprint": fingerprint,
      },
      body: JSON.stringify({
        email: form.email,
        code: otp,
      }),
    });

    const data = await res.json();
    setResponse(data);
  };

  // 👤 GET USER
  const getUser = async () => {
    const deviceId = localStorage.getItem("deviceId");
    const fingerprint = localStorage.getItem("deviceFingerprint");

    const res = await fetch(`${API}/api/user/me`, {
      credentials: "include",
      headers: {
        "X-Device-Id": deviceId,
        "X-Device-Fingerprint": fingerprint,
      },
    });

    const data = await res.json();
    setResponse(data);
  };

  // 🚨 ATTACK
  const simulateAttack = async () => {
    const res = await fetch(`${API}/api/user/me`, {
      credentials: "include",
      headers: {
        "X-Device-Id": "hacker-device",
        "X-Device-Fingerprint": "fake-fingerprint",
      },
    });

    const data = await res.json();
    setResponse(data);

    if (data.hijackDetected) {
      alert("🚨 Attack detected!");
    }
  };

  // 🚪 LOGOUT
  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    setResponse({ message: "Logged out" });
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="bg-gray-900 p-6 rounded-xl w-96">

        <h1 className="text-2xl mb-4 text-center">🔐 SecureX</h1>

        {/* MODE SWITCH */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode("login")} className="flex-1 bg-blue-500 p-2 rounded">
            Login
          </button>
          <button onClick={() => setMode("signup")} className="flex-1 bg-green-500 p-2 rounded">
            Signup
          </button>
        </div>

        {mode === "signup" && (
          <input name="name" placeholder="Name" onChange={handleChange} className="w-full mb-2 p-2 bg-gray-800 rounded" />
        )}

        <input name="email" placeholder="Email" onChange={handleChange} className="w-full mb-2 p-2 bg-gray-800 rounded" />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} className="w-full mb-2 p-2 bg-gray-800 rounded" />

        <button onClick={submit} className="w-full bg-white text-black p-2 rounded mb-2">
          {loading ? "Processing..." : "Submit"}
        </button>

        {/* OTP */}
        {response?.requiresVerification && (
          <>
            <input
              placeholder="Enter OTP"
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-2 bg-gray-800 rounded mb-2"
            />
            <button onClick={verifyOtp} className="w-full bg-blue-500 p-2 rounded">
              Verify Device
            </button>
          </>
        )}

        {/* ACTION BUTTONS */}
        <button onClick={getUser} className="w-full bg-green-500 p-2 rounded mb-2">
          Get /me
        </button>

        <button onClick={simulateAttack} className="w-full bg-yellow-500 p-2 rounded mb-2">
          🚨 Simulate Attack
        </button>

        <button onClick={logout} className="w-full bg-red-500 p-2 rounded">
          Logout
        </button>

        {/* RESPONSE */}
        {response && (
          <div className="mt-4 text-sm">
            <pre>{JSON.stringify(response, null, 2)}</pre>
          </div>
        )}

      </div>
    </div>
  );
}