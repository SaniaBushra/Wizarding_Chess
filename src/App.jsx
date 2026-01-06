import React, { useState, useEffect } from "react";

const initialBoard = () => {
  const empty = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  const pieces = {
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    p: "♟︎",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
    P: "♙",
  };

  const board = empty.map((row) => [...row]);
  const backRankWhite = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  const backRankBlack = ["r", "n", "b", "q", "k", "b", "n", "r"];

  board[0] = backRankWhite; // White at top
  board[1] = Array(8).fill("P");
  board[6] = Array(8).fill("p");
  board[7] = backRankBlack; // Black at bottom (player)

  return { board, pieces };
};

export default function App() {
  const data = initialBoard();
  const [board, setBoard] = useState(data.board);
  const [pieces] = useState(data.pieces);
  const [selected, setSelected] = useState(null);
  const [turn, setTurn] = useState("black"); // Player starts
  const [captureAnimation, setCaptureAnimation] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [showIntro, setShowIntro] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(null);
  const [showPromotion, setShowPromotion] = useState(null);
  const [inCheck, setInCheck] = useState({ white: false, black: false });

  // Track special pieces by their current positions
  const [specialPiecesPos, setSpecialPiecesPos] = useState({
    ron: { r: 7, c: 1 }, // Left knight
    harry: { r: 7, c: 2 }, // Left bishop
    hermione: { r: 7, c: 3 }, // Queen
  });

  const captureVideos = {
    P: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    p: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    N: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    n: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    B: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    b: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    R: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    r: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    Q: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    q: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    K: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
    k: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    default:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  };

  const getVideoUrl = (attacker) => {
    return captureVideos[attacker] || captureVideos.default;
  };

  const isWhite = (p) => p && p === p.toUpperCase();
  const isBlack = (p) => p && p === p.toLowerCase();

  const findKing = (currentBoard, color) => {
    const kingPiece = color === "white" ? "K" : "k";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (currentBoard[r][c] === kingPiece) {
          return { r, c };
        }
      }
    }
    return null;
  };

  const isSquareUnderAttack = (currentBoard, r, c, byColor) => {
    // Check if square (r,c) is under attack by pieces of byColor
    for (let fromR = 0; fromR < 8; fromR++) {
      for (let fromC = 0; fromC < 8; fromC++) {
        const piece = currentBoard[fromR][fromC];
        if (!piece) continue;

        if (
          (byColor === "white" && isWhite(piece)) ||
          (byColor === "black" && isBlack(piece))
        ) {
          if (
            isValidMoveIgnoreCheck(
              currentBoard,
              fromR,
              fromC,
              r,
              c,
              piece,
              currentBoard[r][c]
            )
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const isInCheck = (currentBoard, color) => {
    const king = findKing(currentBoard, color);
    if (!king) return false;

    const enemyColor = color === "white" ? "black" : "white";
    return isSquareUnderAttack(currentBoard, king.r, king.c, enemyColor);
  };

  const wouldBeInCheck = (fromR, fromC, toR, toC, piece) => {
    // Simulate the move
    const testBoard = board.map((row) => [...row]);
    testBoard[fromR][fromC] = null;
    testBoard[toR][toC] = piece;

    const color = isWhite(piece) ? "white" : "black";
    return isInCheck(testBoard, color);
  };

  const isCheckmate = (currentBoard, color) => {
    // First check if king is in check
    if (!isInCheck(currentBoard, color)) return false;

    // Try all possible moves for this color
    for (let fromR = 0; fromR < 8; fromR++) {
      for (let fromC = 0; fromC < 8; fromC++) {
        const piece = currentBoard[fromR][fromC];
        if (!piece) continue;
        if (
          (color === "white" && !isWhite(piece)) ||
          (color === "black" && !isBlack(piece))
        )
          continue;

        for (let toR = 0; toR < 8; toR++) {
          for (let toC = 0; toC < 8; toC++) {
            const target = currentBoard[toR][toC];
            if (
              isValidMoveIgnoreCheck(
                currentBoard,
                fromR,
                fromC,
                toR,
                toC,
                piece,
                target
              )
            ) {
              // Simulate this move
              const testBoard = currentBoard.map((row) => [...row]);
              testBoard[fromR][fromC] = null;
              testBoard[toR][toC] = piece;

              // If this move gets us out of check, it's not checkmate
              if (!isInCheck(testBoard, color)) {
                return false;
              }
            }
          }
        }
      }
    }

    return true; // No moves can get out of check = checkmate
  };

  const isStalemate = (currentBoard, color) => {
    // Stalemate: king is NOT in check, but no legal moves available
    if (isInCheck(currentBoard, color)) return false;

    // Try all possible moves for this color
    for (let fromR = 0; fromR < 8; fromR++) {
      for (let fromC = 0; fromC < 8; fromC++) {
        const piece = currentBoard[fromR][fromC];
        if (!piece) continue;
        if (
          (color === "white" && !isWhite(piece)) ||
          (color === "black" && !isBlack(piece))
        )
          continue;

        for (let toR = 0; toR < 8; toR++) {
          for (let toC = 0; toC < 8; toC++) {
            const target = currentBoard[toR][toC];
            if (
              isValidMoveIgnoreCheck(
                currentBoard,
                fromR,
                fromC,
                toR,
                toC,
                piece,
                target
              )
            ) {
              // Simulate this move
              const testBoard = currentBoard.map((row) => [...row]);
              testBoard[fromR][fromC] = null;
              testBoard[toR][toC] = piece;

              // If this is a legal move (doesn't leave king in check), not stalemate
              if (!isInCheck(testBoard, color)) {
                return false;
              }
            }
          }
        }
      }
    }

    return true; // No legal moves available but not in check = stalemate
  };

  const isValidMoveIgnoreCheck = (
    currentBoard,
    fromR,
    fromC,
    toR,
    toC,
    piece,
    targetPiece
  ) => {
    // Can't capture your own piece
    if (
      targetPiece &&
      ((isWhite(piece) && isWhite(targetPiece)) ||
        (isBlack(piece) && isBlack(targetPiece)))
    ) {
      return false;
    }

    // Can't capture the king
    if (targetPiece && targetPiece.toLowerCase() === "k") {
      return false;
    }

    const rowDiff = Math.abs(toR - fromR);
    const colDiff = Math.abs(toC - fromC);
    const pieceType = piece.toLowerCase();

    // Pawn movement
    if (pieceType === "p") {
      const direction = isWhite(piece) ? 1 : -1;
      const startRow = isWhite(piece) ? 1 : 6;

      if (fromC === toC && !targetPiece) {
        if (toR === fromR + direction) return true;
        if (
          fromR === startRow &&
          toR === fromR + 2 * direction &&
          !currentBoard[fromR + direction][fromC]
        )
          return true;
      }
      if (colDiff === 1 && toR === fromR + direction && targetPiece)
        return true;
      return false;
    }

    if (pieceType === "r") {
      if (fromR !== toR && fromC !== toC) return false;
      return isPathClearForBoard(currentBoard, fromR, fromC, toR, toC);
    }

    if (pieceType === "n") {
      return (
        (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)
      );
    }

    if (pieceType === "b") {
      if (rowDiff !== colDiff) return false;
      return isPathClearForBoard(currentBoard, fromR, fromC, toR, toC);
    }

    if (pieceType === "q") {
      if (fromR === toR || fromC === toC || rowDiff === colDiff) {
        return isPathClearForBoard(currentBoard, fromR, fromC, toR, toC);
      }
      return false;
    }

    if (pieceType === "k") {
      return rowDiff <= 1 && colDiff <= 1;
    }

    return false;
  };

  const isValidMove = (fromR, fromC, toR, toC, piece, targetPiece) => {
    if (
      !isValidMoveIgnoreCheck(board, fromR, fromC, toR, toC, piece, targetPiece)
    ) {
      return false;
    }

    // Check if this move would leave/put own king in check
    if (wouldBeInCheck(fromR, fromC, toR, toC, piece)) {
      return false;
    }

    return true;
  };

  const isPathClearForBoard = (currentBoard, fromR, fromC, toR, toC) => {
    const rowDir = toR > fromR ? 1 : toR < fromR ? -1 : 0;
    const colDir = toC > fromC ? 1 : toC < fromC ? -1 : 0;

    let currentR = fromR + rowDir;
    let currentC = fromC + colDir;

    while (currentR !== toR || currentC !== toC) {
      if (currentBoard[currentR][currentC] !== null) return false;
      currentR += rowDir;
      currentC += colDir;
    }
    return true;
  };

  const checkSpecialPieceCaptured = (toR, toC) => {
    // Check if the position being captured is Ron's position
    if (specialPiecesPos.ron.r === toR && specialPiecesPos.ron.c === toC) {
      setGameOver({
        character: "Ron",
        message: "Ron has been captured! Voldemort wins!",
      });
      return true;
    }
    // Check if the position being captured is Harry's position
    if (specialPiecesPos.harry.r === toR && specialPiecesPos.harry.c === toC) {
      setGameOver({
        character: "Harry",
        message: "Harry has been captured! Voldemort wins!",
      });
      return true;
    }
    // Check if the position being captured is Hermione's position
    if (
      specialPiecesPos.hermione.r === toR &&
      specialPiecesPos.hermione.c === toC
    ) {
      setGameOver({
        character: "Hermione",
        message: "Hermione has been captured! Voldemort wins!",
      });
      return true;
    }
    return false;
  };

  const playVideo = async (attackerPiece) => {
    const videoUrl = getVideoUrl(attackerPiece);

    setCaptureAnimation({
      attacker: attackerPiece,
      videoUrl: videoUrl,
      timestamp: Date.now(),
    });
  };

  const makeComputerMove = (currentBoard) => {
    const whitePieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (currentBoard[r][c] && isWhite(currentBoard[r][c])) {
          whitePieces.push({ r, c, piece: currentBoard[r][c] });
        }
      }
    }

    if (whitePieces.length === 0) return;

    const possibleMoves = [];
    whitePieces.forEach((wp) => {
      for (let tr = 0; tr < 8; tr++) {
        for (let tc = 0; tc < 8; tc++) {
          const target = currentBoard[tr][tc];
          if (
            (!target || isBlack(target)) &&
            target?.toLowerCase() !== "k" &&
            isValidMoveIgnoreCheck(
              currentBoard,
              wp.r,
              wp.c,
              tr,
              tc,
              wp.piece,
              target
            )
          ) {
            // Check if this move would leave white king in check
            const testBoard = currentBoard.map((row) => [...row]);
            testBoard[wp.r][wp.c] = null;
            testBoard[tr][tc] = wp.piece;
            if (!isInCheck(testBoard, "white")) {
              possibleMoves.push({
                from: wp,
                to: { r: tr, c: tc },
                captured: target,
              });
            }
          }
        }
      }
    });

    if (possibleMoves.length === 0) return;

    const move =
      possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    setTimeout(async () => {
      if (move.captured) {
        // Check if special piece is captured
        if (checkSpecialPieceCaptured(move.to.r, move.to.c)) {
          const newBoard = currentBoard.map((row) => [...row]);
          newBoard[move.from.r][move.from.c] = null;
          newBoard[move.to.r][move.to.c] = move.from.piece;
          setBoard(newBoard);
          return;
        }

        await playVideo(move.from.piece);
      }

      const newBoard = currentBoard.map((row) => [...row]);
      newBoard[move.from.r][move.from.c] = null;
      newBoard[move.to.r][move.to.c] = move.from.piece;

      // Auto-promote white pawn to queen
      if (move.from.piece === "P" && move.to.r === 7) {
        newBoard[move.to.r][move.to.c] = "Q";
      }

      setBoard(newBoard);

      // Update check status
      const blackInCheck = isInCheck(newBoard, "black");
      const whiteInCheck = isInCheck(newBoard, "white");
      setInCheck({ white: whiteInCheck, black: blackInCheck });

      // Check if black is in checkmate or stalemate
      if (isCheckmate(newBoard, "black")) {
        setGameOver({
          character: "Voldemort",
          message: "Checkmate! Voldemort wins!",
          type: "checkmate",
        });
        return;
      }

      if (isStalemate(newBoard, "black")) {
        setGameOver({
          character: "Draw",
          message: "Stalemate! The game is a draw.",
          type: "stalemate",
        });
        return;
      }

      setTurn("black");
    }, 1000);
  };

  useEffect(() => {
    if (turn === "white" && gameStarted && !gameOver) {
      makeComputerMove(board);
    }
  }, [turn, gameStarted, gameOver]);

  const handleClick = async (r, c) => {
    if (!gameStarted || turn !== "black" || gameOver) return;

    const piece = board[r][c];

    if (!selected) {
      if (!piece || !isBlack(piece)) return;
      setSelected({ r, c, piece });
      return;
    }

    if (selected.r === r && selected.c === c) {
      setSelected(null);
      return;
    }

    if (piece && isBlack(piece)) {
      setSelected({ r, c, piece });
      return;
    }

    // Check if move is valid according to chess rules
    if (!isValidMove(selected.r, selected.c, r, c, selected.piece, piece)) {
      return; // Invalid move, do nothing
    }

    const isCapture = piece !== null;

    if (isCapture) {
      await playVideo(selected.piece);
    }

    // Check if pawn promotion
    if (selected.piece === "p" && r === 0) {
      // Show promotion dialog
      setShowPromotion({
        row: r,
        col: c,
        from: { r: selected.r, c: selected.c },
      });
      return;
    }

    // Update special piece positions when they move
    const newSpecialPos = { ...specialPiecesPos };
    if (
      selected.r === specialPiecesPos.ron.r &&
      selected.c === specialPiecesPos.ron.c
    ) {
      newSpecialPos.ron = { r, c };
    }
    if (
      selected.r === specialPiecesPos.harry.r &&
      selected.c === specialPiecesPos.harry.c
    ) {
      newSpecialPos.harry = { r, c };
    }
    if (
      selected.r === specialPiecesPos.hermione.r &&
      selected.c === specialPiecesPos.hermione.c
    ) {
      newSpecialPos.hermione = { r, c };
    }
    setSpecialPiecesPos(newSpecialPos);

    const newBoard = board.map((row) => [...row]);
    newBoard[selected.r][selected.c] = null;
    newBoard[r][c] = selected.piece;

    const move = {
      from: { r: selected.r, c: selected.c },
      to: { r, c },
      piece: selected.piece,
      captured: piece,
      turn: turn,
    };
    setMoveHistory([...moveHistory, move]);

    setBoard(newBoard);
    setSelected(null);
    setTurn("white");

    // Update check status
    const blackInCheck = isInCheck(newBoard, "black");
    const whiteInCheck = isInCheck(newBoard, "white");
    setInCheck({ white: whiteInCheck, black: blackInCheck });

    // Check if white is in checkmate or stalemate
    if (isCheckmate(newBoard, "white")) {
      setGameOver({
        character: "You",
        message: "Checkmate! You win!",
        type: "checkmate",
      });
      return;
    }

    if (isStalemate(newBoard, "white")) {
      setGameOver({
        character: "Draw",
        message: "Stalemate! The game is a draw.",
        type: "stalemate",
      });
      return;
    }
  };

  const getCharacterLabel = (r, c) => {
    if (specialPiecesPos.ron.r === r && specialPiecesPos.ron.c === c)
      return "Ron";
    if (specialPiecesPos.harry.r === r && specialPiecesPos.harry.c === c)
      return "Harry";
    if (specialPiecesPos.hermione.r === r && specialPiecesPos.hermione.c === c)
      return "Hermione";
    return null;
  };

  const handlePromotion = (promoteTo) => {
    const { row, col, from } = showPromotion;

    // Update special piece positions when they move
    const newSpecialPos = { ...specialPiecesPos };
    if (
      from.r === specialPiecesPos.ron.r &&
      from.c === specialPiecesPos.ron.c
    ) {
      newSpecialPos.ron = { r: row, c: col };
    }
    if (
      from.r === specialPiecesPos.harry.r &&
      from.c === specialPiecesPos.harry.c
    ) {
      newSpecialPos.harry = { r: row, c: col };
    }
    if (
      from.r === specialPiecesPos.hermione.r &&
      from.c === specialPiecesPos.hermione.c
    ) {
      newSpecialPos.hermione = { r: row, c: col };
    }
    setSpecialPiecesPos(newSpecialPos);

    const newBoard = board.map((row) => [...row]);
    newBoard[from.r][from.c] = null;
    newBoard[row][col] = promoteTo;

    const move = {
      from: from,
      to: { r: row, c: col },
      piece: promoteTo,
      captured: board[row][col],
      turn: turn,
    };
    setMoveHistory([...moveHistory, move]);

    setBoard(newBoard);
    setSelected(null);
    setShowPromotion(null);
    setTurn("white");

    // Update check status
    const blackInCheck = isInCheck(newBoard, "black");
    const whiteInCheck = isInCheck(newBoard, "white");
    setInCheck({ white: whiteInCheck, black: blackInCheck });

    // Check if white is in checkmate or stalemate
    if (isCheckmate(newBoard, "white")) {
      setGameOver({
        character: "You",
        message: "Checkmate! You win!",
        type: "checkmate",
      });
      return;
    }

    if (isStalemate(newBoard, "white")) {
      setGameOver({
        character: "Draw",
        message: "Stalemate! The game is a draw.",
        type: "stalemate",
      });
      return;
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "'Cinzel', serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      {showIntro && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.98)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            animation: "fadeIn 0.5s",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "40px",
              fontSize: "48px",
              fontWeight: "bold",
              color: "white",
              textShadow: "0 0 20px rgba(255,255,255,0.5)",
              letterSpacing: "4px",
            }}
          >
            ⚡ WIZARD CHESS ⚡
          </div>

          <iframe
            width="800"
            height="450"
            src="https://www.youtube.com/embed/tgBgHWyA4ZY?autoplay=1&start=0"
            title="Chess Intro"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              borderRadius: "15px",
              boxShadow: "0 10px 50px rgba(0,0,0,0.8)",
            }}
          />

          <button
            onClick={() => {
              setShowIntro(false);
              setGameStarted(true);
            }}
            style={{
              position: "absolute",
              bottom: "50px",
              padding: "18px 50px",
              fontSize: "24px",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)",
              color: "white",
              border: "none",
              borderRadius: "30px",
              cursor: "pointer",
              boxShadow: "0 5px 20px rgba(196, 30, 58, 0.5)",
              transition: "all 0.3s",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.1) translateY(-2px)";
              e.target.style.boxShadow = "0 8px 30px rgba(196, 30, 58, 0.7)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1) translateY(0)";
              e.target.style.boxShadow = "0 5px 20px rgba(196, 30, 58, 0.5)";
            }}
          >
            ⚔️ Start Battle ⚔️
          </button>

          <button
            onClick={() => {
              setShowIntro(false);
              setGameStarted(true);
            }}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              padding: "10px 20px",
              fontSize: "14px",
              background: "rgba(255, 255, 255, 0.1)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "20px",
              cursor: "pointer",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.1)";
            }}
          >
            Skip Intro ⏭
          </button>
        </div>
      )}

      {gameOver && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            animation: "fadeIn 0.5s",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              color:
                gameOver.type === "stalemate"
                  ? "#FFA500"
                  : gameOver.character === "You"
                  ? "#4CAF50"
                  : "#ff4444",
              fontWeight: "bold",
              marginBottom: "30px",
              textShadow:
                gameOver.type === "stalemate"
                  ? "0 0 30px rgba(255, 165, 0, 0.8)"
                  : gameOver.character === "You"
                  ? "0 0 30px rgba(76, 175, 80, 0.8)"
                  : "0 0 30px rgba(255, 68, 68, 0.8)",
            }}
          >
            {gameOver.type === "stalemate"
              ? "DRAW"
              : gameOver.character === "You"
              ? "VICTORY!"
              : "GAME OVER"}
          </div>
          <div
            style={{
              fontSize: "36px",
              color: "#fff",
              marginBottom: "20px",
            }}
          >
            {gameOver.message}
          </div>
          <div
            style={{
              fontSize: "48px",
              marginBottom: "40px",
            }}
          >
            {gameOver.type === "stalemate"
              ? "🤝"
              : gameOver.character === "You"
              ? "⚡👑⚡"
              : "💀"}
          </div>
          <button
            onClick={() => {
              const data = initialBoard();
              setBoard(data.board);
              setTurn("black");
              setGameOver(null);
              setMoveHistory([]);
              setSelected(null);
              setSpecialPiecesPos({
                ron: { r: 7, c: 1 },
                harry: { r: 7, c: 2 },
                hermione: { r: 7, c: 3 },
              });
              setInCheck({ white: false, black: false });
            }}
            style={{
              padding: "18px 50px",
              fontSize: "24px",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)",
              color: "white",
              border: "none",
              borderRadius: "30px",
              cursor: "pointer",
              boxShadow: "0 5px 20px rgba(196, 30, 58, 0.5)",
              transition: "all 0.3s",
            }}
          >
            Play Again
          </button>
        </div>
      )}

      {showPromotion && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 3000,
            animation: "fadeIn 0.3s",
          }}
        >
          <div
            style={{
              fontSize: "36px",
              color: "#ffd700",
              fontWeight: "bold",
              marginBottom: "40px",
              textShadow: "0 0 20px rgba(255, 215, 0, 0.8)",
            }}
          >
            ⚡ Choose Promotion ⚡
          </div>
          <div
            style={{
              display: "flex",
              gap: "30px",
            }}
          >
            {[
              { piece: "q", name: "Queen", icon: pieces.q },
              { piece: "r", name: "Rook", icon: pieces.r },
              { piece: "b", name: "Bishop", icon: pieces.b },
              { piece: "n", name: "Knight", icon: pieces.n },
            ].map((option) => (
              <button
                key={option.piece}
                onClick={() => handlePromotion(option.piece)}
                style={{
                  width: "120px",
                  height: "140px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  background:
                    "linear-gradient(135deg, #2d5f3f 0%, #1a472a 100%)",
                  border: "3px solid #ffd700",
                  borderRadius: "15px",
                  cursor: "pointer",
                  fontSize: "64px",
                  color: "#fff",
                  transition: "all 0.3s",
                  boxShadow: "0 5px 20px rgba(0,0,0,0.5)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "scale(1.1) translateY(-5px)";
                  e.target.style.boxShadow =
                    "0 10px 30px rgba(255, 215, 0, 0.5)";
                  e.target.style.background =
                    "linear-gradient(135deg, #3d7f5f 0%, #2a573a 100%)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "scale(1) translateY(0)";
                  e.target.style.boxShadow = "0 5px 20px rgba(0,0,0,0.5)";
                  e.target.style.background =
                    "linear-gradient(135deg, #2d5f3f 0%, #1a472a 100%)";
                }}
              >
                <div>{option.icon}</div>
                <div
                  style={{
                    fontSize: "14px",
                    marginTop: "10px",
                    fontWeight: "bold",
                  }}
                >
                  {option.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {captureAnimation && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            animation: "fadeIn 0.3s",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "20px",
              background: "rgba(196, 30, 58, 0.2)",
              padding: "15px 30px",
              borderRadius: "10px",
              backdropFilter: "blur(10px)",
              border: "2px solid rgba(196, 30, 58, 0.5)",
            }}
          >
            <div
              style={{
                fontSize: "32px",
                color: "#ff4444",
                fontWeight: "bold",
              }}
            >
              ⚔️ CAPTURE! ⚔️
            </div>
          </div>

          <video
            autoPlay
            onEnded={() => setCaptureAnimation(null)}
            style={{
              width: "80%",
              maxWidth: "800px",
              maxHeight: "70vh",
              borderRadius: "15px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
            src={captureAnimation.videoUrl}
          />

          <button
            onClick={() => setCaptureAnimation(null)}
            style={{
              position: "absolute",
              bottom: "30px",
              padding: "12px 30px",
              fontSize: "16px",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "25px",
              cursor: "pointer",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.3)";
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
              e.target.style.transform = "scale(1)";
            }}
          >
            Skip Animation ⏭
          </button>
        </div>
      )}

      <h1
        style={{
          fontSize: "48px",
          margin: "20px 0",
          textShadow: "0 0 20px rgba(255,255,255,0.3)",
          letterSpacing: "3px",
        }}
      >
        ⚡ WIZARD CHESS ⚡
      </h1>

      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          padding: "15px 30px",
          background:
            turn === "white"
              ? "linear-gradient(135deg, #8b0000 0%, #c41e3a 100%)"
              : "linear-gradient(135deg, #1a472a 0%, #2d5f3f 100%)",
          color: "#fff",
          borderRadius: "12px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
          border: "2px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "5px",
        }}
      >
        <div>{turn === "white" ? "🐍 Voldemort's Turn" : "⚡ Your Turn"}</div>
        {inCheck.white && turn === "white" && (
          <div
            style={{
              fontSize: "18px",
              color: "#ffeb3b",
              textShadow: "0 0 10px rgba(255, 235, 59, 0.8)",
            }}
          >
            ⚠️ WHITE KING IN CHECK! ⚠️
          </div>
        )}
        {inCheck.black && turn === "black" && (
          <div
            style={{
              fontSize: "18px",
              color: "#ffeb3b",
              textShadow: "0 0 10px rgba(255, 235, 59, 0.8)",
            }}
          >
            ⚠️ YOUR KING IN CHECK! ⚠️
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 80px)",
          gridTemplateRows: "repeat(8, 80px)",
          border: "6px solid #8B4513",
          boxShadow:
            "0 10px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5)",
          background: "#2c1810",
          borderRadius: "10px",
          padding: "10px",
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selected && selected.r === r && selected.c === c;
            const charLabel = getCharacterLabel(r, c);
            const isWhiteKing = cell === "K";
            const isBlackKing = cell === "k";
            const kingInCheck =
              (isWhiteKing && inCheck.white) || (isBlackKing && inCheck.black);

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                style={{
                  width: "80px",
                  height: "80px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "52px",
                  cursor: turn === "black" && !gameOver ? "pointer" : "default",
                  background: kingInCheck
                    ? "radial-gradient(circle, #ff4444 0%, #ff6666 100%)"
                    : isSelected
                    ? "radial-gradient(circle, #ffd700 0%, #ffed4e 100%)"
                    : isDark
                    ? "linear-gradient(135deg, #3d2817 0%, #5c4033 100%)"
                    : "linear-gradient(135deg, #d4a574 0%, #e8c39e 100%)",
                  userSelect: "none",
                  transition: "all 0.3s",
                  border: kingInCheck
                    ? "3px solid #ff0000"
                    : isSelected
                    ? "3px solid #ffd700"
                    : "1px solid rgba(0,0,0,0.2)",
                  boxShadow: kingInCheck
                    ? "0 0 30px rgba(255, 68, 68, 0.9), inset 0 0 20px rgba(255, 68, 68, 0.5)"
                    : isSelected
                    ? "0 0 20px rgba(255, 215, 0, 0.6), inset 0 0 10px rgba(255, 215, 0, 0.3)"
                    : "inset 0 2px 4px rgba(0,0,0,0.2)",
                  position: "relative",
                  color: cell && isWhite(cell) ? "#1a4d2e" : "#fff",
                  textShadow:
                    cell && isWhite(cell)
                      ? "0 0 8px rgba(26, 77, 46, 0.8)"
                      : "none",
                  animation: kingInCheck ? "pulseCheck 1s infinite" : "none",
                }}
                onMouseEnter={(e) => {
                  if (turn === "black" && !gameOver) {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow =
                      "0 5px 15px rgba(0,0,0,0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = isSelected
                    ? "0 0 20px rgba(255, 215, 0, 0.6)"
                    : "inset 0 2px 4px rgba(0,0,0,0.2)";
                }}
              >
                {cell ? pieces[cell] : ""}
                {charLabel && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "2px",
                      fontSize: "10px",
                      fontWeight: "bold",
                      color: "#ffd700",
                      textShadow: "0 0 5px rgba(0,0,0,0.8)",
                      background: "rgba(0,0,0,0.6)",
                      padding: "2px 4px",
                      borderRadius: "3px",
                    }}
                  >
                    {charLabel}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          maxWidth: "640px",
          width: "100%",
          background: "rgba(30, 30, 30, 0.8)",
          padding: "20px",
          borderRadius: "12px",
          maxHeight: "200px",
          overflowY: "auto",
          border: "2px solid rgba(255,255,255,0.1)",
          boxShadow: "0 5px 20px rgba(0,0,0,0.5)",
        }}
      >
        <h3 style={{ marginTop: 0, color: "#ffd700" }}>📜 Battle Chronicle</h3>
        {moveHistory.length === 0 ? (
          <p style={{ color: "#999" }}>No moves yet...</p>
        ) : (
          <div style={{ fontSize: "14px" }}>
            {moveHistory.map((move, idx) => (
              <div
                key={idx}
                style={{
                  padding: "8px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              >
                <strong>Move {idx + 1}</strong> (
                {move.turn === "white" ? "Voldemort" : "You"}):{" "}
                {pieces[move.piece]} → ({move.to.r}, {move.to.c})
                {move.captured && (
                  <span style={{ color: "#ff4444" }}>
                    {" "}
                    ⚔️ Captured {pieces[move.captured]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulseCheck {
          0%, 100% { 
            box-shadow: 0 0 30px rgba(255, 68, 68, 0.9), inset 0 0 20px rgba(255, 68, 68, 0.5);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 50px rgba(255, 68, 68, 1), inset 0 0 30px rgba(255, 68, 68, 0.7);
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}