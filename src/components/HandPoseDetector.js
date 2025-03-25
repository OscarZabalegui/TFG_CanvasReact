import React, { useEffect, useRef, useState } from "react";

export default function HandPoseDetector({ onHandMove, onHandClick, onGesture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [hands, setHands] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [handPoseActive, setHandPoseActive] = useState(false);

  const startCamera = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
        }
      })
      .catch((err) => console.error("Error obteniendo el stream de video:", err));
  };

  const startHandPoseDetection = () => {
    if (!videoRef.current) return;

    const handpose = window.ml5.handPose(videoRef.current, () => {
      console.log("Modelo HandPose cargado");

      const gotHands = (results) => {
        if (results) {
          setHands(results);
          detectGestures(results);
        }
      };

      handpose.detectStart(videoRef.current, gotHands);
    });
    setHandPoseActive(true);
  };

  const detectGestures = (hands) => {
    if (!hands || hands.length === 0) return;

    hands.forEach((hand) => {
      if (!hand.keypoints) return;

      const thumbTip = hand.keypoints[4];
      const indexTip = hand.keypoints[8];
      
      if (thumbTip && indexTip) {
        const distance = Math.hypot(
          thumbTip.x - indexTip.x,
          thumbTip.y - indexTip.y
        );

        if (distance < 30 && onGesture) {
          const centerX = (thumbTip.x + indexTip.x) / 2;
          const centerY = (thumbTip.y + indexTip.y) / 2;
          onGesture('pinch', { x: centerX, y: centerY });
        }
      }
    });
  };

useEffect(() => {
  if (!canvasRef.current || !videoRef.current) return;
  
  const ctx = canvasRef.current.getContext("2d");
  let animationFrameId;
  let lastUpdateTime = 0;

  const drawLoop = (timestamp) => {
    if (!canvasRef.current || !videoRef.current) {
      return;
    }

    // Limitar actualizaciones a ~30 FPS
    if (timestamp - lastUpdateTime < 33) { // ~30 FPS
      animationFrameId = requestAnimationFrame(drawLoop);
      return;
    }

    lastUpdateTime = timestamp;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

    if (!hands || hands.length === 0) {
      animationFrameId = requestAnimationFrame(drawLoop);
      return;
    }

    // Dibujar puntos de la mano en morado
    hands.forEach(hand => {
      if (!hand.keypoints) return;

      const color = hand.handedness === "Left" ? "#FF00FF" : "#800080";
      hand.keypoints.forEach(({ x, y }) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Solo llamar a onHandMove para el dedo índice (keypoint 8)
      const indexFinger = hand.keypoints[8];
      if (indexFinger && onHandMove) {
        onHandMove(indexFinger.x, indexFinger.y);
      }

      // Lógica de detección de gestos (pinch)
      const thumbTip = hand.keypoints[4];
      const indexTip = hand.keypoints[8];
      if (thumbTip && indexTip && onGesture) {
        const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        if (distance < 30) {
          const centerX = (thumbTip.x + indexTip.x) / 2;
          const centerY = (thumbTip.y + indexTip.y) / 2;
          onGesture('pinch', { x: centerX, y: centerY });
        }
      }
    });

    animationFrameId = requestAnimationFrame(drawLoop);
  };

  animationFrameId = requestAnimationFrame(drawLoop);

  return () => {
    cancelAnimationFrame(animationFrameId);
  };
}, [hands]); // Dependencias del efecto

  return (
    <div style={{ position: "relative", width: 640, height: 480, marginBottom: "100px" }}>
      <canvas ref={canvasRef} width={640} height={480} />
      <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
        <button onClick={startCamera} disabled={cameraActive} style={{ marginRight: "10px" }}>
          Activar Cámara
        </button>
        <button onClick={startHandPoseDetection} disabled={!cameraActive || handPoseActive}>
          Iniciar Detección de Manos
        </button>
      </div>
      <div style={{ display: "none" }}>
        <video ref={videoRef} width={640} height={480} style={{ display: "none" }} />
      </div>
    </div>
  );
}