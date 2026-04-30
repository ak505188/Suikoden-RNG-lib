// Tile types as bit flags (combine with OR)
const TILE = {
  EMPTY:    0b00000000, // 0 - walkable
  WALL:     0b00000001, // 1 - solid
  BUILDING: 0b00000011, // 3 - solid
  BUSH:     0b00000101, // 5 - solid
  WATER:    0b00000111, // 7 - solid
  DOOR:     0b00001000, // 8 - conditional
  OOB:      0b10000000, // 128 - OOB
};

export default class Map {
  constructor() {
    this.TOP_BOUND = 0;
    this.BOTTOM_BOUND = 77;
    this.LEFT_BOUND = 7;
    this.RIGHT_BOUND = 77;
    this.WIDTH = 255;
    this.HEIGHT = this.BOTTOM_BOUND - this.TOP_BOUND;
    this.WIDTH = this.RIGHT_BOUND // Starting at 0 to keep array even
    this.MAP = new Uint8Array(this.WIDTH * this.HEIGHT);

    for (let x = 0; x < this.WIDTH; x++) {
      for (let y = 0; y < this.HEIGHT; y++) {
        if (x < this.LEFT_BOUND ||
            x > this.RIGHT_BOUND ||
            y < this.TOP_BOUND ||
            y > this.BOTTOM_BOUND) {
          this.setCell(x, y, TILE.OOB);
        }
      }
    }

    this.addWalls();
    this.addBlacksmith();
    this.addInn();
    this.addArmorShop();
    this.addItemShop();
    this.addTavern();
    this.addFlikHideout();

    this.addBushes();
  }

  getCell = (x, y) => this.MAP[y * this.WIDTH + x];
  setCell = (x, y, tile) => this.MAP[y * this.WIDTH + x] = tile;

  addWalls() {
    // OOB at top
    this.setCellsRectangle(0, this.RIGHT_BOUND, 0, 6, TILE.OOB);
    // Left Wall
    this.setCellsRectangle(0, 11, 0, this.BOTTOM_BOUND, TILE.WALL);
    // Clear gap by bottom left house
    this.setCellsRectangle(8, 11, 42, 45, TILE.EMPTY);
    this.setCellsRectangle(7, 8, 43, 44, TILE.EMPTY);

    // Water. This covers the dock too.
    this.setCellsRectangle(0, this.RIGHT_BOUND, 57, this.BOTTOM_BOUND, TILE.WALL);
    // Right Wall
    this.setCellsRectangle(69, this.RIGHT_BOUND, 0, this.BOTTOM_BOUND, TILE.WALL);

    // Clear Dock
    this.setCellsRectangle(13, 72, 56, 57, TILE.EMPTY);
    // Block 1 tile by bush by dock
    this.setCellsRectangle(12, 12, 56, 56, TILE.WALL);
    this.setCellsRectangle(16, 20, 57, 75, TILE.EMPTY);
    // Dock corners
    this.setCell(15, 57, TILE.WALL);
    this.setCell(21, 57, TILE.WALL);
    // Set Wall with stairs
    this.setCellsRectangle(this.LEFT_BOUND, this.RIGHT_BOUND, 46, 55, TILE.WALL);
    // Add stairs by dock
    this.setCellsRectangle(24, 26, 46, 55, TILE.EMPTY)
    // Add walls by top of stairs
    this.setCellsRectangle(22, 23, 43, 45, TILE.WALL);
    this.setCellsRectangle(27, 28, 43, 45, TILE.WALL);
    // Add stairs by Tavern
    this.setCellsRectangle(58, 60, 46, 55, TILE.EMPTY)
  }

  addBlacksmith() {
    const blacksmith_x1 = 12;
    const blacksmitH_x2 = 30;
    const blacksmith_y1 = 5;
    // This doesn't include the dip on the left, adding that afterwards
    const blacksmith_y2 = 10;

    this.setCellsRectangle(blacksmith_x1, blacksmitH_x2, blacksmith_y1, blacksmith_y2, TILE.BUILDING);
    this.setCellsRectangle(19, blacksmitH_x2, blacksmith_y2, blacksmith_y2+1, TILE.BUILDING);
  }

  addInn() {
    this.setCellsRectangle(47, 68, 6, 14, TILE.BUILDING);
    this.setCellsRectangle(53, 63, 14, 15, TILE.BUILDING);
  }

  addArmorShop() {
    this.setCellsRectangle(17, 31, 19, 27, TILE.BUILDING);
  }

  addItemShop() {
    this.setCellsRectangle(38, 50, 27, 35, TILE.BUILDING);
  }

  addTavern() {
    this.setCellsRectangle(54, 64, 37, 45, TILE.BUILDING);
  }

  addFlikHideout() {
    this.setCellsRectangle(8, 18, 33, 41, TILE.BUILDING);
  }

  addBushes() {
    const addBush = (x, y) => this.setCellsRectangle(x, x+2, y, y + 1, TILE.BUSH);
    // Bush by dock stairs
    addBush(27, 55, 1);
    // Bushes left of Tavern
    addBush(52, 44);
    addBush(46, 44);
    addBush(43, 43);
    addBush(45, 41);

    // Bush by Item Shop
    addBush(39, 36);

    // Bush by Inn
    addBush(67, 16);

    // Bush by Blacksmith
    this.setCellsRectangle(13, 15, 12, 12, TILE.BUSH);

  }


  setCellsRectangle = (x0, x1, y0, y1, tile) => {
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        this.setCell(x, y, tile);
      }
    }
  }

  cellHasCollision(x, y) {
    return this.getCell(x, y) % 2 === 1;
  }

  cellsHaveCollision(x0, x1, y0, y1) {
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        if (this.cellHasCollision(x, y)) {
          console.log(`Collision at ${x},${y}`);
          return true;
        }
      }
    }
    return false;
  }

  drawAscii() {
    const zeroPad = (num, places) => String(num).padStart(places, '0')
    for (let y = 0; y < this.HEIGHT; y++) {
      let str = '';
      for (let x = 0; x < this.WIDTH; x++) {
        const cell = this.getCell(x, y);
        let char;
        switch(cell) {
          case TILE.OOB:
            char = '-';
            break;
          case TILE.BUILDING:
            char = 'b';
            break;
          case TILE.WALL:
            char = '|';
            break;
          case TILE.BUSH:
            char = 'g';
            break;
          default:
            char = '0';
        }
        str += char;
      }
      console.log(`${zeroPad(y, 2)}-${str}`);
    }
  }
}
