// TODO: get rid of IDs, so we can have multiple in a page

$.fn.addClassSVG = function(klasses){
  this.each(function(){
    var curr = this.getAttribute('class');
    klasses.split(' ').forEach(function(klass){
      if (!curr.match(new RegExp('\\b'+klass+'\\b')))
        curr += ' ' + klass;
    });
    this.setAttribute('class', curr);
  });
}

$.fn.removeClassSVG = function(klasses){
  this.each(function(){
    var curr = this.getAttribute('class');
    klasses.split(' ').forEach(function(klass){
      curr = curr.replace(new RegExp(' '+klass+'\\b|\\b'+klass+'(?: |$)'), '');
    });
    this.setAttribute('class', curr);
  });
}

// see the ids for each cell and edge
function showIDs() {
  $('[class~=edge],[class~=cell]').each(function(){ $('text', this).text(this.id); }); 
}

function loadPuzzle(puzzle) {
  // grab these to use as templates
  var $cell = $('#cells > g:first-child');
  var $edge = $('#edges > g:first-child');

  // clear anything prior
  $('#cells').empty().append($cell);
  $('#edges').empty().append($edge);
  $('text', $cell).text('');
  $('text', $edge).text('');
  $cell.addClassSVG('cell selectable');
  $edge.addClassSVG('edge');

  function mkID(code, j, i){ return code+'-'+j+'-'+i; };

  // clone the templates to create a puzzle of the appropriate size
  for (var j = 0; j <= puzzle.edgeLen; j++){
    for (var i = 1; i <= puzzle.edgeLen; i++){

      // the edges have spots for clues
      if (i == puzzle.edgeLen && j == 0) continue; // except this one
      var isEdge = (j == puzzle.edgeLen || i == puzzle.edgeLen);
      var $donor = isEdge ? $edge : $cell;

      var u = 10*Math.sqrt(3),
          v = 21*Math.sqrt(2);

      // pack the hexagons side by side
      var $a = $donor.clone().attr('transform', 'translate('+(u*(2*i-j)) +','+(v*j)+')' + (isEdge ? ' rotate(240)' : '')),
          $b = $donor.clone().attr('transform', 'translate('+(u*(-i-j))  +','+(v*(i-j))+')'),
          $c = $donor.clone().attr('transform', 'translate('+(u*(-i+2*j))+','+(v*(-i))+')' + (isEdge ? ' rotate(120)' : ''));

      $donor.parent().append( $a, $b, $c );

      $a.attr('id', mkID('A',j,i));
      $b.attr('id', mkID('B',j,i));
      $c.attr('id', mkID('C',j,i));
    }
  }

  // create rows of cells for each edge
  $('[class~=cell]').each(function(){
    $(this).data('edges', []);
  });
  $('[class~=edge][id]').each(function(){
    var edge = this;
    var m = edge.id.match(/^([ABC])-(\d+)-(\d+)$/);
    var code = m[1];
    var jMax = parseInt(m[2]);
    var iMax = parseInt(m[3]);

    var nextThird = {'A':'B','B':'C','C':'A'};
    var prevThird = {'A':'C','B':'A','C':'B'};
    var z = puzzle.edgeLen;

    var cells = [];
    function push(code,j,i){ 
      cells.push( 
        i == 0 && j == 0 
          ? $cell 
          : document.getElementById(mkID(code,j,i))
      );
    }

    var i, j;
    // some number from the same prefix (decrease by (1,1))
    for (i = iMax - 1, j = jMax - 1; i > 0 && j >= 0; i--, j--) {
      push( code, j, i );
    }

    if (jMax > iMax) for (var k = 0; k < z; k++) {
      push( nextThird[code], k, jMax - iMax );
    } else for (var k = 1; k < z; k++) {
      push( prevThird[code], iMax - jMax, k );
    }

    $(edge).data('cells', cells);
    cells.forEach(function(cell){ 
      $(cell).data('edges').push(edge); 
    });
  });

  // load puzzle clues into the cells and edges
  for (var id in puzzle.clues) {
    var $g = $('#'+id);
    // mark this as a clue
    $g.addClassSVG('clue');
    $g.removeClassSVG('selectable');
    $('text', $g).text(puzzle.clues[id]);
  }
}

function loadUI() {
  // disable the buttons during rotation
  var rotationEnabled = true;
  $('animateTransform').on('beginEvent', function(){ rotationEnabled = false; });
  $('animateTransform').on('endEvent', function(){ rotationEnabled = true; });

  // rotate clockwise or widdershins with a click of the buttons
  var rotation = 0;
  function rotate(direction){
    if (rotationEnabled){
      var delta = (direction == 'clockwise') ? +120 : -120;
      $('animateTransform').each(function(){
        // the wheel and the cars rotate in opposite directions to keep the text facing up.
        var sign = (this.id == 'wheel') ? +1 : -1;
        this.setAttribute('from', sign * rotation);
        this.setAttribute('to', sign * (rotation + delta));
        this.beginElement();
      });
      rotation += delta;
    }
  }

  // click the buttons at the top of the page to rotate the grid
  $('#widdershins,#clockwise').click(function(e){
    e.preventDefault();
    rotate(this.id);
  });

  // click to select a cell
  $('#cells').on('click', '[class~="selectable"]', function(e){
    $('[class~="selected"]').removeClassSVG('selected');
    $(this).addClassSVG('selected');
    e.stopPropagation();
  });

  // click away to clear selection
  $(document).click(function(e){
    $('[class~="selected"]').removeClassSVG('selected');
  });

  // see whether this cell is part of any full words,
  // and if so, whether they match the edge pattern
  function check($cell){
    $cell.data('edges').forEach(function(edge){
      var cells = $(edge).data('cells');

      var failure = edge.id[0]+'-failure';
      var success = edge.id[0]+'-success';

      var regex = new RegExp('^'+$('text', edge).text()+'$');
      var str = cells.map(function(cell){ return $('text', cell).text(); }).join(''); 

      if (str.length < cells.length) {
        // incomplete
        $(cells).removeClassSVG(success);
        $(cells).removeClassSVG(failure);
      } else if (str.match(regex)) {
        // success
        $(cells).addClassSVG(success);
        $(cells).removeClassSVG(failure);
      } else {
        // failure
        $(cells).addClassSVG(failure);
        $(cells).removeClassSVG(success);
      }
    });
  };

  // use keys to
  //  * enter text
  //  * delete text
  //  * finish selection
  //  * rotate grid
  $(document).keypress(function(e){
    var $selected = $('[class~="selected"]');

    switch (e.keyCode){
    case 27: // escape
    case 13: // enter
      if ($selected.length) {
        $selected.removeClassSVG('selected');
        return false;
      }
    case 37: // left
      rotate('widdershins'); 
      return false;
    case 39: // right
      rotate('clockwise'); 
      return false;
    case  8: // backspace
      if ($selected.length) {
        $selected.find('text').text('');
        check($selected);
      }
      return false;
    case 0: 
      if ($selected.length) {
        // a-z => A-Z
        var _A_ = 65,
            _Z_ = 90,
            _a_ = 97,
            _z_ = 122;
        var c = (_A_ <= e.charCode && e.charCode <= _Z_) ? String.fromCharCode(e.charCode)
              : (_a_ <= e.charCode && e.charCode <= _z_) ? String.fromCharCode(e.charCode).toUpperCase()
              : null;
        if (!c) return;
        // toggle letters
        $selected.find('text').text(c);
        check($selected);
        return false;
      }
    }
  });
}
