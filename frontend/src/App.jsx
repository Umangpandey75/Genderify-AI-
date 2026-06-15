import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [mode, setMode] = useState("camera"); // "camera" | "upload"
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Stop camera stream helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Start camera stream helper
  const startCamera = async () => {
    setCameraError(null);
    setResult(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Unable to access camera. Please check permissions.");
    }
  };

  // Switch tabs
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setResult(null);
    setError(null);
    if (newMode === "upload") {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    if (mode === "camera") {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode]);

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  // Drag-and-drop handlers
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  // Send image file to backend
  const uploadAndPredict = async (fileBlob) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", fileBlob, "capture.jpg");

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Prediction failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to connect to classification server.");
    } finally {
      setLoading(false);
    }
  };

  // Capture frame from video and predict
  const handleCapture = () => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Draw the current video frame on canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to Blob and submit
    canvas.toBlob((blob) => {
      if (blob) {
        uploadAndPredict(blob);
      }
    }, "image/jpeg", 0.95);
  };

  // Submit uploaded file
  const handleSubmitFile = () => {
    if (selectedFile) {
      uploadAndPredict(selectedFile);
    }
  };

  // Clear upload selection
  const handleClearUpload = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="logo-text">Genderify <span className="logo-highlight">AI</span></h1>
        <p className="subtitle">Real-time classification powered by MobileNetV2</p>
      </header>

      <main className="main-content">
        <div className="glass-card">
          {/* Tabs */}
          <div className="tabs-container">
            <button
              className={`tab-btn ${mode === "camera" ? "active" : ""}`}
              onClick={() => handleModeChange("camera")}
            >
              <span className="tab-icon">📷</span> Live Camera Scanner
            </button>
            <button
              className={`tab-btn ${mode === "upload" ? "active" : ""}`}
              onClick={() => handleModeChange("upload")}
            >
              <span className="tab-icon">📤</span> Photo Upload
            </button>
          </div>

          <div className="tab-content">
            {/* Camera View */}
            {mode === "camera" && (
              <div className="camera-view">
                {cameraError ? (
                  <div className="camera-error-container">
                    <p className="error-text">{cameraError}</p>
                    <button className="primary-btn" onClick={startCamera}>
                      Try Accessing Camera Again
                    </button>
                  </div>
                ) : (
                  <div className="video-wrapper">
                    <video ref={videoRef} className="video-player" playsInline muted></video>
                    {!cameraActive && (
                      <div className="video-overlay">
                        <div className="scanner-line"></div>
                        <p>Camera Starting...</p>
                      </div>
                    )}
                    {cameraActive && <div className="scanner-overlay"><div className="scanning-bar"></div></div>}
                  </div>
                )}

                {cameraActive && (
                  <div className="controls">
                    <button className="predict-btn shadow-neon-blue" onClick={handleCapture} disabled={loading}>
                      {loading ? "Analyzing Frame..." : "Scan & Detect"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Photo Upload View */}
            {mode === "upload" && (
              <div className="upload-view">
                {!imagePreview ? (
                  <div
                    className="drag-drop-zone"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-input").click()}
                  >
                    <div className="upload-icon">📁</div>
                    <h3>Drag & Drop your image here</h3>
                    <p>or click to browse from files</p>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </div>
                ) : (
                  <div className="preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <div className="preview-controls">
                      <button className="predict-btn shadow-neon-purple" onClick={handleSubmitFile} disabled={loading}>
                        {loading ? "Analyzing Photo..." : "Predict Gender"}
                      </button>
                      <button className="secondary-btn" onClick={handleClearUpload} disabled={loading}>
                        Clear Image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Canvas for frame extraction */}
            <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
          </div>

          {/* Response Display Section */}
          {(loading || result || error) && (
            <div className="results-card">
              {loading && (
                <div className="loading-container">
                  <div className="quantum-spinner"></div>
                  <p className="loading-text">Performing AI Inference...</p>
                </div>
              )}

              {error && (
                <div className="error-alert">
                  <span className="error-icon">⚠️</span>
                  <p>{error}</p>
                </div>
              )}

              {result && !loading && (
                <div className="result-display fade-in">
                  <h3>Detection Result</h3>
                  <div className="result-badge-container">
                    <div className={`result-gender-badge ${result.gender === "woman" ? "female" : "male"}`}>
                      {result.gender === "woman" ? "👩 WOMAN" : "👨 MAN"}
                    </div>
                  </div>

                  <div className="confidence-section">
                    <div className="confidence-labels">
                      <span>Confidence</span>
                      <span className="confidence-value">{result.confidence}%</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${result.gender === "woman" ? "female-bg" : "male-bg"}`}
                        style={{ width: `${result.confidence}%` }}
                      ></div>
                    </div>
                  </div>
                  {result.confidence < 65 && (
                    <div className="warning-badge">
                      ⚠️ Low Confidence: The model is unsure about this classification.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>Model Accuracy: 96.60% | Powered by TensorFlow & React</p>
        <div className="footer-links">
          <a href="https://github.com/Umangpandey75" target="_blank" rel="noopener noreferrer" className="footer-link-icon" title="GitHub">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 16 16" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
          </a>
          <a href="https://www.linkedin.com/in/umang-pandey-01b486273/" target="_blank" rel="noopener noreferrer" className="footer-link-icon" title="LinkedIn">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 16 16" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"></path>
            </svg>
          </a>
          <a href="http://umangpandey.vercel.app/" target="_blank" rel="noopener noreferrer" className="footer-link-icon" title="Portfolio">
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
