// Element references
const board = document.getElementById('board');
const missionBtn = document.getElementById('mission-btn');
const popup = document.getElementById('popup');
const instructionsContainer = document.getElementById('instructions');
const executeBtn = document.getElementById('execute-btn');
const messagePopup = document.getElementById('message-popup');
const messageText = document.getElementById('message');

// Global variables
const boardSize = 10;
let robotPosition = { x: 0, y: 0 };
let items = [];
let movingDogs = [];

// Utility functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getCell = (x, y) => document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);

// Helper to place the robot image
const placeRobotImage = (cell) => {
    const img = document.createElement('img');
    img.src = 'T1000.png';
    img.alt = 'T1000 Robot';
    img.style.width = '50%';
    img.style.height = '50%';
    cell.appendChild(img);
};

// Generate the board
const createBoard = () => {
    board.innerHTML = '';
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            board.appendChild(cell);
        }
    }
};

// Add items to the board
const placeItems = () => {
    items = [];
    movingDogs = [];
    const addItem = (emoji, count) => {
        for (let i = 0; i < count; i++) {
            let x, y;
            do {
                x = randomInt(0, boardSize - 1);
                y = randomInt(0, boardSize - 1);
            } while (items.some(item => item.x === x && item.y === y));
            items.push({ x, y, emoji });
            if (emoji === '🤖') {
                const cell = getCell(x, y);
                placeRobotImage(cell);
            } else {
                getCell(x, y).textContent = emoji;
            }
            if (emoji === '🐕‍🦺') {
                movingDogs.push({ x, y, originalX: x, originalY: y });
            }
        }
    };

    addItem('📦', randomInt(3, 6));
    addItem('🛢️', randomInt(2, 4));
    addItem('🚧', randomInt(2, 3));
    addItem('🧱', randomInt(2, 3));
    addItem('🧍🏼', 1);
    addItem('🚶', 1);
    addItem('🐕‍🦺', 2);
    addItem('🤖', 1);

    robotPosition = items.find(item => item.emoji === '🤖');
};

// Move dogs during the display time
const moveDogs = () => {
    movingDogs.forEach(dog => {
        const moveDog = async () => {
            const emptyCells = [
                { x: dog.x, y: Math.max(0, dog.y - 1) }, // Up
                { x: dog.x, y: Math.min(boardSize - 1, dog.y + 1) }, // Down
                { x: Math.max(0, dog.x - 1), y: dog.y }, // Left
                { x: Math.min(boardSize - 1, dog.x + 1), y: dog.y } // Right
            ].filter(pos => !items.some(item => item.x === pos.x && item.y === pos.y));

            if (emptyCells.length === 0) return; // No movement possible

            const target = emptyCells[randomInt(0, emptyCells.length - 1)];
            const currentCell = getCell(dog.x, dog.y);
            const targetCell = getCell(target.x, target.y);

            currentCell.textContent = '';
            targetCell.textContent = '🐕‍🦺';

            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second

            targetCell.textContent = '';
            currentCell.textContent = '🐕‍🦺';
        };

        moveDog();
    });
};

// Handle "Misión" button
missionBtn.addEventListener('click', () => {
    createBoard();
    placeItems();

    const dogInterval = setInterval(moveDogs, 2000); // Dogs move every 2 seconds

    setTimeout(() => {
        clearInterval(dogInterval); // Stop dog movement
        board.querySelectorAll('.cell').forEach(cell => (cell.textContent = ''));
        items.forEach(item => {
            if (item.emoji === '🤖') {
                const cell = getCell(item.x, item.y);
                placeRobotImage(cell);
            } else {
                getCell(item.x, item.y).textContent = item.emoji;
            }
        });
        showPopup();
    }, 8000);
});

// Show movement popup
const showPopup = () => {
    popup.classList.remove('hidden');
    instructionsContainer.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const row = document.createElement('div');
        row.classList.add('instructions-row');
        row.innerHTML = `
            <select>
                <option value="up">Arriba</option>
                <option value="down">Abajo</option>
                <option value="left">Izquierda</option>
                <option value="right">Derecha</option>
            </select>
            <input type="number" min="1" max="${boardSize - 1}" />
        `;
        instructionsContainer.appendChild(row);
    }
};

// Execute movement
executeBtn.addEventListener('click', () => {
    const instructions = Array.from(instructionsContainer.children).map(row => {
        const direction = row.querySelector('select').value;
        const distance = parseInt(row.querySelector('input').value) || 0;
        return { direction, distance };
    });

    popup.classList.add('hidden');
    moveRobot(instructions);
});

const moveRobot = async instructions => {
    for (const { direction, distance } of instructions) {
        for (let step = 0; step < distance; step++) {
            const nextPosition = { ...robotPosition };

            if (direction === 'up') nextPosition.y = robotPosition.y - 1;
            if (direction === 'down') nextPosition.y = robotPosition.y + 1;
            if (direction === 'left') nextPosition.x = robotPosition.x - 1;
            if (direction === 'right') nextPosition.x = robotPosition.x + 1;

            // Check if the move goes out of bounds
            if (
                nextPosition.x < 0 ||
                nextPosition.x >= boardSize ||
                nextPosition.y < 0 ||
                nextPosition.y >= boardSize
            ) {
                showMessage('Lo sentimos, has abandonado la misión.');
                return; // Stop further movement
            }

            // Update board
            const currentCell = getCell(robotPosition.x, robotPosition.y);
            currentCell.innerHTML = '';
            robotPosition = nextPosition;
            placeRobotImage(getCell(robotPosition.x, robotPosition.y));

            // Check for collisions after the move
            if (checkCollision()) return; // Stop moving if collision detected

            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 500ms
        }
    }

    // If no collisions occurred during the entire movement
    showMessage('El robot terminó su movimiento sin incidentes.');
};

// Updated collision detection to return true if collision occurs
const checkCollision = () => {
    const collisionItem = items.find(item => item.x === robotPosition.x && item.y === robotPosition.y);

    if (collisionItem) {
        // Handle collision logic
        const collisionCell = getCell(robotPosition.x, robotPosition.y);
        collisionCell.innerHTML = '💥';

        if (['📦', '🛢️', '🚧', '🧱'].includes(collisionItem.emoji)) {
            showMessage('Lo sentimos, te ha vencido un obstáculo y has perdido la misión');
        } else if (collisionItem.emoji === '🐕‍🦺') {
            showMessage('Lo sentimos, te ha detectado el perro y has perdido la misión');
        } else if (collisionItem.emoji === '🧍🏼') {
            showMessage('Lo sentimos, has matado al verdadero John Connor y has condenado a la humanidad');
        } else if (collisionItem.emoji === '🚶') {
            showMessage('¡Felicitaciones! Has acabado con Skynet y has salvado a la humanidad');
        }

        return true; // Collision detected
    }

    return false; // No collision
};

// Show a message
const showMessage = text => {
    messageText.textContent = text;
    messagePopup.classList.remove('hidden');

    setTimeout(() => {
        messagePopup.classList.add('hidden');
        board.querySelectorAll('.cell').forEach(cell => (cell.textContent = ''));
    }, 3000);
};

// Initialize game
createBoard();