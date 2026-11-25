/**
   * ============================================================================
   * ULTIMATE GAME CENTER — CHECKERS, CHESS (chess.js), TETRIS (Canvas), AUDIO & DB
   * ============================================================================
   */

  // ---------- SOUND ENGINE (Web Audio API) ----------
  const AudioFX = {
    ctx: null,
    enabled: true,
    volume: 0.6,
    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone(freq, duration = 0.09, type = 'sine', slideTo = null) {
      if (!this.enabled || this.volume <= 0.01) return;
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
      gain.gain.setValueAtTime(this.volume * 0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration + 0.01);
    },
    click() { this.tone(680, 0.06, 'sine', 960); },
    checkerMove() { this.tone(320, 0.08, 'triangle', 190); },
    chessMove() { this.tone(440, 0.09, 'sine', 260); },
    tetrisDrop() { this.tone(180, 0.08, 'square', 90); },
    lineClear() {
      this.tone(523, 0.09, 'triangle');
      setTimeout(() => this.tone(784, 0.14, 'triangle'), 80);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        setTimeout(() => this.tone(f, 0.18, 'triangle'), idx * 110);
      });
    }
  };

  // ---------- STATE & LOCAL STORAGE ----------
  const GC_STORAGE_KEY = 'ULTIMATE_GAME_CENTER_DB_V1';

  const DEFAULT_GC_DATA = {
    profile: {
      username: "PlayerOne",
      avatar: "😎",
      totalScore: 1250,
      played: 12,
      wins: 8,
      losses: 4,
      bestScore: 2400,
      achievements: ["First Victory", "Checkers Tactician", "Tetris Pro"]
    },
    leaderboard: [
      { username: "CyberGrandmaster", avatar: "👑", score: 4850, wins: 34 },
      { username: "NeonKnight", avatar: "🐉", score: 3920, wins: 27 },
      { username: "PixelVortex", avatar: "🚀", score: 3180, wins: 22 },
      { username: "PlayerOne", avatar: "😎", score: 1250, wins: 8 },
      { username: "NovaDrifter", avatar: "👾", score: 980, wins: 6 }
    ],
    settings: {
      theme: "dark",
      sound: true,
      volume: 0.6,
      animations: true,
      lang: "uz",
      speed: "normal"
    }
  };

  function loadGCData() {
    try {
      const raw = localStorage.getItem(GC_STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_GC_DATA);
      const p = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_GC_DATA),
        ...p,
        profile: { ...structuredClone(DEFAULT_GC_DATA.profile), ...(p.profile || {}) },
        settings: { ...structuredClone(DEFAULT_GC_DATA.settings), ...(p.settings || {}) }
      };
    } catch (e) {
      return structuredClone(DEFAULT_GC_DATA);
    }
  }

  let GCData = loadGCData();
  function saveGCData() {
    localStorage.setItem(GC_STORAGE_KEY, JSON.stringify(GCData));
    syncProfileAndLeaderboardUI();
  }

  function recordMatchResult({ won = false, points = 50, badge = null }) {
    GCData.profile.played += 1;
    if (won) GCData.profile.wins += 1;
    else GCData.profile.losses += 1;
    GCData.profile.totalScore += points;
    if (points > GCData.profile.bestScore) GCData.profile.bestScore = points;
    if (badge && !GCData.profile.achievements.includes(badge)) {
      GCData.profile.achievements.push(badge);
    }

    const existing = GCData.leaderboard.find(u => u.username === GCData.profile.username);
    if (existing) {
      existing.score = GCData.profile.totalScore;
      existing.wins = GCData.profile.wins;
      existing.avatar = GCData.profile.avatar;
    } else {
      GCData.leaderboard.push({
        username: GCData.profile.username,
        avatar: GCData.profile.avatar,
        score: GCData.profile.totalScore,
        wins: GCData.profile.wins
      });
    }
    GCData.leaderboard.sort((a, b) => b.score - a.score);
    saveGCData();
  }

  function syncProfileAndLeaderboardUI() {
    const p = GCData.profile;
    const rankIdx = GCData.leaderboard.findIndex(u => u.username === p.username);

    $('#home-username').text(p.username);
    $('#home-avatar').text(p.avatar);
    $('#home-rank').text(rankIdx >= 0 ? `#${rankIdx + 1}` : '#—');
    $('#home-score').text(p.totalScore);
    $('#home-played').text(p.played);
    $('#home-wins').text(p.wins);
    $('#home-best').text(p.bestScore);

    $('#prof-username-input').val(p.username);
    $('#p-total-score').text(p.totalScore);
    $('#p-played').text(p.played);
    $('#p-wins').text(p.wins);
    $('#p-losses').text(p.losses);
    $('#p-achievements').html(
      p.achievements.map(a => `<span class="badge badge-accent gap-1 py-3 px-3"><i class="fa-solid fa-award"></i> ${a}</span>`).join('')
    );

    // Mini leaderboard
    $('#home-mini-leaderboard').html(
      GCData.leaderboard.slice(0, 5).map((u, idx) => `
        <div class="flex items-center justify-between bg-black/20 px-3 py-2 rounded-xl text-sm">
          <div class="flex items-center gap-2">
            <span class="font-black w-5 text-amber-400">#${idx + 1}</span>
            <span>${u.avatar}</span>
            <span class="font-bold">${u.username}</span>
          </div>
          <span class="font-mono font-bold text-sky-400">${u.score} pts</span>
        </div>
      `).join('')
    );

    // Full Leaderboard Podium & Table
    const top3 = GCData.leaderboard.slice(0, 3);
    const medals = ["🥇 1-O‘RIN", "🥈 2-O‘RIN", "🥉 3-O‘RIN"];
    $('#top3-podium').html(
      top3.map((u, i) => `
        <div class="glass-panel rounded-2xl p-4 text-center border border-amber-400/30">
          <div class="text-xs font-black text-amber-300">${medals[i]}</div>
          <div class="text-4xl my-2">${u.avatar}</div>
          <div class="font-extrabold text-base">${u.username}</div>
          <div class="text-sky-400 font-mono font-bold mt-1">${u.score} ball • ${u.wins} G‘</div>
        </div>
      `).join('')
    );

    $('#leaderboard-table-body').html(
      GCData.leaderboard.map((u, idx) => `
        <tr class="${u.username === p.username ? 'font-bold text-sky-300' : ''}">
          <td>${idx + 1}</td>
          <td>${u.avatar} ${u.username}</td>
          <td>${u.wins}</td>
          <td class="font-mono text-amber-300">${u.score}</td>
        </tr>
      `).join('')
    );

    // Apply settings
    $('html').attr('data-theme', GCData.settings.theme);
    AudioFX.enabled = GCData.settings.sound;
    AudioFX.volume = GCData.settings.volume;
    $('#set-theme-toggle').prop('checked', GCData.settings.theme === 'light');
    $('#set-sound-toggle').prop('checked', GCData.settings.sound);
    $('#set-volume-slider').val(GCData.settings.volume);
    $('#set-anim-toggle').prop('checked', GCData.settings.animations);
    $('#set-lang').val(GCData.settings.lang);
    $('#set-speed').val(GCData.settings.speed);
  }

  // ---------- 1. CHECKERS (SHASHKA) ENGINE ----------
  const Checkers = {
    board: [], // 8x8: null | { color: 'w'|'b', king: bool }
    turn: 'w',
    selected: null,
    validMoves: [],
    forcedChainFrom: null,
    history: [],

    init() {
      this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 1) this.board[r][c] = { color: 'b', king: false };
        }
      }
      for (let r = 5; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 1) this.board[r][c] = { color: 'w', king: false };
        }
      }
      this.turn = 'w';
      this.selected = null;
      this.validMoves = [];
      this.forcedChainFrom = null;
      this.history = [];
      $('#chk-history').empty();
      this.render();
    },

    getMovesForCell(r, c, board = this.board) {
      const piece = board[r][c];
      if (!piece) return [];
      const captures = [];
      const steps = [];

      const dirs = piece.king
        ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        : piece.color === 'w'
          ? [[-1, -1], [-1, 1]]
          : [[1, -1], [1, 1]];

      const allDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

      // Captures (including king long-range jumps)
      allDirs.forEach(([dr, dc]) => {
        if (piece.king) {
          let nr = r + dr, nc = c + dc;
          let foundEnemy = null;
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const cur = board[nr][nc];
            if (!cur) {
              if (foundEnemy) {
                captures.push({ r: nr, c: nc, capR: foundEnemy.r, capC: foundEnemy.c });
              }
            } else if (cur.color !== piece.color && !foundEnemy) {
              foundEnemy = { r: nr, c: nc };
            } else {
              break;
            }
            nr += dr; nc += dc;
          }
        } else {
          const mr = r + dr, mc = c + dc;
          const jr = r + dr * 2, jc = c + dc * 2;
          if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8) {
            const mid = board[mr][mc];
            if (mid && mid.color !== piece.color && !board[jr][jc]) {
              captures.push({ r: jr, c: jc, capR: mr, capC: mc });
            }
          }
        }
      });

      if (captures.length > 0) return captures;

      // Normal moves
      dirs.forEach(([dr, dc]) => {
        if (piece.king) {
          let nr = r + dr, nc = c + dc;
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
            steps.push({ r: nr, c: nc, capR: null, capC: null });
            nr += dr; nc += dc;
          }
        } else {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
            steps.push({ r: nr, c: nc, capR: null, capC: null });
          }
        }
      });

      return steps;
    },

    hasAnyCapture(color, board = this.board) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c]?.color === color) {
            const m = this.getMovesForCell(r, c, board);
            if (m.some(x => x.capR !== null)) return true;
          }
        }
      }
      return false;
    },

    applyMove(fr, fc, move) {
      const piece = this.board[fr][fc];
      this.board[fr][fc] = null;
      this.board[move.r][move.c] = piece;
      let captured = false;
      if (move.capR !== null) {
        this.board[move.capR][move.capC] = null;
        captured = true;
      }

      // King promotion
      if (piece.color === 'w' && move.r === 0) piece.king = true;
      if (piece.color === 'b' && move.r === 7) piece.king = true;

      const label = `${piece.color === 'w' ? 'Oq' : 'Qora'}: (${fr + 1},${fc + 1}) → (${move.r + 1},${move.c + 1})${captured ? ' [URDI]' : ''}`;
      this.history.push(label);
      $('#chk-history').prepend(`<li>${label}</li>`);
      AudioFX.checkerMove();

      // Multi-jump check
      if (captured) {
        const nextCaps = this.getMovesForCell(move.r, move.c).filter(m => m.capR !== null);
        if (nextCaps.length > 0) {
          this.forcedChainFrom = { r: move.r, c: move.c };
          this.selected = { r: move.r, c: move.c };
          this.validMoves = nextCaps;
          this.render();
          return;
        }
      }

      this.forcedChainFrom = null;
      this.selected = null;
      this.validMoves = [];
      this.turn = this.turn === 'w' ? 'b' : 'w';
      this.render();
      this.checkGameOver();

      const mode = $('#chk-mode').val();
      if (this.turn === 'b' && mode.startsWith('ai-')) {
        setTimeout(() => this.runAI(mode), 380);
      }
    },

    runAI(mode) {
      const allMoves = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (this.board[r][c]?.color === 'b') {
            this.getMovesForCell(r, c).forEach(m => allMoves.push({ fr: r, fc: c, move: m }));
          }
        }
      }
      if (!allMoves.length) return;

      const caps = allMoves.filter(x => x.move.capR !== null);
      const pool = caps.length > 0 ? caps : allMoves;

      let chosen;
      if (mode === 'ai-easy') {
        chosen = pool[Math.floor(Math.random() * pool.length)];
      } else {
        // Medium / Hard prefer captures and advancement
        pool.sort((a, b) => ((b.move.capR !== null ? 10 : 0) + b.move.r) - ((a.move.capR !== null ? 10 : 0) + a.move.r));
        chosen = mode === 'ai-hard' ? pool[0] : pool[Math.floor(Math.random() * Math.min(2, pool.length))];
      }
      this.applyMove(chosen.fr, chosen.fc, chosen.move);
    },

    checkGameOver() {
      let wCount = 0, bCount = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (this.board[r][c]?.color === 'w') wCount++;
          if (this.board[r][c]?.color === 'b') bCount++;
        }
      }
      $('#chk-count-w').text(wCount);
      $('#chk-count-b').text(bCount);

      if (bCount === 0) {
        AudioFX.win();
        recordMatchResult({ won: true, points: 120, badge: "Checkers Tactician" });
        alert("Tabriklaymiz! Oq donalar g‘alaba qozondi (+120 ball)");
        this.init();
      } else if (wCount === 0) {
        recordMatchResult({ won: false, points: 25 });
        alert("Qora donalar g‘alaba qozondi!");
        this.init();
      }
    },

    render() {
      const boardEl = $('#checkers-board').empty();
      const mustCap = this.hasAnyCapture(this.turn);
      $('#chk-status').text(
        `${this.turn === 'w' ? 'Oq donalar' : 'Qora donalar'} yuradi${mustCap ? ' (Majburiy urish!)' : ''}`
      );

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const isDark = (r + c) % 2 === 1;
          const cell = $(`<div class="sq-cell ${isDark ? 'sq-dark' : 'sq-light'}"></div>`);
          const piece = this.board[r][c];

          if (this.selected && this.selected.r === r && this.selected.c === c) {
            cell.addClass('sq-selected');
          }

          const moveMatch = this.validMoves.find(m => m.r === r && m.c === c);
          if (moveMatch) {
            cell.addClass(moveMatch.capR !== null ? 'sq-capture' : 'sq-move');
          }

          if (piece) {
            const pDiv = $(`<div class="checker-piece ${piece.color === 'w' ? 'checker-white' : 'checker-black'}">${piece.king ? '♔' : ''}</div>`);
            cell.append(pDiv);
          }

          cell.on('click', () => this.onCellClick(r, c));
          boardEl.append(cell);
        }
      }
      this.checkGameOver();
    },

    onCellClick(r, c) {
      if (this.forcedChainFrom) {
        const moveMatch = this.validMoves.find(m => m.r === r && m.c === c);
        if (moveMatch) this.applyMove(this.forcedChainFrom.r, this.forcedChainFrom.c, moveMatch);
        return;
      }

      const moveMatch = this.validMoves.find(m => m.r === r && m.c === c);
      if (moveMatch && this.selected) {
        this.applyMove(this.selected.r, this.selected.c, moveMatch);
        return;
      }

      const piece = this.board[r][c];
      if (piece && piece.color === this.turn) {
        const mode = $('#chk-mode').val();
        if (piece.color === 'b' && mode.startsWith('ai-')) return;
        let moves = this.getMovesForCell(r, c);
        if (this.hasAnyCapture(this.turn)) {
          moves = moves.filter(m => m.capR !== null);
        }
        this.selected = { r, c };
        this.validMoves = moves;
        this.render();
      } else {
        this.selected = null;
        this.validMoves = [];
        this.render();
      }
    }
  };

  // ---------- 2. CHESS (SHAHMAT) ENGINE WITH CHESS.JS ----------
  const PIECE_UNICODE = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };
  const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  const ChessApp = {
    game: new Chess(),
    selectedSq: null,
    legalDests: [],
    whiteSec: 300,
    blackSec: 300,
    timerId: null,

    init() {
      this.game.reset();
      this.selectedSq = null;
      this.legalDests = [];
      this.whiteSec = 300;
      this.blackSec = 300;
      $('#chs-history').empty();
      this.startClock();
      this.render();

      const side = $('#chs-side').val();
      const mode = $('#chs-mode').val();
      if (side === 'b' && mode.startsWith('ai-')) {
        setTimeout(() => this.runAI(mode), 350);
      }
    },

    startClock() {
      if (this.timerId) clearInterval(this.timerId);
      this.timerId = setInterval(() => {
        if (this.game.game_over()) return;
        if (this.game.turn() === 'w') this.whiteSec = Math.max(0, this.whiteSec - 1);
        else this.blackSec = Math.max(0, this.blackSec - 1);
        $('#chs-clock-w').text(this.fmtTime(this.whiteSec));
        $('#chs-clock-b').text(this.fmtTime(this.blackSec));
      }, 1000);
    },

    fmtTime(s) {
      return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    },

    render() {
      const boardEl = $('#chess-board').empty();
      const board = this.game.board();
      const flip = $('#chs-side').val() === 'b';

      for (let vr = 0; vr < 8; vr++) {
        for (let vc = 0; vc < 8; vc++) {
          const r = flip ? 7 - vr : vr;
          const c = flip ? 7 - vc : vc;
          const file = 'abcdefgh'[c];
          const rank = 8 - r;
          const sqName = `${file}${rank}`;
          const isDark = (r + c) % 2 === 1;

          const cell = $(`<div class="sq-cell ${isDark ? 'sq-dark' : 'sq-light'}"></div>`);
          if (this.selectedSq === sqName) cell.addClass('sq-selected');

          const isTarget = this.legalDests.includes(sqName);
          const piece = board[r][c];
          if (isTarget) {
            cell.addClass(piece ? 'sq-capture' : 'sq-move');
          }

          if (piece) {
            cell.text(PIECE_UNICODE[piece.color][piece.type]);
          }

          cell.on('click', () => this.onSquareClick(sqName));
          boardEl.append(cell);
        }
      }

      const hist = this.game.history();
      let histHtml = '';
      for (let i = 0; i < hist.length; i += 2) {
        histHtml += `<div><b>${Math.floor(i / 2) + 1}.</b> ${hist[i]} ${hist[i + 1] || ''}</div>`;
      }
      $('#chs-history').html(histHtml);

      let statusText = `${this.game.turn() === 'w' ? 'Oq' : 'Qora'} yurishi`;
      if (this.game.in_checkmate()) statusText = `MOT! ${this.game.turn() === 'w' ? 'Qora' : 'Oq'} g‘alaba qozondi!`;
      else if (this.game.in_stalemate() || this.game.in_draw()) statusText = "DURRANG / PAT!";
      else if (this.game.in_check()) statusText += " — SHAX!";
      $('#chs-status').text(statusText);

      if (this.game.game_over()) {
        const won = (this.game.in_checkmate() && this.game.turn() !== $('#chs-side').val());
        AudioFX.win();
        recordMatchResult({ won, points: won ? 150 : 40 });
      }
    },

    onSquareClick(sqName) {
      if (this.game.game_over()) return;
      const mode = $('#chs-mode').val();
      const side = $('#chs-side').val();
      if (mode.startsWith('ai-') && this.game.turn() !== side) return;

      if (this.selectedSq && this.legalDests.includes(sqName)) {
        const move = this.game.move({ from: this.selectedSq, to: sqName, promotion: 'q' });
        this.selectedSq = null;
        this.legalDests = [];
        if (move) {
          AudioFX.chessMove();
          this.render();
          if (!this.game.game_over() && mode.startsWith('ai-')) {
            setTimeout(() => this.runAI(mode), 350);
          }
        }
        return;
      }

      const piece = this.game.get(sqName);
      if (piece && piece.color === this.game.turn()) {
        this.selectedSq = sqName;
        this.legalDests = this.game.moves({ square: sqName, verbose: true }).map(m => m.to);
      } else {
        this.selectedSq = null;
        this.legalDests = [];
      }
      this.render();
    },

    evalBoard() {
      const b = this.game.board();
      let score = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = b[r][c];
          if (p) {
            const val = PIECE_VALUES[p.type] || 0;
            score += p.color === 'b' ? val : -val;
          }
        }
      }
      return score;
    },

    runAI(mode) {
      const moves = this.game.moves({ verbose: true });
      if (!moves.length) return;
      let chosen = moves[Math.floor(Math.random() * moves.length)];

      if (mode !== 'ai-easy') {
        let bestVal = -Infinity;
        moves.forEach(m => {
          this.game.move(m);
          const v = this.evalBoard() + (Math.random() * (mode === 'ai-medium' ? 120 : 15));
          this.game.undo();
          if (v > bestVal) { bestVal = v; chosen = m; }
        });
      }

      this.game.move(chosen);
      AudioFX.chessMove();
      this.render();
    }
  };

  // ---------- 3. TETRIS (CANVAS API) ENGINE ----------
  const TETRIS_COLS = 10;
  const TETRIS_ROWS = 20;
  const CELL_PX = 26;
  const SHAPES = [
    { m: [[1, 1, 1, 1]], color: '#38bdf8' }, // I
    { m: [[1, 1], [1, 1]], color: '#facc15' }, // O
    { m: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' }, // T
    { m: [[1, 0, 0], [1, 1, 1]], color: '#f97316' }, // L
    { m: [[0, 0, 1], [1, 1, 1]], color: '#3b82f6' }, // J
    { m: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' }, // S
    { m: [[1, 1, 0], [0, 1, 1]], color: '#f43f5e' }  // Z
  ];

  const TetrisApp = {
    grid: [],
    current: null,
    next: null,
    score: 0,
    highScore: Number(localStorage.getItem('UF_TETRIS_HIGH_V1') || 0),
    level: 1,
    lines: 0,
    paused: false,
    dropAcc: 0,
    lastTs: 0,

    init() {
      this.grid = Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(null));
      this.score = 0;
      this.level = 1;
      this.lines = 0;
      this.paused = false;
      this.next = this.randomPiece();
      this.spawnPiece();
      this.updateHUD();
    },

    randomPiece() {
      const tpl = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      return {
        matrix: tpl.m.map(r => [...r]),
        color: tpl.color,
        x: Math.floor((TETRIS_COLS - tpl.m[0].length) / 2),
        y: 0
      };
    },

    spawnPiece() {
      this.current = this.next;
      this.next = this.randomPiece();
      if (this.collides(this.current.matrix, this.current.x, this.current.y)) {
        AudioFX.win();
        recordMatchResult({ won: this.score >= 500, points: Math.min(300, Math.floor(this.score / 5)), badge: "Tetris Pro" });
        alert(`O‘yin tugadi! Ball: ${this.score}`);
        this.init();
      }
      this.drawNext();
    },

    collides(mat, px, py) {
      for (let r = 0; r < mat.length; r++) {
        for (let c = 0; c < mat[r].length; c++) {
          if (!mat[r][c]) continue;
          const nx = px + c;
          const ny = py + r;
          if (nx < 0 || nx >= TETRIS_COLS || ny >= TETRIS_ROWS) return true;
          if (ny >= 0 && this.grid[ny][nx]) return true;
        }
      }
      return false;
    },

    rotate(mat) {
      return mat[0].map((_, idx) => mat.map(row => row[idx]).reverse());
    },

    move(dx, dy) {
      if (this.paused) return false;
      if (!this.collides(this.current.matrix, this.current.x + dx, this.current.y + dy)) {
        this.current.x += dx;
        this.current.y += dy;
        return true;
      }
      return false;
    },

    rotatePiece() {
      if (this.paused) return;
      const rot = this.rotate(this.current.matrix);
      if (!this.collides(rot, this.current.x, this.current.y)) {
        this.current.matrix = rot;
        AudioFX.click();
      }
    },

    hardDrop() {
      if (this.paused) return;
      while (this.move(0, 1)) {
        this.score += 2;
      }
      this.lockPiece();
    },

    lockPiece() {
      AudioFX.tetrisDrop();
      const { matrix, color, x, y } = this.current;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c] && y + r >= 0) {
            this.grid[y + r][x + c] = color;
          }
        }
      }
      this.clearLines();
      this.spawnPiece();
      this.updateHUD();
    },

    clearLines() {
      let cleared = 0;
      for (let r = TETRIS_ROWS - 1; r >= 0; r--) {
        if (this.grid[r].every(cell => cell !== null)) {
          this.grid.splice(r, 1);
          this.grid.unshift(Array(TETRIS_COLS).fill(null));
          cleared++;
          r++;
        }
      }
      if (cleared > 0) {
        AudioFX.lineClear();
        this.lines += cleared;
        this.score += [0, 100, 300, 500, 800][cleared] * this.level;
        this.level = Math.floor(this.lines / 8) + 1;
        if (this.score > this.highScore) {
          this.highScore = this.score;
          localStorage.setItem('UF_TETRIS_HIGH_V1', String(this.highScore));
        }
      }
    },

    updateHUD() {
      $('#tet-score').text(this.score);
      $('#tet-high').text(this.highScore);
      $('#tet-level').text(this.level);
      $('#tet-lines').text(this.lines);
    },

    drawNext() {
      const nc = document.getElementById('tetris-next-canvas');
      if (!nc) return;
      const ctx = nc.getContext('2d');
      ctx.clearRect(0, 0, nc.width, nc.height);
      const m = this.next.matrix;
      const sz = 20;
      const ox = (nc.width - m[0].length * sz) / 2;
      const oy = (nc.height - m.length * sz) / 2;
      m.forEach((row, r) => row.forEach((v, c) => {
        if (v) {
          ctx.fillStyle = this.next.color;
          ctx.fillRect(ox + c * sz, oy + r * sz, sz - 2, sz - 2);
        }
      }));
    },

    step(ts) {
      requestAnimationFrame((t) => this.step(t));
      const dt = (ts - (this.lastTs || ts)) / 1000;
      this.lastTs = ts;

      if ($('#view-tetris').is(':visible') && !this.paused) {
        const speedMap = { slow: 0.85, normal: 0.55, fast: 0.3 };
        const interval = Math.max(0.1, (speedMap[GCData.settings.speed] || 0.55) - (this.level - 1) * 0.04);
        this.dropAcc += dt;
        if (this.dropAcc >= interval) {
          this.dropAcc = 0;
          if (!this.move(0, 1)) {
            this.lockPiece();
          }
        }
        this.render();
      }
    },

    render() {
      const canvas = document.getElementById('tetris-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let x = 0; x <= TETRIS_COLS; x++) {
        ctx.beginPath(); ctx.moveTo(x * CELL_PX, 0); ctx.lineTo(x * CELL_PX, canvas.height); ctx.stroke();
      }
      for (let y = 0; y <= TETRIS_ROWS; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * CELL_PX); ctx.lineTo(canvas.width, y * CELL_PX); ctx.stroke();
      }

      // Locked blocks
      for (let r = 0; r < TETRIS_ROWS; r++) {
        for (let c = 0; c < TETRIS_COLS; c++) {
          if (this.grid[r][c]) {
            ctx.fillStyle = this.grid[r][c];
            ctx.fillRect(c * CELL_PX + 1, r * CELL_PX + 1, CELL_PX - 2, CELL_PX - 2);
          }
        }
      }

      // Active piece
      if (this.current) {
        this.current.matrix.forEach((row, r) => row.forEach((v, c) => {
          if (v) {
            ctx.fillStyle = this.current.color;
            ctx.fillRect((this.current.x + c) * CELL_PX + 1, (this.current.y + r) * CELL_PX + 1, CELL_PX - 2, CELL_PX - 2);
          }
        }));
      }
    }
  };

  // ---------- NAVIGATION & EVENT BINDINGS ----------
  function switchView(viewName) {
    AudioFX.click();
    $('.app-view').addClass('hidden');
    $(`#view-${viewName}`).removeClass('hidden');
    if (viewName === 'home') renderHomeChart();
  }

  function renderHomeChart() {
    const el = document.getElementById('morris-home-chart');
    if (!el || !window.Morris) return;
    $(el).empty();
    Morris.Area({
      element: 'morris-home-chart',
      data: [
        { day: 'Du', pts: 180 },
        { day: 'Se', pts: 320 },
        { day: 'Ch', pts: 270 },
        { day: 'Pa', pts: 450 },
        { day: 'Ju', pts: 390 },
        { day: 'Sh', pts: 610 },
        { day: 'Ya', pts: GCData.profile.totalScore }
      ],
      xkey: 'day',
      ykeys: ['pts'],
      labels: ['Ball'],
      lineColors: ['#a855f7'],
      fillOpacity: 0.35,
      hideHover: 'auto',
      resize: true
    });
  }

  $(document).ready(() => {
    syncProfileAndLeaderboardUI();
    Checkers.init();
    ChessApp.init();
    TetrisApp.init();
    renderHomeChart();
    requestAnimationFrame((t) => TetrisApp.step(t));

    // Navigation buttons
    $('[data-view]').on('click', function () {
      switchView($(this).data('view'));
    });

    // Checkers controls
    $('#chk-new, #chk-restart, #chk-mode').on('change click', function (e) {
      if (e.type === 'change' && this.id !== 'chk-mode') return;
      Checkers.init();
    });

    // Chess controls
    $('#chs-restart, #chs-mode, #chs-side').on('change click', function (e) {
      if (e.type === 'change' && !['chs-mode', 'chs-side'].includes(this.id)) return;
      ChessApp.init();
    });
    $('#chs-undo').on('click', () => {
      ChessApp.game.undo();
      if ($('#chs-mode').val().startsWith('ai-')) ChessApp.game.undo();
      ChessApp.render();
    });

    // Tetris controls
    $('#tet-restart').on('click', () => TetrisApp.init());
    $('#tet-pause').on('click', () => {
      TetrisApp.paused = !TetrisApp.paused;
      $('#tet-pause').html(TetrisApp.paused ? '<i class="fa-solid fa-play"></i> Davom' : '<i class="fa-solid fa-pause"></i> Pauza');
    });
    $('#m-tet-left').on('click', () => TetrisApp.move(-1, 0));
    $('#m-tet-right').on('click', () => TetrisApp.move(1, 0));
    $('#m-tet-rot').on('click', () => TetrisApp.rotatePiece());
    $('#m-tet-down').on('click', () => TetrisApp.move(0, 1));
    $('#m-tet-drop').on('click', () => TetrisApp.hardDrop());

    window.addEventListener('keydown', (e) => {
      if (!$('#view-tetris').is(':visible')) return;
      if (e.code === 'ArrowLeft') { e.preventDefault(); TetrisApp.move(-1, 0); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); TetrisApp.move(1, 0); }
      else if (e.code === 'ArrowDown') { e.preventDefault(); TetrisApp.move(0, 1); }
      else if (e.code === 'ArrowUp') { e.preventDefault(); TetrisApp.rotatePiece(); }
      else if (e.code === 'Space') { e.preventDefault(); TetrisApp.hardDrop(); }
      else if (e.code === 'KeyP') { e.preventDefault(); $('#tet-pause').trigger('click'); }
    });

    // Profile save
    let chosenAvatar = GCData.profile.avatar;
    $('.prof-av-btn').on('click', function () {
      chosenAvatar = $(this).data('av');
      $('.prof-av-btn').removeClass('btn-primary');
      $(this).addClass('btn-primary');
    });
    $('#prof-save-btn').on('click', () => {
      const oldName = GCData.profile.username;
      const newName = ($('#prof-username-input').val() || 'PlayerOne').trim();
      GCData.profile.username = newName;
      GCData.profile.avatar = chosenAvatar;
      const lbItem = GCData.leaderboard.find(u => u.username === oldName);
      if (lbItem) { lbItem.username = newName; lbItem.avatar = chosenAvatar; }
      saveGCData();
      alert("Profil saqlandi!");
    });

    // Settings save & reset
    $('#set-save-btn').on('click', () => {
      GCData.settings.theme = $('#set-theme-toggle').is(':checked') ? 'light' : 'dark';
      GCData.settings.sound = $('#set-sound-toggle').is(':checked');
      GCData.settings.volume = Number($('#set-volume-slider').val());
      GCData.settings.animations = $('#set-anim-toggle').is(':checked');
      GCData.settings.lang = $('#set-lang').val();
      GCData.settings.speed = $('#set-speed').val();
      saveGCData();
      alert("Sozlamalar saqlandi!");
    });

    $('#set-reset-btn').on('click', () => {
      localStorage.removeItem(GC_STORAGE_KEY);
      GCData = loadGCData();
      saveGCData();
      alert("Sozlamalar va ma'lumotlar tiklandi.");
    });
  });
