import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Cases() {
  const [cases, setCases] = useState([]);
  const [error, setError] = useState("");

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username");
  const branch = localStorage.getItem("branch");

  const navigate = useNavigate();

  // 🔒 Logout: clear history + session
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  const fetchCases = () => {
    const token = localStorage.getItem("access");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    fetch("http://127.0.0.1:8002/api/cases/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setCases(data);
        setError("");
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    fetchCases();

    // 🔒 Prevent browser back to login
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => {
      window.history.pushState(null, "", window.location.href);
    };

    return () => {
      window.onpopstate = null;
    };
  }, []);

  return (
    <div className="container">
      {/* TOP BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2>My Cases</h2>
          <p>
            <b>User:</b> {username} <br />
            <b>Role:</b> {role === "CASE" ? "Case Officer" : "Supervisor"} <br />
            <b>Branch:</b> {branch}
          </p>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </div>

      {/* Officer only */}
      {role === "CASE" && (
        <button
          style={{ marginBottom: "20px" }}
          onClick={() => navigate("/create-case")}
        >
          Create New Case
        </button>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {cases.length === 0 && !error && <p>No cases found.</p>}

      <ul>
        {cases.map((c) => (
          <li
            key={c.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
              cursor: "pointer",
              borderRadius: "6px",
            }}
            onClick={() => navigate(`/cases/${c.id}`)}
          >
            <b>Crime No:</b> {c.crime_number} <br />
            <b>Section:</b> {c.section_of_law} <br />
            <b>Stage:</b> {c.current_stage}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Cases;
