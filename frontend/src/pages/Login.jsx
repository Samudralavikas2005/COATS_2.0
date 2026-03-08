import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://127.0.0.1:8002/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error("Invalid credentials");

      // 🔒 CLEAR OLD SESSION
      localStorage.clear();

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      const payload = JSON.parse(atob(data.access.split(".")[1]));
      localStorage.setItem("role", payload.role);
      localStorage.setItem("branch", payload.branch);
      localStorage.setItem("username", payload.username);

      if (payload.role === "SUPERVISOR") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/cases", { replace: true });
      }

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container">
      <h2>CoATS Login</h2>

      <form onSubmit={handleLogin}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default Login;
