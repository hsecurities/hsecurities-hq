import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { PlayerState } from '../types';

export class CampusScene extends Phaser.Scene {
  private socket!: Socket;
  private localPlayer!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { [key: string]: Phaser.Input.Keyboard.Key };
  private otherPlayers: Map<string, { sprite: Phaser.Physics.Arcade.Sprite; nameText: Phaser.GameObjects.Text }> = new Map();
  private nameLabel!: Phaser.GameObjects.Text;
  private roleBadge!: Phaser.GameObjects.Text;
  private currentRoom: string = 'reception';
  private onInteractCallback?: (zoneName: string) => void;
  private map!: Phaser.Tilemaps.Tilemap;

  constructor() {
    super({ key: 'CampusScene' });
  }

  public init(data: { socket: Socket; initialRoom: string; onInteract: (zone: string) => void }) {
    this.socket = data.socket;
    this.currentRoom = data.initialRoom || 'reception';
    this.onInteractCallback = data.onInteract;
  }

  preload() {
    // Load map and tilesets
    this.load.tilemapTiledJSON('campusMap', '/hq.tmj');
    this.load.image('WA_Room_Builder', '/tilesets/WA_Room_Builder.png');
    this.load.image('WA_Tables', '/tilesets/WA_Tables.png');
    this.load.image('WA_Seats', '/tilesets/WA_Seats.png');
    this.load.image('WA_Special_Zones', '/tilesets/WA_Special_Zones.png');
    this.load.image('WA_Other_Furniture', '/tilesets/WA_Other_Furniture.png');
    this.load.image('WA_Miscellaneous', '/tilesets/WA_Miscellaneous.png');
    this.load.image('WA_Decoration', '/tilesets/WA_Decoration.png');
    this.load.image('WA_Exterior', '/tilesets/WA_Exterior.png');
    this.load.image('WA_Logo_Long', '/tilesets/WA_Logo_Long.png');
    this.load.image('WA_User_Interface', '/tilesets/WA_User_Interface.png');

    // Create simple avatar texture dynamically if sprite not loaded
    const graphics = this.make.graphics({ x: 0, y: 0 });
    // Cyber suit body
    graphics.fillStyle(0x0066FF, 1);
    graphics.fillCircle(16, 16, 14);
    // Face / visor
    graphics.fillStyle(0x38BDF8, 1);
    graphics.fillRoundedRect(6, 10, 20, 8, 3);
    // Core badge
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.fillCircle(16, 20, 3);
    graphics.generateTexture('player_avatar', 32, 32);
    graphics.destroy();
  }

  create() {
    // 1. Build Tilemap
    this.map = this.make.tilemap({ key: 'campusMap' });

    // Link tilesets
    const tsRoomBuilder = this.map.addTilesetImage('WA_Room_Builder', 'WA_Room_Builder');
    const tsTables = this.map.addTilesetImage('WA_Tables', 'WA_Tables');
    const tsSeats = this.map.addTilesetImage('WA_Seats', 'WA_Seats');
    const tsSpecial = this.map.addTilesetImage('WA_Special_Zones', 'WA_Special_Zones');
    const tsOther = this.map.addTilesetImage('WA_Other_Furniture', 'WA_Other_Furniture');
    const tsMisc = this.map.addTilesetImage('WA_Miscellaneous', 'WA_Miscellaneous');
    const tsDecor = this.map.addTilesetImage('WA_Decoration', 'WA_Decoration');
    const tsExt = this.map.addTilesetImage('WA_Exterior', 'WA_Exterior');
    const tsLogo = this.map.addTilesetImage('WA_Logo_Long', 'WA_Logo_Long');

    const allTilesets = [
      tsRoomBuilder, tsTables, tsSeats, tsSpecial,
      tsOther, tsMisc, tsDecor, tsExt, tsLogo
    ].filter(Boolean) as Phaser.Tilemaps.Tileset[];

    // Render layers
    this.map.createLayer('floor1', allTilesets, 0, 0);
    this.map.createLayer('floor2', allTilesets, 0, 0);
    
    const wallsLayer = this.map.createLayer('walls1', allTilesets, 0, 0);
    this.map.createLayer('walls2', allTilesets, 0, 0);

    const furnLayer = this.map.createLayer('furniture1', allTilesets, 0, 0);
    this.map.createLayer('furniture2', allTilesets, 0, 0);
    this.map.createLayer('furniture3', allTilesets, 0, 0);

    // Collision layer
    const collLayer = this.map.createLayer('collisions', allTilesets, 0, 0);
    if (collLayer) {
      collLayer.setCollisionByExclusion([0, -1]);
      collLayer.setVisible(false); // Invisible collision boundary
    }

    // 2. Spawn Local Player at Reception (1600, 2016)
    this.localPlayer = this.physics.add.sprite(1600, 2016, 'player_avatar');
    this.localPlayer.setCollideWorldBounds(true);
    this.localPlayer.setSize(24, 24);

    if (collLayer) {
      this.physics.add.collider(this.localPlayer, collLayer);
    }

    // Name label and Role badge
    this.nameLabel = this.add.text(1600, 1990, 'You', {
      fontSize: '11px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      backgroundColor: '#0B1220AA',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    // 3. Camera Controls
    this.cameras.main.startFollow(this.localPlayer, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    // Render above layer (so player walks under doorframes/trees)
    const aboveLayer = this.map.createLayer('above1', allTilesets, 0, 0);
    if (aboveLayer) aboveLayer.setDepth(10);
    const aboveLayer2 = this.map.createLayer('above2', allTilesets, 0, 0);
    if (aboveLayer2) aboveLayer2.setDepth(11);

    // 4. Keyboard Controls (Arrows + WASD)
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    }) as any;

    // 5. Socket Events
    this.setupSocketEvents();

    // Notify server of initial join
    this.socket.emit('player:join_room', {
      roomId: this.currentRoom,
      x: this.localPlayer.x,
      y: this.localPlayer.y
    });
  }

  private setupSocketEvents() {
    // Current players already in room
    this.socket.on('room:current_players', ({ players }: { players: PlayerState[] }) => {
      players.forEach(p => this.addOtherPlayer(p));
    });

    // New player arrived
    this.socket.on('player:joined', ({ player }: { player: PlayerState }) => {
      this.addOtherPlayer(player);
    });

    // Other player moved
    this.socket.on('player:moved', ({ socketId, x, y }) => {
      const p = this.otherPlayers.get(socketId);
      if (p) {
        // Smooth interpolation
        this.tweens.add({
          targets: [p.sprite, p.nameText],
          x,
          y: (target: any) => (target === p.nameText ? y - 26 : y),
          duration: 100,
          ease: 'Linear'
        });
      }
    });

    // Player left
    this.socket.on('player:left', ({ socketId }) => {
      const p = this.otherPlayers.get(socketId);
      if (p) {
        p.sprite.destroy();
        p.nameText.destroy();
        this.otherPlayers.delete(socketId);
      }
    });
  }

  private addOtherPlayer(player: PlayerState) {
    if (this.otherPlayers.has(player.socketId)) return;

    const sprite = this.physics.add.sprite(player.x, player.y, 'player_avatar');
    sprite.setTint(0x38BDF8); // Cyan tint for other players

    const nameText = this.add.text(player.x, player.y - 26, `${player.name} (${player.roleName})`, {
      fontSize: '10px',
      color: '#38BDF8',
      backgroundColor: '#0B1220CC',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    this.otherPlayers.set(player.socketId, { sprite, nameText });
  }

  update() {
    if (!this.localPlayer) return;

    const speed = 180;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasdKeys.left.isDown) {
      vx = -speed;
    } else if (this.cursors.right.isDown || this.wasdKeys.right.isDown) {
      vx = speed;
    }

    if (this.cursors.up.isDown || this.wasdKeys.up.isDown) {
      vy = -speed;
    } else if (this.cursors.down.isDown || this.wasdKeys.down.isDown) {
      vy = speed;
    }

    // Normalize diagonal velocity
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.localPlayer.setVelocity(vx, vy);

    // Keep name label aligned
    this.nameLabel.setPosition(this.localPlayer.x, this.localPlayer.y - 26);

    // Emit movement if changed
    if (vx !== 0 || vy !== 0) {
      this.socket.emit('player:move', {
        x: Math.round(this.localPlayer.x),
        y: Math.round(this.localPlayer.y)
      });
    }

    // Interactive Trigger (SPACE bar)
    if (Phaser.Input.Keyboard.JustDown(this.wasdKeys.space)) {
      this.checkInteractables();
    }
  }

  private checkInteractables() {
    const px = this.localPlayer.x;
    const py = this.localPlayer.y;

    // Check distance to key interactive zones
    // 1. Reception Welcome Kiosk (1600, 1800)
    if (Phaser.Math.Distance.Between(px, py, 1600, 1800) < 100) {
      if (this.onInteractCallback) this.onInteractCallback('welcomeKiosk');
    }
    // 2. CTF Scoreboard (2560, 200)
    else if (Phaser.Math.Distance.Between(px, py, 2560, 200) < 120) {
      if (this.onInteractCallback) this.onInteractCallback('ctfScoreboard');
    }
    // 3. Server Room SOC SIEM Console (1600, 260)
    else if (Phaser.Math.Distance.Between(px, py, 1600, 260) < 100) {
      if (this.onInteractCallback) this.onInteractCallback('socConsole');
    }
    // 4. Webinar Auditorium Screen (640, 200)
    else if (Phaser.Math.Distance.Between(px, py, 640, 200) < 140) {
      if (this.onInteractCallback) this.onInteractCallback('webinarScreen');
    }
    // 5. Training Hall Lab (640, 1400)
    else if (Phaser.Math.Distance.Between(px, py, 640, 1400) < 120) {
      if (this.onInteractCallback) this.onInteractCallback('trainingLab');
    }
    // 6. Career Job Board (2800, 1900)
    else if (Phaser.Math.Distance.Between(px, py, 2800, 1900) < 120) {
      if (this.onInteractCallback) this.onInteractCallback('careerBoard');
    }
  }
}
