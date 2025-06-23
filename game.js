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
}

function create() {
    gameOver = false;
    isPaused = false; // Reset pause state on restart
    letterSpeed = 1; // Reset speed on restart
    this.currentText = null; // To hold the currently displayed text
    this.textBg = null; // To hold the background for the text

    // Create player
    player = this.physics.add.sprite(400, 560, 'player');
    player.setCollideWorldBounds(true);
    player.setImmovable(true); // Player shouldn't be moved by physics

    // Create a group for letters
    letters = this.physics.add.group();

    // Setup collision between player and letters
    this.physics.add.collider(player, letters, (player, letterContainer) => {
        const caughtLetter = letterContainer.letter;
        score += 10;
        scoreText.setText('Score: ' + score);
        
        const word = letterMap[caughtLetter];
        displayTextForLetter.call(this, word, caughtLetter);
        speakPhrase(caughtLetter, word); // Speak the full phrase

        letterContainer.destroy();
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

    // Spawn a new letter every 1.5 seconds
    this.letterSpawnTimer = this.time.addEvent({
        delay: 1500,
        callback: spawnLetter,
        callbackScope: this,
        loop: true,
    });

    // Add pause key listener
    this.input.keyboard.on('keydown-P', togglePause, this);

    // Add speed control listeners
    this.input.keyboard.on('keydown-UP', () => {
        if (letterSpeed < 5) {
            letterSpeed += 1;
            speedText.setText(`Speed: ${letterSpeed}x`);
        }
    });
    this.input.keyboard.on('keydown-DOWN', () => {
        if (letterSpeed > 1) {
            letterSpeed -= 1;
            speedText.setText(`Speed: ${letterSpeed}x`);
        }
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
    letterContainer.body.velocity.y = Phaser.Math.Between(40, 100) * letterSpeed;
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
    this.letterSpawnTimer.remove();

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
    if (gameOver) {
        return;
    }
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

    this.time.delayedCall(2000, () => {
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