class GameOfLife {
    constructor() {
        this.gridSize = 30;
        this.grid = [];
        this.isRunning = false;
        this.generation = 0;
        this.speed = 200;
        this.intervalId = null;
        this.canvasSize = 600;
        this.cellSize = this.canvasSize / this.gridSize;
        
        // Mouse interaction variables
        this.isMouseDown = false;
        this.isDragging = false;
        this.paintMode = true; // true for painting alive cells, false for erasing
        
        // Video recording variables
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingStartTime = null;
        this.maxRecordingTime = 30000; // 30 seconds max
        
        this.initializeElements();
        this.createGrid();
        this.setupEventListeners();
        this.setupCanvasEvents();
        this.updateStats();
        this.draw();
    }
    
    initializeElements() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.randomBtn = document.getElementById('randomBtn');
        this.stepBtn = document.getElementById('stepBtn');
        this.recordBtn = document.getElementById('recordBtn');
        this.downloadVideoBtn = document.getElementById('downloadVideoBtn');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.gridSizeSelect = document.getElementById('gridSize');
        this.generationSpan = document.getElementById('generation');
        this.livingCellsSpan = document.getElementById('livingCells');
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.clearBtn.addEventListener('click', () => this.clear());
        this.randomBtn.addEventListener('click', () => this.randomize());
        this.stepBtn.addEventListener('click', () => this.step());
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.downloadVideoBtn.addEventListener('click', () => this.downloadVideo());
        
        this.speedSlider.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            this.speedValue.textContent = `${this.speed}ms`;
            if (this.isRunning) {
                this.stop();
                this.start();
            }
        });
        
        this.gridSizeSelect.addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.cellSize = this.canvasSize / this.gridSize;
            this.stop();
            this.createGrid();
            this.updateStats();
            this.draw();
        });
    }
    
    setupCanvasEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleMouseUp());
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.touches[0].clientX - rect.left) * scaleX,
            y: (e.touches[0].clientY - rect.top) * scaleY
        };
    }
    
    getCellFromPos(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return { row, col };
    }
    
    handleMouseDown(e) {
        if (this.isRunning) return;
        
        this.isMouseDown = true;
        const pos = this.getMousePos(e);
        const { row, col } = this.getCellFromPos(pos.x, pos.y);
        
        if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
            // Determine paint mode based on the clicked cell
            this.paintMode = !this.grid[row][col];
            this.toggleCell(row, col, this.paintMode);
        }
    }
    
    handleMouseMove(e) {
        if (!this.isMouseDown || this.isRunning) return;
        
        this.isDragging = true;
        const pos = this.getMousePos(e);
        const { row, col } = this.getCellFromPos(pos.x, pos.y);
        
        if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
            this.toggleCell(row, col, this.paintMode);
        }
    }
    
    handleMouseUp() {
        this.isMouseDown = false;
        this.isDragging = false;
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const pos = this.getTouchPos(e);
        this.handleMouseDown({ clientX: pos.x + this.canvas.getBoundingClientRect().left, clientY: pos.y + this.canvas.getBoundingClientRect().top });
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const pos = this.getTouchPos(e);
        this.handleMouseMove({ clientX: pos.x + this.canvas.getBoundingClientRect().left, clientY: pos.y + this.canvas.getBoundingClientRect().top });
    }
    
    createGrid() {
        this.grid = [];
        this.generation = 0;
        
        for (let i = 0; i < this.gridSize; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = false;
            }
        }
    }
    
    toggleCell(row, col, state = null) {
        if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
            if (state !== null) {
                this.grid[row][col] = state;
            } else {
                this.grid[row][col] = !this.grid[row][col];
            }
            this.draw();
            this.updateStats();
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);
        
        // Draw grid lines
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.gridSize; i++) {
            const pos = i * this.cellSize;
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(pos, 0);
            this.ctx.lineTo(pos, this.canvasSize);
            this.ctx.stroke();
            
            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(0, pos);
            this.ctx.lineTo(this.canvasSize, pos);
            this.ctx.stroke();
        }
        
        // Draw cells
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j]) {
                    this.drawLiveCell(i, j);
                }
            }
        }
    }
    
    drawLiveCell(row, col) {
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        
        // Create gradient for live cells
        const gradient = this.ctx.createLinearGradient(x, y, x + this.cellSize, y + this.cellSize);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#ee5a24');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
        
        // Add a small white dot in the center
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const centerX = x + this.cellSize / 2;
        const centerY = y + this.cellSize / 2;
        const dotRadius = Math.max(2, this.cellSize / 8);
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, dotRadius, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    countNeighbors(row, col) {
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                
                const newRow = row + i;
                const newCol = col + j;
                
                if (newRow >= 0 && newRow < this.gridSize && 
                    newCol >= 0 && newCol < this.gridSize) {
                    if (this.grid[newRow][newCol]) {
                        count++;
                    }
                }
            }
        }
        return count;
    }
    
    nextGeneration() {
        const newGrid = [];
        
        for (let i = 0; i < this.gridSize; i++) {
            newGrid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                const neighbors = this.countNeighbors(i, j);
                const currentCell = this.grid[i][j];
                
                if (currentCell) {
                    // Live cell with 2 or 3 neighbors survives
                    newGrid[i][j] = neighbors === 2 || neighbors === 3;
                } else {
                    // Dead cell with exactly 3 neighbors becomes alive
                    newGrid[i][j] = neighbors === 3;
                }
            }
        }
        
        this.grid = newGrid;
        this.generation++;
        this.draw();
        this.updateStats();
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.stepBtn.disabled = true;
            this.intervalId = setInterval(() => this.nextGeneration(), this.speed);
        }
    }
    
    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.stepBtn.disabled = false;
            clearInterval(this.intervalId);
        }
    }
    
    step() {
        if (!this.isRunning) {
            this.nextGeneration();
        }
    }
    
    clear() {
        this.stop();
        this.generation = 0;
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = false;
            }
        }
        this.draw();
        this.updateStats();
    }
    
    randomize() {
        this.stop();
        this.generation = 0;
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = Math.random() < 0.3;
            }
        }
        this.draw();
        this.updateStats();
    }
    
    updateStats() {
        this.generationSpan.textContent = this.generation;
        
        let livingCells = 0;
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j]) {
                    livingCells++;
                }
            }
        }
        this.livingCellsSpan.textContent = livingCells;
    }
    
    setPattern(pattern, startRow = 0, startCol = 0) {
        this.stop();
        this.clear();
        
        for (let i = 0; i < pattern.length; i++) {
            for (let j = 0; j < pattern[i].length; j++) {
                const row = startRow + i;
                const col = startCol + j;
                if (row < this.gridSize && col < this.gridSize) {
                    this.grid[row][col] = pattern[i][j] === 1;
                }
            }
        }
        
        this.draw();
        this.updateStats();
    }
    
    toggleRecording() {
        if (!this.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    }
    
    async startRecording() {
        try {
            // Check if MediaRecorder is supported
            if (!MediaRecorder.isTypeSupported('video/webm')) {
                alert('Video recording is not supported in this browser. Try Chrome or Firefox.');
                return;
            }
            
            // Get canvas stream
            const stream = this.canvas.captureStream(30); // 30 FPS
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            this.recordedChunks = [];
            this.recordingStartTime = Date.now();
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                this.videoBlob = blob;
                this.downloadVideoBtn.disabled = false;
                this.recordBtn.disabled = false;
                this.recordBtn.textContent = 'Start Recording';
                this.recordBtn.classList.remove('recording');
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordBtn.textContent = 'Stop Recording';
            this.recordBtn.classList.add('recording');
            this.downloadVideoBtn.disabled = true;
            
            // Start the simulation if it's not running
            if (!this.isRunning) {
                this.start();
            }
            
            // Auto-stop after max time
            this.recordingTimeout = setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            }, this.maxRecordingTime);
            
            // Update button with timer
            this.updateRecordingTimer();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Failed to start recording. Please try again.');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            if (this.recordingTimeout) {
                clearTimeout(this.recordingTimeout);
            }
            
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
        }
    }
    
    updateRecordingTimer() {
        this.timerInterval = setInterval(() => {
            if (this.isRecording) {
                const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                const remaining = Math.floor(this.maxRecordingTime / 1000) - elapsed;
                this.recordBtn.textContent = `Recording... ${remaining}s`;
                
                if (remaining <= 0) {
                    this.stopRecording();
                }
            }
        }, 1000);
    }
    
    downloadVideo() {
        if (this.videoBlob) {
            const url = URL.createObjectURL(this.videoBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `game-of-life-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
}

// Common patterns
const patterns = {
    glider: [
        [0, 1, 0],
        [0, 0, 1],
        [1, 1, 1]
    ],
    
    blinker: [
        [1, 1, 1]
    ],
    
    toad: [
        [0, 1, 1, 1],
        [1, 1, 1, 0]
    ],
    
    beacon: [
        [1, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 0, 1, 1],
        [0, 0, 1, 1]
    ],
    
    pulsar: [
        [0,0,1,1,1,0,0,0,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [0,0,1,1,1,0,0,0,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,1,0,0,0,1,1,1,0,0],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,1,0,0,0,1,1,1,0,0]
    ],
    
    gosperGun: [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
        [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
        [1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ]
};

function loadPattern(patternName) {
    if (patterns[patternName]) {
        const centerRow = Math.floor((game.gridSize - patterns[patternName].length) / 2);
        const centerCol = Math.floor((game.gridSize - patterns[patternName][0].length) / 2);
        game.setPattern(patterns[patternName], centerRow, centerCol);
    }
}

// Initialize the game when the page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new GameOfLife();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (game.isRunning) {
            game.stop();
        } else {
            game.start();
        }
    } else if (e.code === 'KeyC') {
        game.clear();
    } else if (e.code === 'KeyR') {
        game.randomize();
    } else if (e.code === 'KeyS') {
        game.step();
    }
});