import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import './AlgorithmicLoader.css';

const AlgorithmicLoader = ({ onComplete }) => {
  const [nodes, setNodes] = useState([]);
  const [stage, setStage] = useState("scanning");
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Determine visualization dimensions based on screen size
    const vizWidth = isMobile ? (window.innerWidth <= 480 ? 250 : 300) : 400;
    const vizHeight = isMobile ? (window.innerWidth <= 480 ? 160 : 200) : 300;
    
    const initialNodes = Array.from({ length: 12 }, (_, i) => ({
      id: `node-${i}`,
      x: Math.random() * (vizWidth - 20) + 10,
      y: Math.random() * (vizHeight - 20) + 10,
      connections: [],
      isActive: false,
      isMatched: false,
    }));

    initialNodes.forEach((node, i) => {
      const connectionCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < connectionCount; j++) {
        const targetIndex = Math.floor(Math.random() * initialNodes.length);
        if (targetIndex !== i && !node.connections.includes(initialNodes[targetIndex].id)) {
          node.connections.push(initialNodes[targetIndex].id);
        }
      }
    });

    setNodes(initialNodes);

    const sequence = async () => {
      // Stage 1: Scanning
      setStage("scanning");
      const scanDuration = 2000;
      const scanSteps = 50;
      for (let i = 0; i <= scanSteps; i++) {
        setProgress((i / scanSteps) * 100);
        await new Promise((resolve) => setTimeout(resolve, scanDuration / scanSteps));
      }

      // Stage 2: Analyzing
      setStage("analyzing");
      const analysisDuration = initialNodes.length * 200;
      for (let i = 0; i < initialNodes.length; i++) {
        setNodes((prev) => prev.map((node, index) => (index === i ? { ...node, isActive: true } : node)));
        setProgress((i / (initialNodes.length - 1)) * 100);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Stage 3: Matching
      setStage("matching");
      const matchedIndices = [2, 5, 8, 10];
      for (const index of matchedIndices) {
        setNodes((prev) => prev.map((node, i) => (i === index ? { ...node, isMatched: true } : node)));
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Stage 4: Complete
      setStage("complete");
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (onComplete) {
        onComplete();
      }
    };

    sequence();
  }, [onComplete, isMobile]);

  const getNodeById = (id) => nodes.find((node) => node.id === id);

  const stageTexts = {
      scanning: {
          title: "Scanning your network...",
          subtitle: "Identifying potential recommenders in your trust circle"
      },
      analyzing: {
          title: "Analyzing connections...",
          subtitle: "Evaluating recommendation history and expertise"
      },
      matching: {
          title: "Finding perfect matches...",
          subtitle: "Matching your request with the best contacts"
      },
      complete: {
          title: "We've got you covered!",
          subtitle: "Ready to connect you with trusted recommenders"
      }
  }

  return (
    <div className="algorithmic-loader-container">
      <div className="algorithmic-loader-content">
        <div className="algorithmic-loader-visualization">
          <svg className="algorithmic-loader-svg">
            <defs>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            {nodes.map((node) =>
              node.connections.map((connectionId) => {
                const targetNode = getNodeById(connectionId);
                if (!targetNode) return null;

                return (
                  <motion.line
                    key={`${node.id}-${connectionId}`}
                    x1={node.x}
                    y1={node.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke="url(#connectionGradient)"
                    strokeWidth="2"
                    opacity={node.isActive || targetNode.isActive ? 0.6 : 0.2}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: Math.random() * 1 }}
                  />
                );
              }),
            )}
          </svg>

          {nodes.map((node, index) => (
            <motion.div
              key={node.id}
              className={`node ${node.isMatched ? "matched" : ""} ${node.isActive ? "active" : ""}`}
              style={{ left: node.x - 8, top: node.y - 8 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: node.isActive ? 1.5 : 1,
                opacity: 1,
              }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                scale: { duration: 0.3 },
              }}
            >
              {node.isActive && (
                <motion.div
                  className="node-pulse"
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          className="algorithmic-loader-text"
          key={stage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2>{stageTexts[stage].title}</h2>
          <p>{stageTexts[stage].subtitle}</p>

          <div className="progress-bar-container">
            <motion.div
              className="progress-bar"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AlgorithmicLoader; 