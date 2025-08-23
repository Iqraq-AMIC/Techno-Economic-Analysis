import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardHeader, CardBody } from "shards-react";

export default function BiofuelSelector() {
  const [processes, setProcesses] = useState([]);
  const [feedstocks, setFeedstocks] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedFeedstock, setSelectedFeedstock] = useState("");
  const [feedstockDetails, setFeedstockDetails] = useState(null);

  // Load process technologies on mount
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/processes").then((res) => {
      setProcesses(res.data);
    });
  }, []);

  // When process changes, load feedstocks
  useEffect(() => {
    if (selectedProcess) {
      axios.get(`http://127.0.0.1:8000/feedstocks/${selectedProcess}`).then((res) => {
        setFeedstocks(res.data);
      });
    }
  }, [selectedProcess]);

  // When feedstock changes, load details
  useEffect(() => {
    if (selectedFeedstock) {
      axios.get(`http://127.0.0.1:8000/feedstock/${selectedFeedstock}`).then((res) => {
        setFeedstockDetails(res.data);
      });
    }
  }, [selectedFeedstock]);

  return (
    <Card small className="mb-4">
      <CardHeader>
        <h2>Biofuel Selector</h2>
      </CardHeader>
      <CardBody>
        {/* Process Technology Dropdown */}
        <label>
          Process Technology:
          <select
            value={selectedProcess}
            onChange={(e) => {
              setSelectedProcess(e.target.value);
              setSelectedFeedstock(""); // reset feedstock
              setFeedstockDetails(null);
            }}
          >
            <option value="">-- Select Process --</option>
            {processes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value="Others">Others</option>
          </select>
        </label>

        {/* If "Others", custom input */}
        {selectedProcess === "Others" && (
          <div>
            <input
              type="text"
              placeholder="Enter custom process"
              onChange={(e) => setSelectedProcess(e.target.value)}
            />
          </div>
        )}

        <br />

        {/* Feedstock Dropdown */}
        {selectedProcess && (
          <label>
            Feedstock:
            <select
              value={selectedFeedstock}
              onChange={(e) => setSelectedFeedstock(e.target.value)}
            >
              <option value="">-- Select Feedstock --</option>
              {feedstocks.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
              <option value="Others">Others</option>
            </select>
          </label>
        )}

        {/* If "Others", custom input */}
        {selectedFeedstock === "Others" && (
          <div>
            <input
              type="text"
              placeholder="Enter custom feedstock"
              onChange={(e) => setSelectedFeedstock(e.target.value)}
            />
          </div>
        )}

        {/* Show Feedstock Details */}
        {feedstockDetails && (
          <div style={{ marginTop: "20px" }}>
            <h3>{feedstockDetails.Feedstock} Details</h3>
            <pre>{JSON.stringify(feedstockDetails, null, 2)}</pre>
          </div>
        )}
      </CardBody>
    </Card>
  );
}