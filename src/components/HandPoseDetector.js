import React, { useEffect, useRef, useState } from "react";

export default function HandPoseDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [hands, setHands] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [handPoseActive, setHandPoseActive] = useState(false);

  const startCamera = () => {
    // Solicitar acceso a la cámara
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          // Asignar el stream de video al elemento de video
          videoRef.current.srcObject = stream;
          // Asegurarse de que el video se reproduce
          videoRef.current.play();
          setCameraActive(true); // Indica que la cámara está activa
        }
      })
      .catch((err) => {
        console.error("Error obteniendo el stream de video:", err);
      });
  };

  const startHandPoseDetection = () => {
    if (!videoRef.current) return;

    const handpose = window.ml5.handPose(videoRef.current, () => {
      console.log("Modelo HandPose cargado");

      // Función callback para cuando se detectan las manos
      const gotHands = (results) => {
        if (results) {
          setHands(results);
        }
      };

      // Iniciar la detección continua de las manos
      handpose.detectStart(videoRef.current, gotHands);
    });
    setHandPoseActive(true); // Indica que la detección de manos está activa
  };

  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext("2d");

    const drawLoop = () => {
      if (!canvasRef.current || !videoRef.current) return;

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (!hands || hands.length === 0) {
        requestAnimationFrame(drawLoop);
        return;
      }

      // Dibujar las manos detectadas
      hands.forEach((hand) => {
        if (!hand.keypoints) return;

        // Obtener el color dependiendo de la mano (izquierda o derecha)
        const color = hand.handedness === 'Left' ? 'yellow' : 'magenta';

        // Dibujar los puntos de la mano con el color correspondiente
        hand.keypoints.forEach(({ x, y }) => {
          ctx.fillStyle = color; // Color de los puntos de la mano
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, 2 * Math.PI);
          ctx.fill();
        });
      });

      requestAnimationFrame(drawLoop);
    };

    drawLoop();
  }, [hands]);

  return (
    <div style={{ position: "relative", width: 640, height: 480, marginBottom: "100px" }}>
      <canvas ref={canvasRef} width={640} height={480} />
      {/* Botones y cámara más abajo */}
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
