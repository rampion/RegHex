// jQuery.fn.addClass doesn't work with svg elements
$.fn.addClassSVG = function(klasses){
  return this.each(function(){
    var curr = this.getAttribute('class');
    if (curr){
      klasses.split(' ').forEach(function(klass){
        if (!curr.match(new RegExp('\\b'+klass+'\\b')))
          curr += ' ' + klass;
      });
    } else {
      curr = klasses;
    }
    this.setAttribute('class', curr);
  });
}

// jQuery.fn.removeClass doesn't work with svg elements
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
function showCoords($svg){
  $('[class~=edge] text,[class~=cell] text', $svg).text(function(){ 
    return $(this).data('coords');
  }).css('font-size', '7pt');
}

// given an regexp expression (as a string), return a regexp expression (as a
// string) that admits blank squares (represented by the underscore character, _ )
function AddRegExpBlanks(re) {
  var result = ''
  var state = 0  // 0 = scanning, 1 = just saw '[', 2 = looking for ']', case 3 = just saw '\'
  var i
  for (i=0; i < re.length; i++) {
    var c = re[i];
    switch (state) {
      case 3: // just saw \ escape. copy character verbatim
        result += c;
        state = 0;
        break;
      case 1: // just saw [. if not a negation, insert underscore
        if (c !== '^') {
          result += '_';
        }
        result += c;
        state = 2;
        break;
      case 2: // inside bracket. copy until we see a ]
        result += c;
        if (c === ']') {
          state = 0;
        }
        break;
      case 0: // normal situation
        if ('^$.*+()|?{},[\\'.includes(c)) {
          // special characters
          result += c;
          if (c === '\\') {
            state = 3;
          } else if (c === '[') {
            state = 1;
          }
        } else {
          result += '(?:' + c + '|_)'
        }
        break;
    }
  }
  return result;
}

function loadPuzzleInto($svg) { 
  function loadPuzzle(puzzle) {
    // set the dimensions
    $svg.attr({
      height: puzzle.height,
      width: puzzle.width,
    }).show();
    $('[class~=root]', $svg).attr(
      'transform', 'translate('+(puzzle.width/2)+','+(puzzle.height/2)+')'
    );
    $('[class~=buttons]', $svg).attr(
      'x', puzzle.width/2
    );

    // clear anything prior
    $('[class~=cells]', $svg).empty();
    $('[class~=edges]', $svg).empty();

    if (puzzle.edgeLen <= 0) return;
    
    var dX = 10*Math.sqrt(3),
        dY = 10,
        $template = {
          cell: $('defs [class~=cell]', $svg),
          edge: $('defs [class~=edge]', $svg)
        },
        $parent = {
          cell: $('[class~=cells]', $svg),
          edge: $('[class~=edges]', $svg)
        },
        neighbors = [ 
          { to: '-A', from: '+A', dA: -2, dB: +1, dC: +1 },
          { to: '+A', from: '-A', dA: +2, dB: -1, dC: -1 },
          { to: '-B', from: '+B', dA: +1, dB: -2, dC: +1 },
          { to: '+B', from: '-B', dA: -1, dB: +2, dC: -1 },
          { to: '-C', from: '+C', dA: +1, dB: +1, dC: -2 },
          { to: '+C', from: '-C', dA: -1, dB: -1, dC: +2 },
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
  return loadPuzzle;
}

function loadUI($svg) {
  // disable the buttons during rotation
  var rotationEnabled = true;

  // Safari5 can't select animateTransform elements directly
  $svg.on('beginEvent', '[class~=rotation]', function(){ rotationEnabled = false; });
  $svg.on('endEvent',   '[class~=rotation]', function(){ rotationEnabled = true; });

  // rotate clockwise or widdershins with a click of the buttons
  var rotation = 0;
  function rotate(direction){
    if (rotationEnabled){
      var delta = (direction == 'clockwise') ? +120 : -120;
      $('[class~=rotation]', $svg).each(function(){
        // the wheel and the cars rotate in opposite directions to keep the text facing up.
        var sign = $(this).is('[class~=wheel]') ? +1 : -1;
        this.setAttribute('from', sign * rotation);
        this.setAttribute('to', sign * (rotation + delta));

        // Safari 5 : still flickers due to 
        //  https://bugs.webkit.org/show_bug.cgi?id=18450
        this.beginElement();
      });
      rotation += delta;
    }
  }

  // click the buttons at the top of the page to rotate the grid
  $('[class~=widdershins],[class~=clockwise]', $svg).click(function(e){
    e.preventDefault();
    rotate(this.getAttribute('class'));
  });

  // click to select a cell
  $('[class~=cells]', $svg).on('click', '[class~="selectable"]', function(e){
    $('[class~="selected"]', $svg).removeClassSVG('selected');
    $(this).addClassSVG('selected');
    e.stopPropagation();
  });

  // click away to clear selection
  $svg.click(function(e){
    $('[class~="selected"]', $svg).removeClassSVG('selected');
  });

  // see whether this cell is part of any full words,
  // and if so, whether they match the edge pattern
  function check($cell){
    ['A','B','C'].forEach(function(dim){
      var failure = dim+'-failure',
          success = dim+'-success',
          cells = [];

      var c, d;

      // find the edge regex
      for (c = $cell; d = c.data('-'+dim); c = d) ;
      var re_text = '^' + c.find('text').text() + '$';
      var regex = new RegExp(AddRegExpBlanks(re_text));

      // find the row text
      while ((c = c.data('+'+dim)) && c.is('[class~=cell]'))
        cells.push(c);

      var str = cells.map(function(cell){ var a = $('text', cell).text(); return a == '' ? '_' : a; }).join('');
      var $cells = $(cells).map(function(){ return this.toArray(); });

      if (str.match(regex)) {
        if (str.includes('_')) {
          // partial match
          $cells.removeClassSVG(success);
          $cells.removeClassSVG(failure);
        } else {
          // success
          $cells.addClassSVG(success);
          $cells.removeClassSVG(failure);
        }
      } else {
        // mismatch
        $cells.addClassSVG(failure);
        $cells.removeClassSVG(success);
      }
    });
  }

  // track whether we're focused on this svg
  $svg.hover(function(){
    $svg.addClassSVG('focused');
  }, function(){ 
    $svg.removeClassSVG('focused');
  });

  // use keys to
  //  * enter text
  //  * delete text
  //  * finish selection
  //  * rotate grid
  //  * move between hexes
  $(document).keydown(function(e){
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (! $svg.is('[class~=focused]') ) return;
    var $selected = $('[class~="selected"]', $svg);

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
    case 9: // tab
      if ($selected.length) {
        var r = rotation % 360;
        var $next = $selected.data(
          (e.shiftKey ? '-' : '+') + 
          (r == 120 ? 'A' : r == 0 ? 'B' : 'C')
        );
        if ($next && $next.is('[class~=selectable]')){
          $next.addClassSVG('selected');
          $selected.removeClassSVG('selected');
        }
        return false;
      }
    case  8: // backspace
      if ($selected.length) {
        $selected.find('text').text('');
        check($selected);
      }
      return false;
    default:
      // toggle letters
      var _A_ = 65, _Z_ = 90;
      if ($selected.length && _A_ <= e.keyCode && e.keyCode <= _Z_) {
        $selected.find('text').text(String.fromCharCode(e.keyCode));
        check($selected);
        return false;
      }
    }
  });
}
