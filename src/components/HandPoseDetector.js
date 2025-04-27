import React, { useRef, forwardRef, useImperativeHandle, useEffect, useState, useCallback } from "react";

const HandPoseDetector = forwardRef(({ onHandMove, onHandClick, onGesture, useCameraBackground }, ref) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [hands, setHands] = useState([]);
  const handposeRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const streamRef = useRef(null); // Nueva referencia para el stream
  

  const WIDTH = 640;
  const HEIGHT = 480;

  const detectGestures = useCallback((hands) => {
    if (!hands || hands.length === 0 || !onGesture) return;

    hands.forEach((hand) => {
      if (!hand.keypoints) return;

      const thumbTip = hand.keypoints[4];
      const indexTip = hand.keypoints[8];
      
      if (thumbTip && indexTip) {
        const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        if (distance < 30) {
          const centerX = (thumbTip.x + indexTip.x) / 2;
          const centerY = (thumbTip.y + indexTip.y) / 2;
          onGesture('pinch', { x: centerX, y: centerY });
        }
      }
    });
  }, [onGesture]);

  const gotHands = useCallback((results) => {
    if (!results) return;
    setHands(results);
    detectGestures(results);
  }, [detectGestures]);

  

  const startHandPoseDetection = useCallback(() => {
    if (!videoRef.current || handposeRef.current) return;

    if (handposeRef.current) {
      try {
        handposeRef.current.detectStop();
      } catch (e) {
        console.warn("Error al detener detección previa:", e);
      }
      handposeRef.current = null;
    }


    handposeRef.current = window.ml5.handPose(
      videoRef.current, 
      { 
        flipHorizontal: true,  // Esto es importante
        maxContinuousChecks: Infinity,
        detectionConfidence: 0.8,
        scoreThreshold: 0.75
      },
      () => {
        setModelLoaded(true);
        handposeRef.current.detectStart(videoRef.current, gotHands);
      }
    );
  }, [gotHands]);


  useImperativeHandle(ref, () => ({
    startDetection: async () => {
      try {
                // Detener stream anterior si existe
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                }
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: "user" 
          } 
        });
        
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await new Promise((resolve) => {
            video.onloadedmetadata = () => {
              video.play().then(resolve).catch(console.error);
            };
          });
          
          startHandPoseDetection();
          return stream;
        }
      } catch (error) {
        console.error("Error al acceder a la cámara:", error);
      }
      return null;
    },
    restartHandPose: () => {
      if (videoRef.current?.srcObject) {
        startHandPoseDetection();
      }
    },
    stopDetection: () => {
      console.log("Deteniendo detección...");
      if (handposeRef.current) {
        // Usamos detectStop en lugar de off
        handposeRef.current.detectStop();
      }
      videoRef.current?.srcObject?.getTracks().forEach(track => track.stop());
      cancelAnimationFrame(animationFrameIdRef.current);
      setModelLoaded(false);
    },
    getVideoElement: () => videoRef.current,
    getHands: () => hands,
    isModelLoaded: () => modelLoaded
  }));

  useEffect(() => {
    return () => {
      console.log("Componente desmontado - limpieza");
      if (handposeRef.current) {
        handposeRef.current.detectStop();
      }
      videoRef.current?.srcObject?.getTracks().forEach(track => track.stop());
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, []);

  return (
    <div style={{ 
      position: "absolute", 
      top: 0, 
      left: 0, 
      pointerEvents: "none",
      zIndex: 300,
      width: WIDTH,
      height: HEIGHT,
      overflow: 'hidden'
    }}>
      <video 
        ref={videoRef} 
        width="640"
        height="480"
        style={{ display: 'none' }}
        playsInline
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 11  ,
          backgroundColor: 'transparent',
    
        }}
      />
    </div>
  );
});

export default HandPoseDetector;