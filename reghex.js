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

      // ids are used for the puzzle clues
      $a.attr('id','A'+j+i);
      $b.attr('id','B'+j+i);
      $c.attr('id','C'+j+i);

      // some of the edge clues need to be rotated
      if (isEdge) {
        $a.attr('transform', $a.attr('transform') + ' rotate(240)');
        $c.attr('transform', $c.attr('transform') + ' rotate(120)');
      }
    }
  }

  // load puzzle clues into the cells and edges
  for (var id in puzzle.clues) {
    var $g = $('#'+id);
    // mark this as a clue
    $g.attr('class', $g.attr('class').replace(' selectable','') + ' clue');
    $('text', $g).text(puzzle.clues[id]);
  }
}
function loadUI(){
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
  };

  // click the buttons at the top of the page to rotate the grid
  $('#widdershins,#clockwise').click(function(e){
    e.preventDefault();
    rotate(this.id);
  });

  // click to select a cell
  $('#cells').on('click', '[class="cell selectable"]', function(e){
    $('[class="cell selected"]').attr('class', 'cell selectable');
    this.setAttribute('class', 'cell selected');
    e.stopPropagation();
  });

  // click away to clear selection
  $(document).click(function(e){
    $('[class="cell selected"]').attr('class', 'cell selectable');
  });

  // use keys to
  //  * enter text
  //  * delete text
  //  * finish selection
  //  * rotate grid
  $(document).keypress(function(e){
    var selected = $('[class="cell selected"]')[0];
    var selected_text = selected ? $('text', selected)[0] : null;

    switch (e.keyCode){
    case 13: /* enter */
      if (selected)
        selected.setAttribute('class', 'cell selectable');
      return;
    case 37: /* left */   
      rotate('widdershins'); 
      return;
    case 39: /* right */  
      rotate('clockwise'); 
      return;
    case  8: /* backspace */ 
      if (selected_text)
        selected_text.textContent = selected_text.textContent.replace(/.$/,'');
      return;
    case 0: 
      if (selected_text)
        selected_text.textContent += String.fromCharCode(e.charCode);
      return;
    }
  });
}
