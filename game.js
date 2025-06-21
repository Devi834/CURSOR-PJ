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
    // Create player
    player = this.physics.add.sprite(400, 560, 'player');
    player.setCollideWorldBounds(true);
    player.setImmovable(true); // Player shouldn't be moved by physics

    // Create a group for letters
    letters = this.physics.add.group();

    // Setup collision between player and letters
    this.physics.add.collider(player, letters, (player, letterContainer) => {
        score += 10;
        scoreText.setText('Score: ' + score);
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

    // Spawn a new letter every 1.5 seconds
    this.letterSpawnTimer = this.time.addEvent({
        delay: 1500,
        callback: spawnLetter,
        callbackScope: this,
        loop: true,
    });

    // Listen for letters hitting the bottom of the screen
    this.physics.world.on('worldbounds', (body, up, down, left, right) => {
        if (body.gameObject.isLetter && down) {
            triggerGameOver.call(this);
        }
    });
}

function update() {
    if (gameOver) {
        return; // Stop all updates if game is over
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
    letterContainer.isLetter = true; // Flag this as a letter for game over detection

    // Add the new letter container to the group
    letters.add(letterContainer);

    // Set a random velocity for the falling letter
    letterContainer.body.velocity.y = Phaser.Math.Between(50, 150);
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