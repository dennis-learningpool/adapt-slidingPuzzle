/*
* adapt-slidingPuzzle
* License - http://github.com/adaptlearning/adapt_framework/LICENSE
* Maintainers - Dennis Heaney <dennis@learningpool.com>
*/
define(function(require) {

  var ComponentView = require("coreViews/componentView");
  var Adapt = require('coreJS/adapt');

  // sliding tile object
  function SlidingTile (options) {
    return _.extend({
        className: 'slidingPuzzle-tile',
        src: null, // the image to use in the source
        el: null,
        x: 0, // actual x position on puzzle
        y: 0, // actual y position on puzzle
        srcX: 0, // x position on image of this tile
        srcY: 0, // y position on image of this tile
        width: 0,
        height: 0,
        column: -1, // correct column of this tile
        row: -1, // correct row of this tile
        visible: true, // if true, draw this tile
        target: {},

        /**
         * returns a comma separated rect spec suitable for
         * use in a css clip style
         */
        getRect: function () {
          return [
            this.srcY + 'px',
            this.srcX + this.width + 'px',
            this.srcY + this.height + 'px',
            this.srcX + 'px'
          ].join(',');
        },

        /**
         * builds the img element for this tile and returns it
         * ready for use in $.append
         */
        renderElement: function (container) {
          // remove img if already rendered
          if (this.el) {
            this.el.remove();
          }

          // create image element
          var img = $('<img>');
          img.attr('src', this.src);
          img.css('clip', 'rect(' + this.getRect() + ')');
          img.css('left', -this.srcX + 'px');
          img.css('top', -this.srcY + 'px');

          // create element (the tile)
          var el = $('<div>');
          el.attr('class', this.className);
          el.css('left', this.x);
          el.css('top', this.y);
          this.el = el;

          this.el.append(img);
          this.setVisible(this.visible);

          container.append(this.el);

          return this.el;
        },

        /**
         * toggles display of the tile
         */
        setVisible: function (visible) {
          this.visible = visible;
          if (this.el) {
            this.el.css('opacity', (this.visible ? '100' : '0'));
          }
        },

        /**
         * sets the target x and y for this tile
         *
         */
        setTarget: function (target) {
          this.target.x = target.x;
          this.target.y = target.y;

          // immediately set to position
          if (this.el) {
            this.el.css('left', this.target.x);
            this.el.css('top', this.target.y);
          }
        }
      }, options);
  }

  var SlidingPuzzle = ComponentView.extend({

    events: {
      'click .slidingPuzzle-puzzle': 'attemptMove',
      'click .slidingPuzzle-widget .button.reset': 'onResetClicked',
      'click .slidingPuzzle-widget .button.model': 'onShowSolutionClicked'
    },

    _columns: 1,

    _rows: 1,

    _tiles: [],

    img: false,

    context: false,

    _debounceTime: 250,

    _debouncing: false,

    preRender: function () {
      this.listenTo(Adapt, 'device:changed', this.resizePuzzle);
    },

    postRender: function () {
      this.resizePuzzle(Adapt.device.screenSize);
    },

    resizePuzzle: function (width) {
      var img = this.$('.slidingPuzzle-widget img');
      img.attr('src', img.attr('data-' + width));

      this.$('.slidingPuzzle-widget').imageready(_.bind(function (imgEl) {
        this.resetPuzzle(imgEl);
      }, this, img.get(0)));
    },

    resetPuzzle: function (img) {
      var graphic = this.model.get('graphic');
      var puzzle = this.$('.slidingPuzzle-puzzle');
      puzzle.html('');
      this.img = img;

      // set up the puzzle board
      puzzle.css('width', this.img.width + 'px');
      puzzle.css('height', this.img.height + 'px');
      this._columns = this.model.get('dimension') || this._columns;
      this._rows = this.model.get('dimension') || this._rows;
      this._tiles = this.fetchTiles(this.img, this._columns, this._rows);

      // show/hide buttons
      this.$('.slidingPuzzle-widget .button.reset').hide();
      if (this.model.get('allowSkip')) {
        this.$('.slidingPuzzle-widget .button.model').show();
      }

      this.renderTiles(puzzle);

      // get debounce time from transition time
      var transTime = parseFloat(this.$('.slidingPuzzle-tile').first().css('transition-duration'), 10);
      this._debounceTime = transTime ? transTime * 1000 : this._debounceTime;


      this.setReadyStatus();
    },

    showAll: function () {
      for (var row = 0; row < this._tiles.length; ++row) {
        for (var col = 0; col < this._tiles[row].length; ++col) {
          var tile = this._tiles[row][col];
          tile.setTarget({x:tile.srcX, y:tile.srcY});
          tile.setVisible(true);
        }
      }
    },

    renderTiles: function (el) {
      for (var row = 0; row < this._tiles.length; ++row) {
        for (var col = 0; col < this._tiles[row].length; ++col) {
          this._tiles[col][row].renderElement(el);
        }
      }
    },

    fetchTiles: function (img, dimensionX, dimensionY) {
      var tiles = [];
      var tileWidth = Math.floor(img.width / (dimensionX || 1));
      var tileHeight = Math.floor(img.height / (dimensionY || 1));
      var col = 0;
      var row = 0;
      for (col = 0; col < dimensionX; ++col) {
        for (row = 0; row < dimensionY; ++row) {
          tiles.push(new SlidingTile({ src: img.src, srcX: col*tileWidth, srcY: row*tileHeight, width: tileWidth, height: tileHeight, column: col, row: row }));
        }
      }

      var randomTiles = [];
      var index = 0;
      while (tiles.length > 0) {
        if (index % dimensionX === 0) {
          randomTiles.push([]);
        }
        var t = tiles.splice(Math.floor(Math.random()*tiles.length), 1)[0];
        col = index % dimensionX;
        row = Math.floor(index / dimensionY);
        if (tiles.length !== 0) {
          t.x = col * t.width;
          t.y = row * t.height;
          t.setVisible(true);
        } else {
          t.setVisible(false); // make the last tile invisible
        }
        randomTiles[row].push(t);
        ++index;
      }

      return randomTiles;
    },

    attemptMove: function (e) {
      if (this._debouncing) {
        return;
      }
      var puzzlePos = this.$('.slidingPuzzle-puzzle').offset();
      var mouseX = e.pageX - Math.round(puzzlePos.left);
      var mouseY = e.pageY - Math.round(puzzlePos.top);
      var cellX = Math.floor(mouseX/this.img.width * this._columns);
      var cellY = Math.floor(mouseY/this.img.height * this._rows);
      if (this._tiles[cellY][cellX]) {
        var freeCell = false;
        // check if we can move to any postion
        // up or down?
        for (var row = 0; row < this._rows; ++row) {
          if (row === cellY) { // ignore self
            continue;
          }

          if (!this._tiles[row][cellX].visible) {
            // boom, found a free cell
            freeCell = {col: cellX, row: row};
            break
          }
        }

        if (!freeCell) {
          // check left and right
          for (var col = 0; col < this._columns; ++col) {
            if (col === cellX) { // ignore self
              continue;
            }

            if (!this._tiles[cellY][col].visible) {
              // boom, found a free cell
              freeCell = {col: col, row: cellY};
              break;
            }
          }
        }

        if (freeCell) {
          var tile = false;
          // move multiple tiles if we can
          if (freeCell.col === cellX) { // same column
            var direction = freeCell.row > cellY ? -1 : 1;
            for (; freeCell.row >= 0 && freeCell.row != this._rows; freeCell.row += direction) {
              var currentRow = freeCell.row + direction;
              tile = this._tiles[currentRow][cellX];
              tile.setTarget({x: cellX * tile.width, y: freeCell.row * tile.height});
              // swap tiles
              this.swapTiles(currentRow, cellX, freeCell.row, cellX);
              // stop when we reach the clicked cell
              if (currentRow === cellY) {
                break;
              }
            }
          } else { // same row
            var direction = freeCell.col > cellX ? -1 : 1;
            for (; freeCell.col >= 0 && freeCell.col != this._columns; freeCell.col += direction) {
              var currentCol = freeCell.col + direction;
              tile = this._tiles[cellY][currentCol];
              tile.setTarget({x: freeCell.col * tile.width, y: cellY * tile.height});
              // swap tiles
              this.swapTiles(cellY, currentCol, cellY, freeCell.col);
              // stop when we reach the clicked cell
              if ((freeCell.col + direction) === cellX) {
                break;
              }
            }
          }
          this.debounce();
        }

        // assess completion!
        if (this.checkPuzzle()) {
          // w00t! player got skillz
          this.solve();
        }
      }
    },

    debounce: function () {
      this._debouncing = true;
      setTimeout(_.bind(function () { this._debouncing = false; }, this), this._debounceTime);
    },

    solve: function () {
      this.$('.slidingPuzzle-widget .button.model').hide();
      this.$('.slidingPuzzle-widget .button.reset').show();
      this.showAll();
      this.puzzleComplete();
    },

    onResetClicked: function (e) {
      e.preventDefault();
      this.resetPuzzle(this.img);
    },

    onShowSolutionClicked: function (e) {
      e.preventDefault();
      this.solve();
    },

    swapTiles: function (row1, col1, row2, col2) {
      var temp = this._tiles[row1][col1];
      this._tiles[row1][col1] = this._tiles[row2][col2];
      this._tiles[row2][col2] = temp;
    },

    checkPuzzle: function () {
      for (var row = 0; row < this._tiles.length; ++row) {
        for (var col = 0; col < this._tiles[row].length; ++col) {
          var tile = this._tiles[row][col];
          if (tile.column !== col || tile.row !== row) {
            // not in order
            return false;
          }
        }
      }
      return true;
    },

    puzzleComplete: function () {
      this.setCompletionStatus();
    }

  });

  Adapt.register('slidingPuzzle', SlidingPuzzle);

  return SlidingPuzzle;

});
