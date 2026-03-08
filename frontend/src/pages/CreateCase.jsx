import { useState } from "react";
import { useNavigate } from "react-router-dom";

function CreateCase() {
  const navigate = useNavigate();
  const branch = localStorage.getItem("branch"); // officer branch (read-only)

  const [form, setForm] = useState({
    ps_limit: "",
    crime_number: "",
    section_of_law: "",
    date_of_occurrence: "",
    date_of_registration: "",
    complainant_name: "",
    accused_details: "",
    gist_of_case: "",
    action_to_be_taken: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const token = localStorage.getItem("access");
    if (!token) {
      setError("Not logged in");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8002/api/cases/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          current_stage: "UI", // ✅ FORCE default stage
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // show backend validation error if any
        throw new Error(
          typeof data === "object"
            ? Object.values(data).flat().join(", ")
            : "Failed to create case"
        );
      }

      navigate("/cases");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="form-container">
      <h2>Create New Case</h2>

      {/* Branch shown but NOT editable */}
      <p>
        <b>Branch:</b> {branch}
      </p>

      {error && <p className="error-text">{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          className="form-input"
          name="ps_limit"
          placeholder="PS Limit"
          onChange={handleChange}
          required
        />

        <input
          className="form-input"
          name="crime_number"
          placeholder="Crime Number"
          onChange={handleChange}
          required
        />

        <input
          className="form-input"
          name="section_of_law"
          placeholder="Section of Law"
          onChange={handleChange}
          required
        />

        <label>Date of Occurrence</label>
        <input
          className="form-input"
          type="date"
          name="date_of_occurrence"
          onChange={handleChange}
          required
        />

        <label>Date of Registration</label>
        <input
          className="form-input"
          type="date"
          name="date_of_registration"
          onChange={handleChange}
          required
        />

        <input
          className="form-input"
          name="complainant_name"
          placeholder="Complainant Name"
          onChange={handleChange}
        />

        <textarea
          className="form-input"
          name="accused_details"
          placeholder="Accused Details"
          onChange={handleChange}
        />

        <textarea
          className="form-input"
          name="gist_of_case"
          placeholder="Gist of Case"
          onChange={handleChange}
        />

        {/* Stage shown but locked */}
        <label>Current Stage</label>
        <input
          className="form-input"
          value="Under Investigation"
          disabled
        />

        <textarea
          className="form-input"
          name="action_to_be_taken"
          placeholder="Action to be Taken"
          onChange={handleChange}
        />

        <button type="submit" className="submit-btn">
          Create Case
        </button>
      </form>
    </div>
  );
}

export default CreateCase;
