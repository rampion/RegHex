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
  $cell.attr('class', 'cell selectable');
  $edge.attr('class', 'edge');

  function mkID(code, j, i){ return code+'-'+j+'-'+i; };

  // clone the templates to create a puzzle of the appropriate size
  for (var j = 0; j <= puzzle.edgeLen; j++){
    for (var i = 1; i <= puzzle.edgeLen; i++){

      // the edges have spots for clues
      if (i == puzzle.edgeLen && j == 0) continue; // except this one
      var isEdge = (j == puzzle.edgeLen || i == puzzle.edgeLen);
      var $donor = isEdge ? $edge : $cell;

      // pack the hexagons side by side
      var $a = $donor.clone().attr('transform', 'translate('+(10*(2*i-j)*Math.sqrt(3)) +','+(21*j*Math.sqrt(2))+')'),
          $b = $donor.clone().attr('transform', 'translate('+(10*(-i-j)*Math.sqrt(3))  +','+(21*(i-j)*Math.sqrt(2))+')'),
          $c = $donor.clone().attr('transform', 'translate('+(10*(-i+2*j)*Math.sqrt(3))+','+(21*(-i)*Math.sqrt(2))+')');

      $donor.parent().append( $a, $b, $c );

      $a.attr('id', mkID('A',j,i));
      $b.attr('id', mkID('B',j,i));
      $c.attr('id', mkID('C',j,i));

      if (isEdge) {
        // some of the edge clues need to be rotated
        $a.attr('transform', $a.attr('transform') + ' rotate(240)');
        $c.attr('transform', $c.attr('transform') + ' rotate(120)');
      }
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
    $g.attr('class', $g.attr('class').replace(' selectable','') + ' clue');
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
    $('[class~="selected"]').attr('class', 'cell selectable');
    this.setAttribute('class', 'cell selected');
    e.stopPropagation();
  });

  // click away to clear selection
  $(document).click(function(e){
    $('[class~="selected"]').attr('class', 'cell selectable');
  });

  function check(cell){
  };

  // use keys to
  //  * enter text
  //  * delete text
  //  * finish selection
  //  * rotate grid
  $(document).keypress(function(e){
    var selected = $('[class~="selected"]')[0];
    var selected_text = selected ? $('text', selected)[0] : null;

    switch (e.keyCode){
    case 27: // escape
    case 13: // enter
      if (selected) {
        selected.setAttribute('class', 'cell selectable');
        return false;
      }
    case 37: // left
      rotate('widdershins'); 
      return false;
    case 39: // right
      rotate('clockwise'); 
      return false;
    case  8: // backspace
      if (selected_text) {
        selected_text.textContent = '';
        check(this);
      }
    case 0: 
      if (selected_text) {
        // a-z => A-Z
        // toggle letters
        var c = (65 <= e.charCode && e.charCode <= 90)  ? String.fromCharCode(e.charCode)
              : (97 <= e.charCode && e.charCode <= 122) ? String.fromCharCode(e.charCode).toUpperCase()
              : null;
        if (!c) return;
        t = selected_text.textContent;
        selected_text.textContent = (t.indexOf(c) >= 0) ? t.replace(c,'') : t + c;
        check(this);
      }
    }
  });
}
