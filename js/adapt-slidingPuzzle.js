/*
* adapt-slidingPuzzle
* License - http://github.com/adaptlearning/adapt_framework/LICENSE
* Maintainers - Dennis Heaney <dennis@learningpool.com>
*/
define(function(require) {

  var ComponentView = require("coreViews/componentView");
  var Adapt = require('coreJS/adapt');

  var SlidingPuzzle = ComponentView.extend({

    events: {
      'inview': 'inview'
    },

    preRender: function () {
      this.listenTo(Adapt, 'device:changed', this.resizePuzzle);
    },

    postRender: function () {
      this.resizePuzzle(Adapt.device.screenSize)
    },

    inview: function (e, visible) {
      if (visible) {
        console.log('In your view, stealing ur donuts');
      }
    },

    resizePuzzle: function (width) {
      this.drawPuzzle(width);
    },

    drawPuzzle: function (width) {
      var graphic = this.model.get('graphic');
      console.log(graphic);
      this.setReadyStatus();
    },

    puzzleComplete: function (e) {
      this.setCompletionStatus();
    }

  });

  Adapt.register('slidingPuzzle', SlidingPuzzle);

  return SlidingPuzzle;

});
