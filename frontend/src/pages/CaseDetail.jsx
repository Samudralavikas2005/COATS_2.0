import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const [caseData, setCaseData] = useState(null);
  const [form, setForm] = useState({
    current_stage: "",
    action_to_be_taken: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access");

    fetch(`http://127.0.0.1:8002/api/cases/${id}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load case");
        return res.json();
      })
      .then((data) => {
        setCaseData(data);
        setForm({
          current_stage: data.current_stage || "",
          action_to_be_taken: data.action_to_be_taken || "",
        });
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const isClosed = caseData?.current_stage === "CC";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem("access");

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/cases/${id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) throw new Error("Update failed");

      navigate("/cases");
    } catch (err) {
      setError(err.message);
    }
  };

  const stageLabel = {
    UI: "Under Investigation",
    PT: "Pending Trial",
    HC: "Pending before High Court",
    SC: "Pending before Supreme Court",
    CC: "Case Closed",
  };

  const stageColor = {
    UI: "#facc15",
    PT: "#fb923c",
    HC: "#60a5fa",
    SC: "#818cf8",
    CC: "#22c55e",
  };

  if (error) return <p className="error-text">{error}</p>;
  if (!caseData) return <p>Loading...</p>;

  return (
    <>
      <Navbar />

      <div className="container" style={{ padding: "40px" }}>
        <h2>Case Details</h2>

        {/* STAGE BADGE */}
        <span
          style={{
            backgroundColor: stageColor[caseData.current_stage],
            color: "white",
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "12px",
            display: "inline-block",
            marginBottom: "15px",
          }}
        >
          {stageLabel[caseData.current_stage]}
        </span>

        {/* BASIC DETAILS */}
        <p><b>Branch:</b> {caseData.branch}</p>
        <p><b>PS Limit:</b> {caseData.ps_limit}</p>
        <p><b>Crime No:</b> {caseData.crime_number}</p>
        <p><b>Section:</b> {caseData.section_of_law}</p>
        <p><b>Complainant:</b> {caseData.complainant_name}</p>
        <p><b>Accused:</b> {caseData.accused_details}</p>
        <p><b>Gist:</b> {caseData.gist_of_case}</p>

        {/* SUPERVISOR INFO */}
        {role === "SUPERVISOR" && (
          <p>
            <b>Case Handler:</b> {caseData.case_holding_officer_username}
          </p>
        )}

        <hr />

        {/* CURRENT STAGE */}
        <label>Current Stage</label>
        <select
          className="form-input"
          name="current_stage"
          value={form.current_stage}
          onChange={handleChange}
          disabled={role !== "CASE" || isClosed}
        >
          <option value="UI">Under Investigation</option>
          <option value="PT">Pending Trial</option>
          <option value="HC">Pending before High Court</option>
          <option value="SC">Pending before Supreme Court</option>
          <option value="CC">Case Closed</option>
        </select>

        {/* ACTION */}
        <label>Action to be Taken</label>
        <textarea
          className="form-input"
          name="action_to_be_taken"
          value={form.action_to_be_taken}
          onChange={handleChange}
          disabled={role !== "CASE" || isClosed}
        />

        {/* UPDATE BUTTON */}
        {role === "CASE" && !isClosed && (
          <button onClick={handleUpdate}>
            Update Case
          </button>
        )}

        <br /><br />
        <button onClick={() => navigate("/cases")}>
          Back to Cases
        </button>
      </div>
    </>
  );
}

export default CaseDetail;
