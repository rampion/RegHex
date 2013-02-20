// TODO: get rid of IDs, so we can have multiple in a page

$.fn.addClassSVG = function(klasses){
  return this.each(function(){
    var curr = this.getAttribute('class');
    klasses.split(' ').forEach(function(klass){
      if (!curr.match(new RegExp('\\b'+klass+'\\b')))
        curr += ' ' + klass;
    });
    this.setAttribute('class', curr);
  });
}

$.fn.removeClassSVG = function(klasses){
  return this.each(function(){
    var curr = this.getAttribute('class');
    klasses.split(' ').forEach(function(klass){
      curr = curr.replace(new RegExp(' '+klass+'\\b|\\b'+klass+'(?: |$)'), '');
    });
    this.setAttribute('class', curr);
  });
}

// see the ids for each cell and edge
function showCoords(){
  $('[class~=edge] text,[class~=cell] text').text(function(){ 
    return $(this).data('coords');
  }).css('font-size', '7pt');
}

function loadPuzzle(puzzle) {
  // clear anything prior
  $('#cells').empty();
  $('#edges').empty();

  if (puzzle.edgeLen <= 0) return;
  
  var dX = 10*Math.sqrt(3),
      dY = 10,
      $template = {
        cell: $('#cell-template'),
        edge: $('#edge-template')
      },
      $parent = {
        cell: $('#cells'),
        edge: $('#edges')
      },
      neighbors = [ 
        { to: '-a', from: '+a', dA: -2, dB: +1, dC: +1 },
        { to: '+a', from: '-a', dA: +2, dB: -1, dC: -1 },
        { to: '-b', from: '+b', dA: +1, dB: -2, dC: +1 },
        { to: '+b', from: '-b', dA: -1, dB: +2, dC: -1 },
        { to: '-c', from: '+c', dA: +1, dB: +1, dC: -2 },
        { to: '+c', from: '-c', dA: -1, dB: -1, dC: +2 },
      ],
      hexes = {};

  function create(type, a, b, c, rotate){
    var h = $template[type].clone(),
        x = [a,b,c].join(','),
        t = h.find('text');

    // place the hex in the correct position
    h.attr({
      transform: 'translate('+(dX*b)+','+(dY*(c-a))+')' + (type == 'edge' ? ' rotate('+rotate+')' : ''),
    });
    $parent[type].append(h);

    h.find('text').data('coords', x); // for showCoords

    // note down its adjacencies
    hexes[x] = h;
    neighbors.forEach(function(o){
      var n = hexes[ [a+o.dA,b+o.dB,c+o.dC].join(',') ];
      if (n) {
        h.data( o.to,   n );
        n.data( o.from, h );
      }
    });

    // fill in the blanks
    if (puzzle.clues[x]){
      h.addClassSVG('clue').
        removeClassSVG('selectable').
        find('text').text(puzzle.clues[x]);
    }
  }

  // create all 1 + z*(z-1)*(z-1)/2 cells
  //        and 3 + 6*(z-1) edges
  var z = puzzle.edgeLen;
  create('cell', 0, 0, 0);
  create('edge', -2*z, z, z, 240 );
  create('edge', z, -2*z, z, 0   );
  create('edge', z, z, -2*z, 120 );
  for (var k = 1; k < z; k++){
    for (var t = 0; t < k; t++){
      create('cell', +2*k-t, -k+2*t, -k-t);
      create('cell', -2*k+t, +k-2*t, +k+t);
      create('cell', -k-t, +2*k-t, -k+2*t);
      create('cell', +k+t, -2*k+t, +k-2*t);
      create('cell', -k+2*t, -k-t, +2*k-t);
      create('cell', +k-2*t, +k+t, -2*k+t);
    }
    create('edge', -2*z+k, z-2*k, z+k, 240 );
    create('edge', -2*z+k, z+k, z-2*k, 240 );
    create('edge', z+k, -2*z+k, z-2*k, 0 );
    create('edge', z-2*k, -2*z+k, z+k, 0 );
    create('edge', z-2*k, z+k, -2*z+k, 120 );
    create('edge', z+k, z-2*k, -2*z+k, 120 );
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
  function check($cell){/*
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
  */};

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
