(function(){
  //var SEED = (~~(Math.random() * 0xFFFFFF)).toString(16);
  var SEED = 20110921;
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
    var zone_manager = ZoneManager(SEED,400,400,40,40),
        viewport = Viewport(scene,80,80,14,zone_manager);
    var render_fn = function(){
      viewport.render();
      requestAnimationFrame(function(){
        render_fn();
      });
    };
    render_fn();
    jQuery(document).keydown(function(e){
      if(e.keyCode === 37 || e.keyCode === 38 || e.keyCode === 39 || e.keyCode === 40 || e.keyCode === 32){
        var vx = 0,
            vy = 0,
            speed = 1;
        if(e.keyCode === 37){
          vx -= speed;
        }
        if(e.keyCode === 38){
          vy -= speed;
        }
        if(e.keyCode === 39){
          vx += speed;
        }
        if(e.keyCode === 40){
          vy += speed;
        }
        if(e.keyCode === 32){
          viewport.change_tile();
        }
        viewport.move_by(vx,vy);
      }
    });
  };
  var Viewport = function(scene,width,height,tile_size,zone_manager){
    var self = {},
        map = [],
        cursor_x = localStorage['cursor_x'] || 0,
        cursor_y = localStorage['cursor_y'] || 0,
        old_cursor_x,
        old_cursor_y,
        bg = Background(scene.width,scene.height);
    self.move_by = function(vx,vy){
      cursor_x = clamp(cursor_x + vx,zone_manager.width);
      cursor_y = clamp(cursor_y + vy,zone_manager.height);
      //localStorage['cursor_x'] = cursor_x;
      //localStorage['cursor_y'] = cursor_y;
    };
    self.change_tile = function(){
      zone_manager.get_tile(cursor_x,cursor_y,function(tile){
        if(tile.type === 'special'){
          zone_manager.remove_building(cursor_x,cursor_y);
        }else{
          zone_manager.add_building(cursor_x,cursor_y);
        }
      });
    };
    self.render = function(){
      if((old_cursor_x === cursor_x && old_cursor_y === cursor_y) && zone_manager.dirty === false){
        return;
      }
      scene.clear();
      scene.draw(bg);
      var tile,
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
            zone_manager.get_tile(x + cursor_x - start_x,y + cursor_y - start_y,function(tile){
              var h = tile.height,
                  f,
                  type = 'special';
              switch(tile.type){
                case 'special':
                  f = '#E9085F';
                  h += 4;
                  break;
                default:
                  f = tile.color;
                  break;
              }
              if(x === start_x && y === start_y){
                if(tile.type !== 'special'){
                  h += 4;
                }
                f = '#C54B2C';
              }
              if(map[y][x] === undefined || map[y][x].height !== tile.height){
                var tile_x = (x - y) * (tile_size / 2) + (scene.width / 2) - (tile_size / 2),
                    tile_y = (x + y) * (tile_size / 4) + (scene.height / 2) - (height * tile_size / 4);
                map[y][x] = Tile(tile_x,tile_y,tile_size,h,{'background-color':f},type);
              }else{
                map[y][x].style['background-color'] = f;
              }
              scene.draw(map[y][x]);
            });
          })(x,y,start_x,start_y,cursor_x,cursor_y);
        }
      }
      old_cursor_x = cursor_x;
      old_cursor_y = cursor_y;
      zone_manager.dirty = false;
    };
    return self;
  };
  var ZoneManager = function(seed,width,height,zone_width,zone_height){
    var self = {},
        zones = {},
        tile_cache = {},
        buildings = localStorage || {};
    self.width = width;
    self.height = height;
    self.dirty = false;
    self.add_building = function(x,y){
      var clamped_x = clamp(x,width),
          clamped_y = clamp(y,height);
      buildings[clamped_x + ',' + clamped_y] = 'special';
      self.dirty = true;
    };
    self.remove_building = function(x,y){
      var clamped_x = clamp(x,width),
          clamped_y = clamp(y,height);
      buildings.removeItem(clamped_x + ',' + clamped_y);
      //buildings[clamped_x + ',' + clamped_y] = undefined;
      self.dirty = true;
    };
    self.get_tile = function(x,y,callback){
      var clamped_x = clamp(x,width),
          clamped_y = clamp(y,height);
      if(buildings[clamped_x + ',' + clamped_y] !== undefined){
        callback({'height':12,'type':'special'});
      }else if(tile_cache[clamped_x + ',' + clamped_y] !== undefined){
        callback(tile_cache[clamped_x + ',' + clamped_y]);
      }else{
        var zone_x = Math.floor(clamped_x / zone_width),
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
          if(buildings[x + ',' + y] !== undefined){
            callback(buildings[x + ',' + y]);
          }else{
            callback(zone.map[local_y][local_x]);
          }
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
  var Tile = function(x,y,size,h,style){
    var height = 8;
    var self = DisplayObject(x,y,size,size / 2 + height - h,style);
    self.type = '';
    self.add_vertex(size / 2,0 - height - h);
    self.add_vertex(size,size / 4 - height - h);
    self.add_vertex(size,size / 4 - h);
    self.add_vertex(size / 2,size / 2 - h);
    self.add_vertex(0,size / 4 - h);
    self.add_vertex(0,size / 4 - height - h);
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
    var self = {};
    self.width = width;
    self.height = height;
    self.draw = function(display_object){
      draw_display_object(display_object);
    };
    self.clear = function(){
      //context.clearRect(0,0,self.width,self.height);
      context.canvas.width = context.canvas.width;
    };
    var draw_display_object = function(displayable){
      if( displayable.x > self.width + displayable.width ||
          displayable.x + displayable.width < 0 ||
          displayable.y > self.height + 20 ||
          displayable.y + displayable.height < 0){
        return;
      }
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
        var factor = (~~v - 128) / 128,
            h,
            type = 'special',
            cr,
            cg,
            cb,
            p;
        if(factor <= -0.25){ // deep water
          cb = ~~tween(255,128,(Math.abs(factor) - 0.25) / 0.75);
          f = 'rgba(0,0,' + cb + ',1)';
          type = 'deep water';
        }else if(factor > -0.25 && factor <= 0){ // shallow water
          cg = ~~tween(128,0,(Math.abs(factor) / 0.25));
          f = 'rgba(0,' + cg + ',255,1)';
          type = 'shallow water';
        }else if(factor > 0 && factor <= 0.0625){ // shore
          p = factor / 0.0625;
          cr = ~~tween(0,240,p);
          cg = ~~tween(128,240,p);
          cb = ~~tween(255,64,p);
          f = 'rgba(' + cr + ',' + cg + ',' + cb + ',1)';
          type = 'shore';
        }else if(factor > 0.0625 && factor <= 0.3){ // sand
          p = (factor - 0.0625) / 0.2375;
          cr = ~~tween(240,32,p);
          cg = ~~tween(240,160,p);
          cb = ~~tween(64,0,p);
          f = 'rgba(' + cr + ',' + cg + ',' + cb + ',1)';
          type = 'sand';
        }else if(factor > 0.3 && factor <= 0.7){ // grass
          p = (factor - 0.3) / 0.4;
          cr = ~~tween(32,224,p);
          cg = ~~tween(160,224,p);
          cb = 0;
          f = 'rgba(' + cr + ',' + cg + ',' + cb + ',1)';
          type = 'grass';
        }else if(factor > 0.7 && factor <= 0.8){ // dirt
          p = (factor - 0.7) / 0.1;
          cr = ~~tween(224,128,p);
          cg = ~~tween(224,128,p);
          cb = ~~tween(0,128,p);
          f = 'rgba(' + cr + ',' + cg + ',' + cb + ',1)';
          type = 'dirt';
        }else if(factor > 0.8 && factor <= 0.92){ // rock
          p = (factor - 0.8) / 0.12;
          cr = ~~tween(128,255,p);
          cg = ~~tween(128,255,p);
          cb = ~~tween(128,255,p);
          f = 'rgba(' + cr + ',' + cg + ',' + cb + ',1)';
          //f = 'rgba(128,128,128,1)';
          type = 'rock';
        }else{ // snow
          f = 'rgba(255,255,255,1)';
          type = 'snow';
        }
        h = ~~(factor * 20);
        if(h < 4){
          h = 4;
        }
        //h = 4;
        map[y][x] = {'height':h,'type':type,'color':f};
      }
    }
    return map;
  };
  var tween = function(a,b,f){
    return a + f * (b - a);
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
