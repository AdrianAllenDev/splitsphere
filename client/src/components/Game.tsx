import { useEffect, useRef, useState } from "react";
import { soundManager, vibrate } from "@/lib/sound";

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  cooldown?: number; // Timestamp until which the ball cannot merge
  isBlackHole?: boolean;
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ballCount, setBallCount] = useState(1);
  const [maxBallCount, setMaxBallCount] = useState(1);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const gameStartedRef = useRef(false);
  const ballsRef = useRef<Ball[]>([]);
  const animationFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize first ball
  useEffect(() => {
    if (ballsRef.current.length === 0) {
      ballsRef.current.push({
        id: Date.now(),
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        radius: 40,
        color: "#00f0ff", // Cyan
        glowColor: "rgba(0, 240, 255, 0.6)",
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

      const update = () => {
      if (!canvas) return;
      
      const balls = ballsRef.current;
      const BLACK_HOLE_THRESHOLD = 100;

      // Update positions and handle wall collisions
      balls.forEach((ball) => {
          // Black Hole Logic
        if (ball.radius >= BLACK_HOLE_THRESHOLD && !ball.isBlackHole) {
          ball.isBlackHole = true;
          soundManager.playBlackHoleAbsorb();
          vibrate(50);
          // Keep original color for glow, but set main color to black
          // We need to store original color if we want to use it for matching
          // But wait, ball.color is used for matching. 
          // If we change ball.color to black, it won't match same colored balls.
          // So we should keep ball.color as is, but change how it renders.
          // Let's add a renderColor property or just handle it in draw.
          // Actually, let's just keep ball.color as the "type" color, and use it for glow.
          // And in draw, if isBlackHole, draw black core.
          
          ball.vx = 0; // Stop moving
          ball.vy = 0;
          setScore(s => s + 1000); // Bonus for creating a black hole
        }

        if (ball.isBlackHole) {
          // Gravity effect: Pull same-colored balls ONLY
          balls.forEach(other => {
            if (other !== ball && !other.isBlackHole && other.color === ball.color) {
              const dx = ball.x - other.x;
              const dy = ball.y - other.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              // Strong gravity
              if (dist < 500) {
                const force = 2000 / (dist * dist);
                const angle = Math.atan2(dy, dx);
                other.vx += Math.cos(angle) * force;
                other.vy += Math.sin(angle) * force;
              }
            }
          });
        } else {
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Wall collisions
          if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.vx *= -1;
          }
          if (ball.x + ball.radius > canvas.width) {
            ball.x = canvas.width - ball.radius;
            ball.vx *= -1;
          }
          if (ball.y - ball.radius < 0) {
            ball.y = ball.radius;
            ball.vy *= -1;
          }
          if (ball.y + ball.radius > canvas.height) {
            ball.y = canvas.height - ball.radius;
            ball.vy *= -1;
          }
        }
      });

        // Handle ball collisions (Merging & Black Hole Consumption)
      const now = Date.now();
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];

          // Skip if either ball is on cooldown
          if ((b1.cooldown && b1.cooldown > now) || (b2.cooldown && b2.cooldown > now)) {
            continue;
          }
          
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < b1.radius + b2.radius) {
            // Collision detected
            
            // Black Hole Consumption
            if (b1.isBlackHole || b2.isBlackHole) {
               const blackHole = b1.isBlackHole ? b1 : b2;
               const victim = b1.isBlackHole ? b2 : b1;
               
               // Only consume non-black holes AND same color
               if (!victim.isBlackHole && victim.color === blackHole.color) {
                 // Consume!
                 blackHole.radius += victim.radius * 0.2; // Grow slightly
                 setScore(s => s + Math.floor(victim.radius * 10)); // Score based on size
                 soundManager.playBlackHoleAbsorb();
                 
                 // Remove victim
                 if (b1 === victim) {
                   balls.splice(i, 1);
                   i--;
                   break; // b1 is gone, stop checking j
                 } else {
                   balls.splice(j, 1);
                   j--; // b2 is gone, continue checking next j
                 }
               }
               continue;
            }

            if (b1.color === b2.color) {
              // Same color: Merge
              const newRadius = Math.sqrt(b1.radius * b1.radius + b2.radius * b2.radius); 
              
              const mergedBall: Ball = {
                id: Date.now() + Math.random(),
                x: (b1.x + b2.x) / 2,
                y: (b1.y + b2.y) / 2,
                vx: (b1.vx * b1.radius + b2.vx * b2.radius) / (b1.radius + b2.radius), // Momentum conservation
                vy: (b1.vy * b1.radius + b2.vy * b2.radius) / (b1.radius + b2.radius),
                radius: Math.min(b1.radius + b2.radius, 150), // Cap max size (will trigger black hole next frame if > 100)
                color: b1.color, // Keep the same color
                glowColor: b1.glowColor,
              };
              
              setScore(s => s + Math.floor(newRadius * 2)); // Score for merging
              soundManager.playMerge();
              vibrate(20);

              // Remove the two balls and add the merged one
              balls.splice(j, 1);
              balls.splice(i, 1);
              balls.push(mergedBall);
              
              // Adjust index since we modified the array
              i--; 
              break; 
            } else {
              // Different color: Bounce off each other
              // Resolve overlap first to prevent sticking
              const overlap = (b1.radius + b2.radius - distance) / 2;
              const nx = dx / distance;
              const ny = dy / distance;
              
              b1.x -= nx * overlap;
              b1.y -= ny * overlap;
              b2.x += nx * overlap;
              b2.y += ny * overlap;

              // Elastic collision physics
              const normalX = nx;
              const normalY = ny;
              
              // Tangent vector
              const tangentX = -normalY;
              const tangentY = normalX;
              
              // Dot product tangent
              const dpTan1 = b1.vx * tangentX + b1.vy * tangentY;
              const dpTan2 = b2.vx * tangentX + b2.vy * tangentY;
              
              // Dot product normal
              const dpNorm1 = b1.vx * normalX + b1.vy * normalY;
              const dpNorm2 = b2.vx * normalX + b2.vy * normalY;
              
              // Conservation of momentum in 1D
              const m1 = b1.radius; // Mass proportional to radius (simplified)
              const m2 = b2.radius;
              
              const mom1 = (dpNorm1 * (m1 - m2) + 2 * m2 * dpNorm2) / (m1 + m2);
              const mom2 = (dpNorm2 * (m2 - m1) + 2 * m1 * dpNorm1) / (m1 + m2);
              
              // Update velocities
              b1.vx = tangentX * dpTan1 + normalX * mom1;
              b1.vy = tangentY * dpTan1 + normalY * mom1;
              b2.vx = tangentX * dpTan2 + normalX * mom2;
              b2.vy = tangentY * dpTan2 + normalY * mom2;
              
              soundManager.playBounce();
            }
          }
        }
      }
      
      // Remove massive black holes (Explosion logic)
      for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        if (ball.isBlackHole) {
           // Check if there are any other balls of the same color
           const hasSameColorBalls = balls.some(other => other !== ball && other.color === ball.color && !other.isBlackHole);
           
           if (!hasSameColorBalls) {
             // Explode!
             setScore(s => s + 5000);
             balls.splice(i, 1);
             soundManager.playExplosion();
             vibrate(200);
           }
        }
      }

      const activeBalls = balls.filter(b => !b.isBlackHole).length;
      setBallCount(activeBalls);
      setMaxBallCount((prev) => Math.max(prev, activeBalls));

      // Game Over Check
      // Condition: Game has started AND (only 1 active ball left OR 0 active balls left)
      // Note: 0 active balls means only black holes are left, which is also a game over state if you can't spawn more.
      // But user said "if after the first click you go back to one ball".
      if (gameStartedRef.current && activeBalls <= 1) {
        setGameOver(true);
        soundManager.playGameOver();
        vibrate(500);
        cancelAnimationFrame(animationFrameRef.current);
        return; // Stop loop
      }

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw connections (optional cool effect)
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0, 255, 255, 0.1)";
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const dx = balls[i].x - balls[j].x;
          const dy = balls[i].y - balls[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 200) {
            ctx.beginPath();
            ctx.moveTo(balls[i].x, balls[i].y);
            ctx.lineTo(balls[j].x, balls[j].y);
            ctx.stroke();
          }
        }
      }

      balls.forEach((ball) => {
        // Glow
        const gradient = ctx.createRadialGradient(ball.x, ball.y, ball.radius * 0.2, ball.x, ball.y, ball.radius * 1.5);
        gradient.addColorStop(0, ball.color); // Use ball color for glow (even for black holes)
        gradient.addColorStop(1, "transparent");
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Core
        if (ball.isBlackHole) {
          // Black Hole Core
          ctx.fillStyle = "#000"; // Black core
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 0.8, 0, Math.PI * 2); // Larger black core
          ctx.fill();
          
          // White Event Horizon Ring
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 0.8, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Normal Ball Core
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const balls = ballsRef.current;
    let clickedIndex = -1;

    // Check if a ball was clicked (iterate backwards to check top balls first)
    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];
      const dx = clickX - ball.x;
      const dy = clickY - ball.y;
      if (dx * dx + dy * dy <= ball.radius * ball.radius) {
        clickedIndex = i;
        break;
      }
    }

    if (clickedIndex !== -1) {
      const clickedBall = balls[clickedIndex];
      
      // Ignore clicks on Black Holes
      if (clickedBall.isBlackHole) return;

      // Remove clicked ball
      balls.splice(clickedIndex, 1);

      // Create 3 smaller balls
      soundManager.playSplit();
      vibrate(10);
      if (!gameStartedRef.current) {
        setGameStarted(true);
        gameStartedRef.current = true;
      }

      const newRadius = Math.max(clickedBall.radius / 2, 5); // Minimum size limit
      for (let i = 0; i < 3; i++) {
        const angle = (i * 2 * Math.PI) / 3;
        const speed = 5;
        balls.push({
          id: Date.now() + i,
          x: clickedBall.x + Math.cos(angle) * (newRadius * 2.5), // Push them further apart
          y: clickedBall.y + Math.sin(angle) * (newRadius * 2.5),
          vx: Math.cos(angle) * speed + clickedBall.vx,
          vy: Math.sin(angle) * speed + clickedBall.vy,
          radius: newRadius,
          color: i === 0 ? "#00f0ff" : i === 1 ? "#39ff14" : "#ff00ff", // Cyan, Lime, Magenta
          glowColor: "rgba(255, 255, 255, 0.5)",
          cooldown: Date.now() + 500, // 500ms cooldown before they can merge again
        });
      }
      
      setScore(s => s + 50); // Score for splitting
      setBallCount(balls.length);
      setMaxBallCount((prev) => Math.max(prev, balls.length));
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col">
      {/* HUD / Scoreboard */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
        <div className="bg-black/50 backdrop-blur-md border border-primary/30 p-4 rounded-lg neon-border">
          <h2 className="text-primary text-sm uppercase tracking-widest mb-1">Current Balls</h2>
          <p className="text-4xl font-bold text-white neon-text">{ballCount}</p>
        </div>
        
        <div className="text-center">
           <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent animate-pulse tracking-tighter" style={{ textShadow: '0 0 20px rgba(0,240,255,0.5)' }}>
            SPLIT SPHERE
          </h1>
          <p className="text-xs text-muted-foreground tracking-[0.5em] mt-2 uppercase">Neon Arcade Physics</p>
        </div>

        <div className="bg-black/50 backdrop-blur-md border border-secondary/30 p-4 rounded-lg neon-border text-right">
          <h2 className="text-secondary text-sm uppercase tracking-widest mb-1">Score</h2>
          <p className="text-4xl font-bold text-white neon-text">{score}</p>
          <p className="text-xs text-muted-foreground mt-1">Max Balls: {maxBallCount}</p>
        </div>
      </div>

      {/* Game Canvas */}
      <div ref={containerRef} className="flex-1 w-full h-full">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="block cursor-crosshair"
        />
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-8 w-full text-center pointer-events-none">
        <p className="text-white/50 text-sm uppercase tracking-widest animate-pulse">
          Click a ball to split • Collide to merge
        </p>
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center p-8 border-4 border-red-500 rounded-2xl shadow-[0_0_50px_rgba(255,0,0,0.5)] bg-black">
            <h2 className="text-6xl font-black text-red-500 mb-4 font-['Orbitron'] tracking-tighter drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">GAME OVER</h2>
            <div className="text-2xl text-white mb-8 font-mono">FINAL SCORE: <span className="text-cyan-400">{score}</span></div>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xl transition-all shadow-[0_0_20px_rgba(255,0,0,0.6)] hover:shadow-[0_0_40px_rgba(255,0,0,0.8)] hover:scale-105 active:scale-95"
            >
              RETRY SYSTEM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
