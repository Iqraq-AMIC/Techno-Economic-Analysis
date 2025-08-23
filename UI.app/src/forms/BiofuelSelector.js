import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { Card, CardHeader, CardBody, FormGroup, FormSelect } from "shards-react";

export default function BiofuelSelector({ onProcessChange, onFeedstockChange }) {
  const [processes, setProcesses] = useState([]);
  const [feedstocks, setFeedstocks] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedFeedstock, setSelectedFeedstock] = useState("");
  const [feedstockDetails, setFeedstockDetails] = useState(null);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/processes").then((res) => {
      setProcesses(res.data);
    });
  }, []);

  useEffect(() => {
    if (selectedProcess) {
      axios.get(`http://127.0.0.1:8000/feedstocks/${selectedProcess}`).then((res) => {
        setFeedstocks(res.data);
      });
    }
  }, [selectedProcess]);

  useEffect(() => {
    if (selectedFeedstock) {
      axios.get(`http://127.0.0.1:8000/feedstock/${selectedFeedstock}`).then((res) => {
        setFeedstockDetails(res.data);
      });
    }
  }, [selectedFeedstock]);

  const handleProcessSelect = (e) => {
    const process = e.target.value;
    setSelectedProcess(process);
    setSelectedFeedstock(""); // Reset feedstock when process changes
    onProcessChange(process);
    onFeedstockChange("");
  };

  const handleFeedstockSelect = (e) => {
    const feedstock = e.target.value;
    setSelectedFeedstock(feedstock);
    onFeedstockChange(feedstock);
  };

  return (
    <Card small className="mb-4">
      <CardHeader>
        <h2>Biofuel Selector</h2>
      </CardHeader>
      <CardBody>
        <FormGroup className="mb-3">
          <label htmlFor="process_technology">Process Technology</label>
          <FormSelect
            id="process_technology"
            value={selectedProcess}
            onChange={handleProcessSelect}
          >
            <option value="">-- Select Process --</option>
            {processes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </FormSelect>
        </FormGroup>

        {selectedProcess && (
          <FormGroup className="mb-3">
            <label htmlFor="feedstock">Feedstock</label>
            <FormSelect
              id="feedstock"
              value={selectedFeedstock}
              onChange={handleFeedstockSelect}
            >
              <option value="">-- Select Feedstock --</option>
              {feedstocks.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </FormSelect>
          </FormGroup>
        )}
      </CardBody>
    </Card>
  );
}

BiofuelSelector.propTypes = {
  onProcessChange: PropTypes.func.isRequired,
  onFeedstockChange: PropTypes.func.isRequired,
};