(function(){
  var SEED = 19870910;
  Math.random = Alea(SEED);
  jQuery(document).ready(function(){
    var bind_elem = jQuery('#canvas'),
        canvas_elem = document.createElement('canvas'),
        context = canvas_elem.getContext('2d');
    canvas_elem.width = bind_elem.width();
    canvas_elem.height = bind_elem.height();
    bind_elem.empty();
    bind_elem.append(canvas_elem);
    var scene = Scene(context,canvas_elem.width,canvas_elem.height);
    MainScene(scene);
  });
  var MainScene = function(scene){
    scene.add(Background(scene.width,scene.height));
    var zone_manager = ZoneManager(SEED,100,100,10,10),
        viewport = Viewport(scene,26,26,20,zone_manager);
    var render_fn = function(){
      viewport.render();
      scene.render();
      requestAnimationFrame(function(){
        render_fn();
      });
    };
    render_fn();
    jQuery(document).keydown(function(e){
      if(e.keyCode === 37 || e.keyCode === 38 || e.keyCode === 39 || e.keyCode === 40){
        var vx = 0,
            vy = 0;
        if(e.keyCode === 37){
          vx -= 1;
        }
        if(e.keyCode === 38){
          vy -= 1;
        }
        if(e.keyCode === 39){
          vx += 1;
        }
        if(e.keyCode === 40){
          vy += 1;
        }
        viewport.move_by(vx,vy);
      }
    });
  };
  var Viewport = function(scene,width,height,tile_size,zone_manager){
    var self = {},
        map = [],
        tile_x,
        tile_y,
        cursor_x = 0,
        cursor_y = 0,
        start_x = Math.floor(width / 2),
        start_y = Math.floor(height / 2),
        factor,
        f,
        h;
    self.move_by = function(vx,vy){
      cursor_x = clamp(cursor_x + vx,zone_manager.width);
      cursor_y = clamp(cursor_y + vy,zone_manager.height);
    };
    self.render = function(){
      var tile_x,
          tile_y,
          tile,
          start_x = Math.floor(width / 2),
          start_y = Math.floor(height / 2),
          factor,
          f,
          h;
      for(var y = 0, x; y < height; y += 1){
        if(map[y] === undefined){
          map[y] = [];
        }
        for(x = 0; x < width; x += 1){
          (function(x,y,start_x,start_y,cursor_x,cursor_y){
            var tile_x = (x - y) * (tile_size / 2) + (scene.width / 2) - (tile_size / 2),
                tile_y = (x + y) * (tile_size / 4) + (scene.height / 2) - (height * tile_size / 4);
            zone_manager.get_tile(start_x + x + cursor_x,start_y + y + cursor_y,function(tile){
              if(map[y][x] !== undefined){
                scene.remove(map[y][x]);
              }
              var factor = (tile - 128) / 128,
                f,
                h;
              if(factor <= -0.25){ // deep water
                f = 'rgba(0,0,128,1)';
              }else if(factor > -0.25 && factor <= 0){ // shallow water
                f = 'rgba(0,0,255,1)';
              }else if(factor > 0 && factor <= 0.0625){ // shore
                f = 'rgba(0,128,255,1)';
              }else if(factor > 0.0625 && factor <= 0.3){ // sand
                f = 'rgba(240,240,64,1)';
              }else if(factor > 0.3 && factor <= 0.7){ // grass
                f = 'rgba(32,160,0,1)';
              }else if(factor > 0.7 && factor <= 0.8){ // dirt
                f = 'rgba(224,224,0,1)';
              }else if(factor > 0.8 && factor <= 0.92){ // rock
                f = 'rgba(128,128,128,1)';
              }else{ // snow
                f = 'rgba(255,255,255,1)';
              }
              h = ~~(factor * 20);
              if(h < 4){
                h = 4;
              }
              map[y][x] = Tile(tile_x,tile_y,tile_size,h,{'background-color':f});
              scene.add(map[y][x]);
            });
          })(x,y,start_x,start_y,cursor_x,cursor_y);
        }
      }
    };
    return self;
  };
  var ZoneManager = function(seed,width,height,zone_width,zone_height){
    var self = {},
        zones = {},
        tile_cache = {};
    self.width = width;
    self.height = height;
    self.get_tile = function(x,y,callback){
      if(tile_cache[x + ',' + y] !== undefined){
        callback(tile_cache[x + ',' + y]);
      }else{
        var clamped_x = clamp(x,width),
            clamped_y = clamp(y,height),
            zone_x = Math.floor(clamped_x / zone_width),
            zone_y = Math.floor(clamped_y / zone_height),
            local_x = clamped_x % zone_width,
            local_y = clamped_y % zone_height,
            zone;
        if(zones[zone_x + ',' + zone_y] === undefined){
          var z = Zone(seed,zone_x,zone_y,zone_width,zone_height,width,height);
          zones[zone_x + ',' + zone_y] = z;
        }
        zone = zones[zone_x + ',' + zone_y];
        if(zone.map[local_y] && zone.map[local_y][local_x]){
          tile_cache[x + ',' + y] = zone.map[local_y][local_x];
          callback(zone.map[local_y][local_x]);
        }
      }
    };
    return self;
  };
  var Zone = function(seed,x,y,width,height,world_width,world_height){
    var self = {},
        nw,
        ne,
        sw,
        se,
        wwc = world_width / width,
        whc = world_height / height;
    nw = ~~(Alea((y * world_width + x) + seed)() * 255);
    if(x + 1 >= wwc){
      ne = ~~(Alea((y * world_width + (0)) + seed)() * 255);
    }else{
      ne = ~~(Alea((y * world_width + (x + 1)) + seed)() * 255);
    }
    if(y + 1 >= whc){
      sw = ~~(Alea(((0) * world_width + x) + seed)() * 255);
    }else{
      sw = ~~(Alea(((y + 1) * world_width + x) + seed)() * 255);
    }
    if(y + 1 >= whc){
      if(x + 1 >= wwc){
        se = ~~(Alea(((0) * world_width + (0)) + seed)() * 255);
      }else{
        se = ~~(Alea(((0) * world_width + (x + 1)) + seed)() * 255);
      }
    }else{
      if(x + 1 >= wwc){
        se = ~~(Alea(((y + 1) * world_width + (0)) + seed)() * 255);
      }else{
        se = ~~(Alea(((y + 1) * world_width + (x + 1)) + seed)() * 255);
      }
    }
    self.map = lerp(width,height,nw,ne,sw,se);
    return self;
  };
  var Tile = function(x,y,size,height,style){
    var self = DisplayObject(x,y,size,size / 2 + height,style);
    self.add_vertex(size / 2,0 - height);
    self.add_vertex(size,size / 4 - height);
    self.add_vertex(size,size / 4);
    self.add_vertex(size / 2,size / 2);
    self.add_vertex(0,size / 4);
    self.add_vertex(0,size / 4 - height);
    return self;
  };
  var Background = function(width,height){
    var self = DisplayObject.Rectangle(0,0,width,height,{'background-color':'#DAE8F2'});
    return self;
  };
  var DisplayObject = function(x,y,width,height,style){
    var self = {};
    self.$$id = (Math.floor(Math.random() * 0xFFFFFF)).toString(16);
    self.x = x;
    self.y = y;
    self.width = width;
    self.height = height;
    self.vertices = [];
    self.style = {  'background-color':(style['background-color'] || 'rgba(0,0,0,0)'),
                    'border-width':(style['border-width'] || 0),
                    'border-color':(style['border-color'] || 'rgba(0,0,0,0)')};
    self.add_vertex = function(x,y){
      self.vertices.push({'x':x,'y':y});
    };
    return self;
  };
  DisplayObject.Rectangle = function(x,y,width,height,style){
    var self = DisplayObject(x,y,width,height,style);
    self.add_vertex(0,0);
    self.add_vertex(self.width,0);
    self.add_vertex(self.width,self.height);
    self.add_vertex(0,self.height);
    return self;
  };
  var Scene = function(context,width,height){
    var self = {},
        displayables = [];
    self.width = width;
    self.height = height;
    self.add = function(display_object){
      displayables.push(display_object);
    };
    self.remove = function(display_object){
      if(display_object === undefined || display_object.$$id === undefined){
        return;
      }
      var new_displayables = [];
      displayables = jQuery.map(displayables,function(val,i){
        if(val.$$id === display_object.$$id){
          return undefined;
        }
        return val;
      });
    };
    self.render = function(){
      var displayable,
          i, il;
      //context.clearRect(0,0,self.width,self.height);
      context.canvas.width = context.canvas.width;
      for(i = 0, il = displayables.length; i < il; i += 1){
        displayable = displayables[i];
        draw_display_object(displayable);
      }
    };
    var draw_display_object = function(displayable){
      var j, jl,
          vertex;
      context.save();
      context.translate(displayable.x,displayable.y);
      if(displayable.style['border-width'] > 0){
        context.strokeStyle = displayable.style['border-color'];
        context.lineWidth = displayable.style['border-width'];
      }
      context.fillStyle = displayable.style['background-color'];
      if(displayable.vertices.length > 0){
        context.beginPath();
        for(j = 0, jl = displayable.vertices.length; j < jl; j += 1){
          vertex = displayable.vertices[j];
          if(j === 0){
            context.moveTo(vertex.x,vertex.y);
          }else{
            context.lineTo(vertex.x,vertex.y);
          }
        }
        context.fill();
        if(displayable.style['border-width'] > 0){
          context.stroke();
        }
      }
      context.restore();
    };
    return self;
  };
  var lerp = function(width,height,nw,ne,sw,se){
    var map = [],
        xf,
        yf,
        t,
        b,
        v,
        x_lookup = [];
    for(var y = 0, x; y < height; y += 1){
      map[y] = [];
      yf = y / height;
      for(x = 0; x < width; x += 1){
        if(x_lookup[x]){
          xf = x_lookup[x];
        }else{
          xf = x_lookup[x] = x / width;
        }
        t = nw + xf * (ne - nw);
        b = sw + xf * (se - sw);
        v = t + yf * (b - t);
        map[y][x] = ~~v;
      }
    }
    return map;
  };
  var clamp = function(index,size){
    return (index + size) % size;
  };
  /**
   * Provides requestAnimationFrame in a cross browser way.
   * @author paulirish / http://paulirish.com/
   */
  if ( !window.requestAnimationFrame ) {
    window.requestAnimationFrame = ( function() {
      return  window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame ||
              window.oRequestAnimationFrame ||
              window.msRequestAnimationFrame ||
              function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
                window.setTimeout( callback, 1000 / 60 );
              };
    } )();
  }
})();
