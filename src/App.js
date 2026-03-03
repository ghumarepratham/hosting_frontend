import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drag, setDrag] = useState(false);
  const [selectedCol, setSelectedCol] = useState("");
  const [activeTab, setActiveTab] = useState("Describe");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };
  const handleDrag = (e) => {
    e.preventDefault();
    setDrag(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDrag(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/analyze",
        formData
      );

      setResult(response.data);
    } catch (e) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.message ||
        "Upload failed";
      setError(detail);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (result && Array.isArray(result.columns) && result.columns.length > 0) {
      setSelectedCol(result.columns[0]);
    } else {
      setSelectedCol("");
    }
  }, [result]);

  const statsCards = () => {
    const shape = result?.shape || [];
    const columns = result?.columns || [];
    const missing = result?.missing_values || {};
    const totalMissing = Object.values(missing).reduce((a, b) => a + (Number(b) || 0), 0);
    return (
      <div className="stats">
        <div className="stat">
          <div className="stat-title">Rows</div>
          <div className="stat-value">{shape[0] ?? "-"}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Columns</div>
          <div className="stat-value">{columns.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Total Missing</div>
          <div className="stat-value">{totalMissing}</div>
        </div>
        <div className="stat">
          <div className="stat-title">File</div>
          <div className="stat-value">{file?.name || "-"}</div>
        </div>
      </div>
    );
  };

  const renderKeyValTable = (obj, headers) => {
    const entries = Object.entries(obj || {});
    return (
      <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>{headers[0]}</th>
            <th>{headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    );
  };

  const renderDescribeTable = (desc) => {
    const cols = Object.keys(desc || {});
    const statSet = new Set();
    cols.forEach((c) => Object.keys(desc[c] || {}).forEach((s) => statSet.add(s)));
    const stats = Array.from(statSet);
    const cellMin = 180;
    const tableMinWidth = (cols.length + 1) * cellMin;
    return (
      <div className="table-wrapper">
      <table style={{ minWidth: tableMinWidth }}>
        <thead>
          <tr>
            <th style={{ minWidth: cellMin, whiteSpace: "nowrap" }}>Statistic</th>
            {cols.map((c) => (
              <th key={c} style={{ minWidth: cellMin, whiteSpace: "nowrap" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s}>
              <td style={{ minWidth: cellMin }}>{s}</td>
              {cols.map((c) => {
                const val = desc[c]?.[s];
                const isNum = typeof val === "number";
                return <td key={c + s} style={{ minWidth: cellMin }}>{isNum ? Number(val).toFixed(4) : String(val ?? "")}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    );
  };

  return (
    <div className="page">
      <header className="header">
        <div className="brand">Data Analyzer</div>
        <nav className="nav">
          {["Columns", "Missing", "Describe", "Outliers", "Summaries"].map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <div className="container">
        <div className="hero">
          <h2>CSV / Excel Analyzer</h2>
          <p>Upload a file to view clean tables and statistics</p>
        <div
          className={`dropzone ${drag ? "drag" : ""}`}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onDragLeave={handleDragLeave}
        >
          <div className="controls">
            <input
              className="file-input"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
            />
            <button className="button" onClick={handleUpload} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </div>
        {result && statsCards()}
      </div>

        {result && (
          <>
            {activeTab === "Columns" && (
              <div className="panel">
                <h2>Columns</h2>
                {renderKeyValTable(
                  (result.columns || []).reduce((acc, c) => {
                    acc[c] = result.dtypes?.[c] || "";
                    return acc;
                  }, {}),
                  ["Column", "Type"]
                )}
              </div>
            )}

            {activeTab === "Missing" && (
              <div className="panel">
                <h2>Missing Values</h2>
                {renderKeyValTable(result.missing_values || {}, ["Column", "Missing"])}
              </div>
            )}

            {activeTab === "Describe" && (
              <div className="panel">
                <h2>Describe</h2>
                {renderDescribeTable(result.describe || {})}
              </div>
            )}

            {activeTab === "Outliers" && (
              <div className="panel">
                <h2>Outliers (IQR Method)</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Lower Bound</th>
                      <th>Upper Bound</th>
                      <th>Outlier Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.outliers || {}).map(([col, info]) => (
                      <tr key={col}>
                        <td>{col}</td>
                        <td>{info.lower_bound === null ? "-" : Number(info.lower_bound).toFixed(4)}</td>
                        <td>{info.upper_bound === null ? "-" : Number(info.upper_bound).toFixed(4)}</td>
                        <td>{info.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "Summaries" && (
              <div className="panel">
                <h2>Column Summaries</h2>
                <div className="radio-group">
                  {(result.columns || []).map((c) => (
                    <label key={c} className={`radio-item ${selectedCol === c ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="col-summary"
                        value={c}
                        checked={selectedCol === c}
                        onChange={() => setSelectedCol(c)}
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
                <div className="summary-text">
                  {(result.summaries?._lines?.[selectedCol] || []).length > 0 ? (
                    <ul className="summary-list">
                      {result.summaries._lines[selectedCol].map((line, idx) => (
                        <li key={idx}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    (result.summaries?.[selectedCol] || "Select a column to view its summary")
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="footer">
        <div>© {new Date().getFullYear()} Data Analyzer</div>
      </footer>
    </div>
  );
}

export default App;
