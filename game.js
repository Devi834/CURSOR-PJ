// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#63A4FF',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 100 },
        },
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
};

// Game variables
let player;
let letters;
let cursors;
let score = 0;
let scoreText;
let gameOver = false;
let gameOverText;
let restartText;

// New variables for pause and image display
let isPaused = false;
let pauseText;

// New variables for speed control
let letterSpeed = 1;
let speedText;

// --- Letter Mapping ---
// Maps each letter to a fun, descriptive word.
const letterMap = {
    'A': 'Apple', 'B': 'Butterfly', 'C': 'Castle', 'D': 'Dinosaur', 'E': 'Elephant',
    'F': 'Firetruck', 'G': 'Giraffe', 'H': 'Helicopter', 'I': 'Igloo', 'J': 'Jellyfish',
    'K': 'Kangaroo', 'L': 'Lion', 'M': 'Mountain', 'N': 'Nest', 'O': 'Octopus',
    'P': 'Penguin', 'Q': 'Queen', 'R': 'Rainbow', 'S': 'Star', 'T': 'Tiger',
    'U': 'Umbrella', 'V': 'Volcano', 'W': 'Whale', 'X': 'Xylophone',
    'Y': 'Yacht', 'Z': 'Zebra'
};

// Create game instance
const game = new Phaser.Game(config);

function preload() {
    // Use graphics to create textures, which is more reliable than data URIs in some cases.
    // Create player bar texture
    const playerGraphics = this.make.graphics({ fillStyle: { color: 0xff0000 } });
    playerGraphics.fillRect(0, 0, 120, 20);
    playerGraphics.generateTexture('player', 120, 20);
    playerGraphics.destroy();

    // Create letter background texture
    const letterGraphics = this.make.graphics({ fillStyle: { color: 0x0000ff } });
    letterGraphics.fillRect(0, 0, 40, 40);
    letterGraphics.generateTexture('letter-bg', 40, 40);
    letterGraphics.destroy();

    // Create textures for confetti particles
    const colors = [0xffd700, 0xffffff, 0x00ff00, 0x00ffff, 0xff00ff];
    colors.forEach((color, i) => {
        const particleGraphics = this.make.graphics({ fillStyle: { color: color } });
        particleGraphics.fillRect(0, 0, 10, 10);
        particleGraphics.generateTexture(`p${i}`, 10, 10);
        particleGraphics.destroy();
    });
}

function create() {
    gameOver = false;
    isPaused = false; // Reset pause state on restart
    letterSpeed = 1; // Reset speed on restart
    this.currentText = null; // To hold the currently displayed text
    this.textBg = null; // To hold the background for the text

    // Create player
    player = this.physics.add.sprite(400, 530, 'player');
    player.setCollideWorldBounds(true);
    player.setImmovable(true); // Player shouldn't be moved by physics

    // Create a group for letters
    letters = this.physics.add.group();

    // Setup collision between player and letters
    this.physics.add.collider(player, letters, (player, letterContainer) => {
        if (gameOver) return; // Stop processing if game is already over/won

        const caughtLetter = letterContainer.letter;
        score += 10;
        scoreText.setText('Score: ' + score);
        
        const word = letterMap[caughtLetter];
        displayTextForLetter.call(this, word, caughtLetter);
        speakPhrase(caughtLetter, word); // Speak the full phrase

        letterContainer.destroy();

        // Check for win condition
        if (score >= 300) {
            triggerWin.call(this);
        } else {
            // Spawn the next letter after a 6-second delay
            this.time.delayedCall(6000, spawnLetter, [], this);
        }
    });

    // Setup keyboard controls
    cursors = this.input.keyboard.createCursorKeys();

    // Display the score
    scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '32px',
        fill: '#FFFFFF',
        fontStyle: 'bold',
    });

    // Add speed control text
    speedText = this.add.text(config.width - 200, 16, `Speed: ${letterSpeed}x`, {
        fontSize: '32px',
        fill: '#FFFFFF',
        fontStyle: 'bold',
    });

    // Spawn the first letter to begin the game
    spawnLetter.call(this);

    // Add pause key listener
    this.input.keyboard.on('keydown-P', togglePause, this);

    // Add speed control listeners
    this.input.keyboard.on('keydown-UP', () => {
        if (gameOver || letterSpeed >= 5) return;
        letterSpeed += 0.5;
        speedText.setText(`Speed: ${letterSpeed}x`);
        updateExistingLetterSpeeds.call(this);
    });
    this.input.keyboard.on('keydown-DOWN', () => {
        if (gameOver || letterSpeed <= 0.5) return;
        letterSpeed -= 0.5;
        speedText.setText(`Speed: ${letterSpeed}x`);
        updateExistingLetterSpeeds.call(this);
    });

    // Listen for letters hitting the bottom of the screen
    this.physics.world.on('worldbounds', (body, up, down, left, right) => {
        if (body.gameObject.isLetter && down) {
            triggerGameOver.call(this);
        }
    });
}

function update() {
    if (gameOver || isPaused) {
        return; // Stop all updates if game is over or paused
    }
    // Player movement
    if (cursors.left.isDown) {
        player.setVelocityX(-350);
    } else if (cursors.right.isDown) {
        player.setVelocityX(350);
    } else {
        player.setVelocityX(0);
    }
}

function spawnLetter() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    const x = Phaser.Math.Between(50, 750);
    const y = -50;

    // A container is a great way to group a sprite and text
    const letterContainer = this.add.container(x, y);
    
    // Add the container to physics
    this.physics.world.enable(letterContainer);
    
    const letterBg = this.add.sprite(0, 0, 'letter-bg');
    const letterText = this.add.text(0, 0, randomLetter, {
        fontSize: '32px',
        fill: '#FFFFFF',
        fontStyle: 'bold',
    });
    
    // Center the text on the background
    letterText.setOrigin(0.5, 0.5);

    letterContainer.add([letterBg, letterText]);
    letterContainer.setSize(40, 40);
    letterContainer.letter = randomLetter; // Store the letter on the container
    letterContainer.isLetter = true; // Flag this as a letter for game over detection

    // Add the new letter container to the group
    letters.add(letterContainer);

    // Set a random velocity for the falling letter, adjusted by speed control
    // The base speed is now the slowest yet.
    const baseSpeed = Phaser.Math.Between(10, 30);
    letterContainer.body.velocity.y = baseSpeed * letterSpeed;
    letterContainer.baseSpeed = baseSpeed; // Store base speed for later adjustments
    letterContainer.body.setCollideWorldBounds(true);
    letterContainer.body.onWorldBounds = true; // Enable world bounds collision event
    
    // Destroy the letter if it goes off screen
    this.time.delayedCall(8000, () => {
        if (letterContainer.active) {
            letterContainer.destroy();
        }
    });
}

function triggerGameOver() {
    if (gameOver) {
        return;
    }
    gameOver = true;
    this.physics.pause();

    gameOverText = this.add.text(config.width / 2, config.height / 2 - 50, 'Game Over', {
        fontSize: '64px',
        fill: '#ff0000',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    restartText = this.add.text(config.width / 2, config.height / 2 + 50, 'Press Space to Restart', {
        fontSize: '32px',
        fill: '#ffffff'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () => {
        score = 0;
        this.scene.restart();
    });
}

// --- New Functions ---

/**
 * Updates the speed of all letters currently on screen.
 */
function updateExistingLetterSpeeds() {
    letters.getChildren().forEach(letter => {
        if (letter.active) {
            letter.body.velocity.y = letter.baseSpeed * letterSpeed;
        }
    });
}

/**
 * Uses the Web Speech API to say a phrase out loud.
 * @param {string} letter The letter to speak.
 * @param {string} word The word associated with the letter.
 */
function speakPhrase(letter, word) {
    if ('speechSynthesis' in window) {
        const phrase = `${letter} for ${word}`;
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.rate = 1.0; // Normal speech rate
        utterance.pitch = 1.2; // A slightly higher, friendly pitch
        window.speechSynthesis.speak(utterance);
    } else {
        console.log('Text-to-speech not supported in this browser.');
    }
}

/**
 * Toggles the pause state of the game.
 */
function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        this.physics.pause();
        this.letterSpawnTimer.paused = true;
        pauseText = this.add.text(config.width / 2, config.height / 2, 'Paused', {
            fontSize: '64px',
            fill: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    } else {
        this.physics.resume();
        this.letterSpawnTimer.paused = false;
        if (pauseText) {
            pauseText.destroy();
        }
    }
}

/**
 * Displays text corresponding to the caught letter.
 * This is a more robust way to display text with a background.
 * @param {string} word The word to display.
 * @param {string} letter The letter that was caught (e.g., 'A').
 */
function displayTextForLetter(word, letter) {
    // Clear previous text and background
    if (this.currentText) {
        this.currentText.destroy();
    }
    if (this.textBg) {
        this.textBg.destroy();
    }

    const message = `${letter} for ${word}`;
    
    // Create the text object first to get its dimensions
    this.currentText = this.add.text(config.width / 2, config.height / 2, message, {
        fontSize: '48px',
        fill: '#FFFFFF',
        fontStyle: 'bold',
        align: 'center'
    }).setOrigin(0.5);

    // Now create a graphics object for the background
    this.textBg = this.add.graphics();
    this.textBg.fillStyle(0x000000, 0.7);
    // Position and size the background based on the text's bounds
    const textBounds = this.currentText.getBounds();
    this.textBg.fillRect(textBounds.x - 10, textBounds.y - 10, textBounds.width + 20, textBounds.height + 20);

    // Ensure the text is on top of its background
    this.currentText.setDepth(1);
    this.textBg.setDepth(0);

    this.time.delayedCall(5000, () => {
        if (this.currentText && this.currentText.active) {
            this.currentText.destroy();
            this.currentText = null;
        }
        if (this.textBg && this.textBg.active) {
            this.textBg.destroy();
            this.textBg = null;
        }
    }, [], this);
}

function triggerWin() {
    if (gameOver) return; // Don't trigger if game is already over
    gameOver = true;
    this.physics.pause();

    // Display "You Win!" text
    this.add.text(config.width / 2, config.height / 2 - 50, 'You Win!', {
        fontSize: '80px',
        fill: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 8
    }).setOrigin(0.5);

    // Display restart text
    this.add.text(config.width / 2, config.height / 2 + 50, 'Press Space to Play Again', {
        fontSize: '32px',
        fill: '#ffffff'
    }).setOrigin(0.5);

    // Create confetti emitter
    this.add.particles(0, 0, 'p0', {
        x: config.width / 2,
        y: -10,
        angle: { min: 10, max: 170 },
        speed: 300,
        gravityY: 200,
        lifespan: 4000,
        quantity: 3,
        scale: { start: 1, end: 0.2 },
        blendMode: 'ADD',
        texture: [ 'p0', 'p1', 'p2', 'p3', 'p4' ]
    });

    this.input.keyboard.once('keydown-SPACE', () => {
        score = 0;
        this.scene.restart();
    });
} 