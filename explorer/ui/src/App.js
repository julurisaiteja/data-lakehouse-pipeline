import React, { useEffect, useState } from "react";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
const DEMO_MODE = typeof window !== "undefined" && (
  window.location.hostname.endsWith(".workers.dev") ||
  window.location.hostname.endsWith(".pages.dev")
);
const DEMO_TABLES = {
  bronze: {
    rowCount: 12,
    schema: { event_id: "string", type: "string", customer_id: "string", amount: "double", region: "string" },
    versions: [
      { version: 4, operation: "APPEND", timestamp: "2026-10-05T12:30:00.000Z" },
      { version: 3, operation: "APPEND", timestamp: "2026-10-05T11:15:00.000Z" },
      { version: 2, operation: "CREATE", timestamp: "2026-10-05T09:00:00.000Z" },
    ],
    rows: [
      { event_id: "evt-2104", type: "order_placed", customer_id: "cus-1008", amount: 128.5, region: "West" },
      { event_id: "evt-2103", type: "payment_captured", customer_id: "cus-1004", amount: 76, region: "North" },
      { event_id: "evt-2102", type: "order_placed", customer_id: "cus-1012", amount: 244.9, region: "East" },
      { event_id: "evt-2101", type: "inventory_adjusted", customer_id: "cus-1002", amount: -3, region: "West" },
      { event_id: "evt-2100", type: "payment_captured", customer_id: "cus-1010", amount: 59.99, region: "South" },
      { event_id: "evt-2099", type: "order_placed", customer_id: "cus-1001", amount: 182, region: "North" },
      { event_id: "evt-2098", type: "refund_issued", customer_id: "cus-1004", amount: -24, region: "North" },
    ],
  },
  silver: {
    rowCount: 7,
    schema: { event_id: "string", type: "string", customer_id: "string", amount: "double", region: "string" },
    versions: [
      { version: 8, operation: "MERGE", timestamp: "2026-10-05T13:05:00.000Z" },
      { version: 7, operation: "OPTIMIZE", timestamp: "2026-10-05T12:45:00.000Z" },
      { version: 6, operation: "MERGE", timestamp: "2026-10-05T11:50:00.000Z" },
    ],
    rows: [
      { event_id: "evt-2104", type: "order_placed", customer_id: "cus-1008", amount: 128.5, region: "West" },
      { event_id: "evt-2103", type: "payment_captured", customer_id: "cus-1004", amount: 76, region: "North" },
      { event_id: "evt-2102", type: "order_placed", customer_id: "cus-1012", amount: 244.9, region: "East" },
      { event_id: "evt-2100", type: "payment_captured", customer_id: "cus-1010", amount: 59.99, region: "South" },
      { event_id: "evt-2099", type: "order_placed", customer_id: "cus-1001", amount: 182, region: "North" },
      { event_id: "evt-2098", type: "refund_issued", customer_id: "cus-1004", amount: -24, region: "North" },
      { event_id: "evt-2097", type: "inventory_adjusted", customer_id: "cus-1002", amount: -3, region: "West" },
    ],
  },
  silver_corrected: {
    rowCount: 6,
    schema: { event_id: "string", type: "string", customer_id: "string", amount: "double", region: "string" },
    versions: [
      { version: 2, operation: "UPDATE", timestamp: "2026-10-05T13:18:00.000Z" },
      { version: 1, operation: "CREATE", timestamp: "2026-10-05T13:10:00.000Z" },
    ],
    rows: [
      { event_id: "evt-2104", type: "order_placed", customer_id: "cus-1008", amount: 128.5, region: "West" },
      { event_id: "evt-2103", type: "payment_captured", customer_id: "cus-1004", amount: 76, region: "North" },
      { event_id: "evt-2102", type: "order_placed", customer_id: "cus-1012", amount: 244.9, region: "East" },
      { event_id: "evt-2100", type: "payment_captured", customer_id: "cus-1010", amount: 59.99, region: "South" },
      { event_id: "evt-2099", type: "order_placed", customer_id: "cus-1001", amount: 182, region: "North" },
      { event_id: "evt-2098", type: "refund_issued", customer_id: "cus-1004", amount: -24, region: "North" },
    ],
  },
};

function App() {
  const [table, setTable] = useState("silver");
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [query, setQuery] = useState(
    "SELECT type, COUNT(*) AS event_count FROM table GROUP BY type ORDER BY event_count DESC LIMIT 5"
  );
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (DEMO_MODE) {
      setVersions(DEMO_TABLES[table].versions);
      setSelectedVersion(DEMO_TABLES[table].versions[0].version);
      setMetadata(null);
      setResults([]);
      setError("");
      return;
    }

    fetch(`${API_BASE}/api/tables/${table}/versions`)
      .then((res) => res.json())
      .then((data) => {
        setVersions(data);
        if (data.length > 0) {
          setSelectedVersion(data[0].version);
        }
      })
      .catch((err) => setError(String(err)));
  }, [table]);

  useEffect(() => {
    if (selectedVersion === null) return;
    if (DEMO_MODE) {
      const sample = DEMO_TABLES[table];
      setMetadata({ rowCount: sample.rowCount, schema: sample.schema });
      return;
    }

    fetch(`${API_BASE}/api/tables/${table}/versions/${selectedVersion}`)
      .then((res) => res.json())
      .then((data) => setMetadata(data))
      .catch((err) => setError(String(err)));
  }, [table, selectedVersion]);

  const runQuery = () => {
    setError("");
    if (DEMO_MODE) {
      const sampleRows = DEMO_TABLES[table].rows;
      const typeFilter = query.match(/where\s+type\s*=\s*['"]([^'"]+)['"]/i)?.[1]?.toLowerCase();
      const limit = Number(query.match(/limit\s+(\d+)/i)?.[1] || 5);
      let rows = typeFilter
        ? sampleRows.filter((row) => row.type.toLowerCase() === typeFilter)
        : sampleRows;

      if (/count\s*\(/i.test(query) && /group\s+by\s+type/i.test(query)) {
        const groups = new Map();
        rows.forEach((row) => groups.set(row.type, (groups.get(row.type) || 0) + 1));
        rows = [...groups].map(([type, event_count]) => ({ type, event_count }));
      }

      setResults(rows.slice(0, Math.max(1, Math.min(limit, 50))));
      return;
    }

    fetch(`${API_BASE}/api/tables/${table}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, version: selectedVersion }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || "Query failed");
          });
        }
        return res.json();
      })
      .then((data) => setResults(data))
      .catch((err) => setError(String(err)));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>Lakehouse Explorer</h2>
      </header>
      {DEMO_MODE && (
        <div className="demo-callout" role="status">
          Demo snapshot · Sample lakehouse rows and version history. SQL preview supports type filters and grouped counts; no live warehouse is connected.
        </div>
      )}
      <div className="App-container">
        <aside className="Sidebar">
          <div>
            <label>Table:&nbsp;</label>
            <select
              value={table}
              onChange={(e) => {
                setTable(e.target.value);
                setMetadata(null);
                setResults([]);
              }}
            >
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="silver_corrected">Silver Corrected</option>
            </select>
          </div>
          <h4>Versions</h4>
          <ul className="Version-list">
            {versions.map((v) => (
              <li
                key={v.version}
                className={
                  selectedVersion === v.version ? "Version-item selected" : "Version-item"
                }
                onClick={() => setSelectedVersion(v.version)}
              >
                v{v.version} - {v.operation} -{" "}
                {new Date(v.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        </aside>
        <main className="Main">
          <section className="Metadata">
            <h3>Metadata</h3>
            {metadata ? (
              <div>
                <p>Row count: {metadata.rowCount}</p>
                <h4>Schema</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(metadata.schema).map(([col, typ]) => (
                      <tr key={col}>
                        <td>{col}</td>
                        <td>{typ}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No metadata loaded.</p>
            )}
          </section>

          <section className="Query">
            <h3>SQL Editor</h3>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={6}
              cols={80}
            />
            <br />
            <button onClick={runQuery}>Run</button>
            {error && <p className="Error">Error: {error}</p>}
          </section>

          <section className="Results">
            <h3>Results</h3>
            {results.length === 0 ? (
              <p>No results.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    {Object.keys(results[0]).map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(row).map((k) => (
                        <td key={k}>{String(row[k])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
