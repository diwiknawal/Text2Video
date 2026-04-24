"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Video, Mic, Image as ImageIcon, CheckCircle, Loader2, Play } from "lucide-react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [script, setScript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(0); // 0: Input, 1: Scenes, 2: Assets, 3: Final
  const [scenes, setScenes] = useState([]);
  const [assets, setAssets] = useState([]);
  const [finalVideo, setFinalVideo] = useState(null);
  const [progress, setProgress] = useState(0);

  const steps = [
    { name: "Script Analysis", icon: <Sparkles size={20} /> },
    { name: "Visual Generation", icon: <ImageIcon size={20} /> },
    { name: "Voice Over", icon: <Mic size={20} /> },
    { name: "Video Assembly", icon: <Video size={20} /> },
  ];

  const handleGenerate = async () => {
    if (!script) return;
    setIsGenerating(true);
    setStep(0);
    setProgress(0);

    try {
      // 1. Generate Scenes
      const sceneRes = await axios.post(`${API_URL}/generate-scenes`, { script });
      const generatedScenes = sceneRes.data.scenes;
      setScenes(generatedScenes);
      setStep(1);
      setProgress(25);

      // 2. Generate Assets for each scene
      const generatedAssets = [];
      for (let i = 0; i < generatedScenes.length; i++) {
        const assetRes = await axios.post(`${API_URL}/generate-assets`, generatedScenes[i]);
        generatedAssets.push(assetRes.data);
        setProgress(25 + ((i + 1) / generatedScenes.length) * 50);
      }
      setAssets(generatedAssets);
      setStep(3);
      setProgress(75);

      // 3. Assemble Video
      const videoRes = await axios.post(`${API_URL}/assemble-video`, generatedAssets);
      setFinalVideo(videoRes.data.video_url);
      setStep(4);
      setProgress(100);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Something went wrong. Please check if Docker containers are running.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <header style={{ textAlign: "center", marginBottom: "4rem" }}>
          <motion.h1
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            AI Video Creator
          </motion.h1>
          <p style={{ opacity: 0.7, fontSize: "1.1rem" }}>
            Turn your scripts into cinematic videos with one click.
          </p>
        </header>

        <div className="glass-panel">
          {!finalVideo ? (
            <>
              <div style={{ marginBottom: "2rem" }}>
                <label style={{ display: "block", marginBottom: "1rem", fontWeight: "600", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.6 }}>
                  Enter your script
                </label>
                <textarea
                  className="input-field"
                  placeholder="Once upon a time, in a world made of neon lights..."
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              {isGenerating && (
                <div style={{ marginBottom: "2rem" }}>
                  <div className="step-indicator">
                    {steps.map((s, i) => (
                      <div key={i} className={`step ${step >= i ? "active" : ""}`} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Loader2 className="animate-spin" size={18} />
                      <span style={{ fontWeight: "500" }}>{steps[Math.min(step, 3)].name}...</span>
                    </div>
                    <span style={{ opacity: 0.5 }}>{Math.round(progress)}%</span>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button 
                  className="glow-button" 
                  onClick={handleGenerate}
                  disabled={isGenerating || !script}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}
                >
                  {isGenerating ? "Creating Magic..." : "Generate Video"}
                  {!isGenerating && <Sparkles size={20} />}
                </button>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: "center" }}
            >
              <h2 style={{ marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <CheckCircle color="#10b981" /> Video Ready
              </h2>
              <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", background: "#000", aspectRatio: "1/1" }}>
                <video 
                  src={`${API_URL}${finalVideo}`} 
                  controls 
                  autoPlay
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              <button 
                className="glow-button" 
                style={{ marginTop: "2rem" }}
                onClick={() => { setFinalVideo(null); setScript(""); setProgress(0); setStep(0); }}
              >
                Create Another
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      <footer style={{ marginTop: "4rem", textAlign: "center", opacity: 0.4, fontSize: "0.8rem" }}>
        Powered by Ollama, Stable Diffusion, and Piper
      </footer>

      <style jsx>{`
        .animate-spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
