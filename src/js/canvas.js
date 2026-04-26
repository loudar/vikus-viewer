function Canvas() {
  const margin = {
    top: 0,
    right: 10,
    bottom: 10,
    left: 10,
  };

  const hashDelay = 800;

  const minHeight = 400;
  let width = window.innerWidth - margin.left - margin.right;
  let widthOuter = window.innerWidth;
  let height = window.innerHeight; // < minHeight ? minHeight : window.innerHeight;
  utils.log("height", height)
  utils.log("width", width)

  let scale1 = 1;
  let scale2 = 1;
  let scale3 = 1;
  let allData = [];

  let translate = [0, 0];
  let scale = 1;
  let timeDomain = [];
  let canvasDomain = [];
  const loadImagesCue = [];

  const resolution = window.devicePixelRatio || 1;

  const x = d3.scale
    .ordinal()
    .rangeBands([margin.left, width + margin.left], 0.2);

  const yscale = d3.scale.linear()

  const Quadtree = d3.geom
    .quadtree()
    .x(function (d) {
      return d.x;
    })
    .y(function (d) {
      return d.y;
    });

  let quadtree;

  const maxZoomLevel = utils.isMobile() ? 5000 : 2500;

  const zoom = d3.behavior
    .zoom()
    .scaleExtent([1, maxZoomLevel])
    .size([width, height])
    .on("zoom", zoomed)
    .on("zoomend", zoomend)
    .on("zoomstart", zoomstart);

  let canvas = () => {};
  let config;
  let container;
  let data;
  let rangeBand = 0;
  let rangeBandImage = 0;
  let imageSize = 256;
  let imageSize2 = 1024;
  let imageSize3 = 4000;
  let columns = 4;
  let renderer;

  let selectedImageDistance = 0;
  let selectedImage = null;

  let drag = false;
  let sleep = false;

  let imgPadding;

  const bottomPadding = 40;
  let extent = [0, 0];

  let touchstart = 0;
  let vizContainer;
  let spriteClick = false;

  const state = {
    lastZoomed: 0,
    zoomingToImage: false,
    init: false,
    mode: "time",
  };

  let zoomedToImage = false;
  let zoomedToImageScale = 117;
  const zoomBarrier = 2;

  let startTranslate = [0, 0];
  let startScale = 0;
  let cursorCutoff = 1;
  let zooming = false;
  const detailContainer = d3.select(".sidebar");
  let timelineData;
  let stage, stage1, stage2, stage3, stage4, stage5;
  let timelineHover = false;
  const tsneIndex = {};
  const tsneScale = {}

  canvas.margin = margin;

  let annotationVectors = ""
  let annotationVectorGraphics = undefined

  canvas.abs2relCoordinate = function (p) {
    return [
      (p[0] / widthOuter) * 100,
      ((-1 * p[1]) / widthOuter) * 100,
    ].map(function (d) {
      return Math.round(d * 100) / 100;
    })
  }

  canvas.rel2absCoordinate = function (p) {
    return [
      p[0] / 100 * widthOuter,
      (-1 * p[1] / 100) * widthOuter,
    ]
  }

  canvas.addVector = function (startNew = false) {
    const mouse = d3.mouse(vizContainer.node());
    const p = toScreenPoint(mouse);
    const relative = canvas.abs2relCoordinate(p);

    utils.log("add vector", relative, p)

    if (startNew || annotationVectors.length === 0) {
      annotationVectors += (annotationVectors.length ? "," : "") + "w1"
    }

    annotationVectors += "," + relative[0] + "-" + relative[1];
    utils.log("vectors", annotationVectors)

    utils.updateHash("vector", annotationVectors)
    canvas.drawVectors();
  }

  canvas.parseVectors = function (v) {
    if (v === undefined) return;
    if (v === "") return;

    // example: "w1,0-0,1-1,2-2,w2,3-3,4-4"
    // w1 means new vector with weight 1 
    // 0-0,1-1,2-2 means vector points
    // w2 means new vector with weight 2
    // 3-3,4-4 means vector points

    const parts = v.split(",");
    const vectors = [];
    let currentVector = [];
    let currentWeight = 1;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part.startsWith("w")) {
        // new vector with weight

        if (currentVector.length > 0) {
          vectors.push({
            vector: currentVector,
            weight: currentWeight,
          });
        }
        currentWeight = parseFloat(part.replaceAll("w", ""));

        currentVector = [];
      } else {
        // vector point
        const coords = part.split("-").map(function (d) {
          return parseFloat(d);
        });
        if (coords.length == 2) {
          const decodeAnnotationCoordinates = canvas.rel2absCoordinate(coords);
          currentVector.push(decodeAnnotationCoordinates);
        } else {
          utils.log("invalid vector point", part);
        }
      }
    }
    if (currentVector.length > 0) {
      vectors.push({
        vector: currentVector,
        weight: currentWeight,
      });
    }
    // console.log("parsed vectors", vectors);
    return vectors;
  }

  canvas.drawVectors = function () {
    // console.log("drawVectors", annotationVectors)
    if (annotationVectorGraphics) {
      stage3.removeChild(annotationVectorGraphics);
      annotationVectorGraphics.destroy(true);
      annotationVectorGraphics = undefined;
    }

    if (annotationVectors.length == 0) return;


    const parsedVectors = canvas.parseVectors(annotationVectors);
    utils.log("parsedVectors", parsedVectors)

    annotationVectorGraphics = new PIXI.Graphics();

    for (let i = 0; i < parsedVectors.length; i++) {
      const vector = parsedVectors[i].vector;
      const weight = parsedVectors[i].weight;

      const lineColorHash = config.style?.annotationLineColor || "#00ff00";
      const color = parseInt(lineColorHash.substring(1), 16);
      annotationVectorGraphics.lineStyle(weight, color, 1 );
      // draw lines between points
      for (let j = 0; j < vector.length - 1; j++) {
        const start = vector[j];
        const end = vector[j + 1];
        annotationVectorGraphics.moveTo(start[0], start[1]);
        annotationVectorGraphics.lineTo(end[0], end[1]);
      }
      annotationVectorGraphics.endFill();
      annotationVectorGraphics.position.x = 0;
      annotationVectorGraphics.position.y = 0;
      annotationVectorGraphics.scale.x = scale1
      annotationVectorGraphics.scale.y = scale1;
      annotationVectorGraphics.interactive = false;
      annotationVectorGraphics.buttonMode = false;
      annotationVectorGraphics.visible = true;
      annotationVectorGraphics.zIndex = 1000;

    }

    stage3.addChild(annotationVectorGraphics);

    sleep = false;
    animate();
  }

  canvas.removeAllVectors = function () {
    if (annotationVectorGraphics) {
      stage3.removeChild(annotationVectorGraphics);
      annotationVectorGraphics.destroy(true);
      annotationVectorGraphics = undefined;
    }
    annotationVectors = ""
    sleep = false;
  }

  canvas.removeAllCustomGraphics = function () {
    canvas.removeAllVectors();
    canvas.removeAllBorders();
  }

  canvas.getView = function () {
    const visibleItems = [];

    const invScale = 1 / scale;
    const viewLeft = (-translate[0] * invScale);
    const viewTop = (-translate[1] * invScale) - height;
    const viewRight = viewLeft + widthOuter * invScale;
    const viewBottom = viewTop + height * invScale;

    data.forEach(function (d) {
      var px = d.x1 / scale1;
      var py = d.y1 / scale1;
      // var px = d.sprite.position.x / scale1;
      // var py = d.sprite.position.y / scale1;
      var halfW = d.sprite.width / scale1 / 2;
      var halfH = d.sprite.height / scale1 / 2;

      halfH = 0;
      halfW = 0;

      var left = px - halfW;
      var right = px + halfW;
      var top = py - halfH;
      var bottom = py + halfH;

      if (
        left >= viewLeft &&
        right <= viewRight &&
        top >= viewTop &&
        bottom <= viewBottom
      ) {
        visibleItems.push(d);
      }
    });

    if (visibleItems.length === 0 || visibleItems.length == data.length) {
      return []
    }

    // console.log("fully visible items:", visibleItems.length, visibleItems.map(function (d) { return d.id; }));

    let mostLeft = null;
    let mostRight = null;
    let mostTop = null;
    let mostBottom = null;

    visibleItems.forEach(function (d) {
      if (!mostLeft || d.x < mostLeft.x) mostLeft = d;
      if (!mostRight || d.x > mostRight.x) mostRight = d;
      if (!mostTop || d.y < mostTop.y) mostTop = d;
      if (!mostBottom || d.y > mostBottom.y) mostBottom = d;
    });

    const unique = new Set([
      mostLeft?.id,
      mostRight?.id,
      mostTop?.id,
      mostBottom?.id,
    ]);

    return Array.from(unique).filter(function (id) { return id !== undefined && id !== null; });
  };


  canvas.setView = function (ids, duration) {
    if (duration === void 0) { duration = 1500; }
    const items = data.filter(function (d) { return ids.includes(d.id); });
    if (!items.length) return;


    vizContainer.style("pointer-events", "none");
    zoom.center(null);
    state.zoomingToImage = true;

    // Compute the bounding box of all selected items
    const xs = items.map(function (d) { return d.x; });
    const ys = items.map(function (d) { return d.y });

    const minX = d3.min(xs);
    const maxX = d3.max(xs);
    const minY = d3.min(ys);
    const maxY = d3.max(ys);

    const width = canvas.width();
    const height = canvas.height();

    // Use rangeBandImage for padding/spacing logic
    const padding = rangeBandImage / 2;
    const boxWidth = maxX - minX + padding * 2;
    const boxHeight = maxY - minY + padding * 2;

    // Calculate center without padding (center point remains the same)
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate scale to fit the bounding box
    const scale = 0.9 / Math.max(boxWidth / width, boxHeight / height); // Fit box in 90% of view

    const translateTarget = [
      width / 2 - scale * (centerX + padding),
      height / 2 - scale * (height + centerY + padding),
    ];

    // old code
    // const translateOriginal = [
    //   -scale * (centerX - padding) - (Math.max(width, height) * 0.3) / 2 + margin.left,
    //   -scale * (height + centerY + padding) - margin.top + height / 2,
    // ];

    if (items.length == 1) {
      zoomedToImageScale = scale;
      // var d = items[0];
      // setTimeout(function () {
      //   hideTheRest(d);
      // }, duration / 2);
    }

    vizContainer
      .interrupt()
      .call(zoom.translate(translate).event) // Use current translate as starting point
      .transition()
      .duration(duration)
      .call(zoom.scale(scale).translate(translateTarget).event) // Apply new scale and target translate
      .each("end", function () {
        state.zoomingToImage = false;
        vizContainer.style("pointer-events", "auto");
        if (items.length == 1) {
          var d = items[0];
          zoomedToImage = true;
          selectedImage = d;
          zoomedToImageScale = scale;

          showDetail(d);
          loadBigImage(d, "click");
          hideTheRest(d);
        }
      });
  };

  canvas.rangeBand = function () {
    return rangeBand;
  };
  canvas.width = function () {
    return width;
  };
  canvas.height = function () {
    return height;
  };
  canvas.rangeBandImage = function () {
    return rangeBandImage;
  };
  canvas.zoom = zoom;
  canvas.selectedImage = function () {
    return selectedImage;
  };
  canvas.x = x;
  canvas.y = yscale;

  canvas.resize = function () {
    if (!state.init) return;
    width = window.innerWidth - margin.left - margin.right;
    height = window.innerHeight // < minHeight ? minHeight : window.innerHeight;
    widthOuter = window.innerWidth;
    d3.select(renderer.view).style({width: widthOuter+"px", height: height+"px"});
    renderer.resize(width + margin.left + margin.right, height);
    zoom.size([width, height]);
    canvas.makeScales();
    canvas.project();
    canvas.resetZoom();
    utils.log("dimensions", width, height)
    utils.log("self.innerWidth", self.innerWidth, self.innerHeight)
    var ids = new URLSearchParams(window.location.hash.slice(1)).get("ids");
    if (ids) canvas.setView(ids.split(","), 0, true);
  };

  canvas.makeScales = function () {
    x.rangeBands([margin.left, width + margin.left], 0.2);

    rangeBand = x.rangeBand();
    rangeBandImage = rangeBand / columns;

    imgPadding = rangeBand / columns / 2;

    scale1 = imageSize / rangeBandImage;
    scale2 = imageSize2 / rangeBandImage;
    scale3 = imageSize3 / rangeBandImage;

    stage3.scale.x = 1 / scale1;
    stage3.scale.y = 1 / scale1;
    stage3.y = height;

    stage4.scale.x = 1 / scale2;
    stage4.scale.y = 1 / scale2;
    stage4.y = height;

    stage5.scale.x = 1 / scale3;
    stage5.scale.y = 1 / scale3;
    stage5.y = height;

    timeline.rescale(scale1);

    cursorCutoff = (1 / scale1) * imageSize * 0.48;
    zoomedToImageScale =
      (0.8 / (rangeBand / columns / width)) *
      (state.mode.type === "group" ? 1 : 0.5);
    // console.log("zoomedToImageScale", zoomedToImageScale)
  };

  canvas.initGroupLayout = function () {
    const groupKey = state.mode.groupKey
    utils.log("initGroupLayout", groupKey);
    canvasDomain = d3
      .nest()
      .key(function (d) {
        return d[groupKey];
      })
      .entries(data.concat(timelineData))
      .sort(function (a, b) {
        return a.key - b.key;
      })
      .map(function (d) {
        return d.key;
      });

    // if (groupKey == "stadt") {
    //   console.log("stadt", canvasDomain)
    //   const missing = canvasDomain.filter(d => !utils.citiesOrder.includes(d))
    //   console.log("missing", missing)
    //   canvasDomain = utils.citiesOrder
    // }

    timeDomain = canvasDomain.map(function (d) {
      return {
        key: d,
        values: timelineData
          .filter(function (e) {
            return d == e[groupKey];
          }).map(function (e) {
            e.type = "timeline";
            return e;
          })
      };
    });
    // console.log("canvasDomain", canvasDomain);
    // console.log("timeDomain", timeDomain);


    timeline.init(timeDomain);

    x.domain(canvasDomain);

  };

  // canvas.setCustomTimelineData = function () {
  //   timelineData = [{ "x": "54", "key": "200" }, { "x": "182", "key": "1k" }, { "x": "237", "key": "2k" }, { "x": "365", "key": "10k" }, { "x": "420", "key": "20k" }, { "x": "548", "key": "100k" }, { "x": "603", "key": "200k" }, { "x": "731", "key": "1M" }, { "x": "786", "key": "2M" }]
  //   canvasDomain = timelineData.map(d => d.key)
  //   timeDomain = timelineData.map(function (d) {
  //     return {
  //       key: d.key,
  //       values: [],
  //       type: "static",

  //     };
  //   });
  //   timeline.init(timeDomain);
  //   x.domain(canvasDomain);

  //   console.log("canvasDomain", canvasDomain);
  //   console.log("timeDomain", timeDomain);
  // }

  canvas.init = function (_data, _timeline, _config) {
    data = _data;
    config = _config;
    timelineData = _timeline;

    container = d3.select(".page").append("div").classed("viz", true);
    
    const updateDetailStructure = () => {
        if (window.detailVue) {
            detailVue.structure = config.detail.structure;
        } else {
            // If not yet mounted, retry shortly
            setTimeout(updateDetailStructure, 50);
        }
    };
    updateDetailStructure();

    columns = config.projection.columns;
    imageSize = config.loader.textures.medium.size;
    imageSize2 = config.loader.textures.detail.size;

    if (config.loader.textures.big) {
      imageSize3 = config.loader.textures.big.size;
    }

    // PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    // PIXI.settings.SPRITE_MAX_TEXTURES = Math.min(
    //   PIXI.settings.SPRITE_MAX_TEXTURES,
    //   16
    // );

    const renderOptions = {
      resolution: resolution,
      antialiasing: true,
      width: width + margin.left + margin.right,
      height: height,
    };
    renderer = new PIXI.Renderer(renderOptions);
    renderer.backgroundColor = parseInt(
      config.style.canvasBackground.substring(1),
      16
    );
    window.renderer = renderer;

    const renderElem = d3.select(container.node().appendChild(renderer.view));
    renderElem.style("width", widthOuter + "px");
    renderElem.style("height", height + "px");

    stage = new PIXI.Container();
    stage2 = new PIXI.Container();
    stage3 = new PIXI.Container();
    stage4 = new PIXI.Container();
    stage5 = new PIXI.Container();

    stage.addChild(stage2);
    stage2.addChild(stage3);
    stage2.addChild(stage4);
    stage2.addChild(stage5);

    canvas.initGroupLayout();

    //canvas.makeScales();

    // add preview pics
    data.forEach(function (d, i) {
      var sprite = new PIXI.Sprite(PIXI.Texture.WHITE);

      sprite.anchor.x = 0.5;
      sprite.anchor.y = 0.5;

      sprite.scale.x = d.scaleFactor;
      sprite.scale.y = d.scaleFactor;

      sprite._data = d;
      d.sprite = sprite;

      stage3.addChild(sprite);
    });

    let lastClick = 0;

    vizContainer = d3
      .select(".viz")
      .call(zoom)
      .on("mousemove", mousemove)
      .on("dblclick.zoom", null)
      .on("dblclick", null)
      .on("touchstart", function (d) {
        mousemove(d);
        touchstart = new Date() * 1;
      })
      // .on("touchend", function (d, i, nodes, event) {
      //   var touchtime = new Date() * 1 - touchstart;
      //   if (touchtime < 20) {
      //     console.log("touched", touchtime, d, i, nodes, event);
      //     return;
      //   }
      // })
      // .on("touchend", function (d) {
      //   var touchtime = new Date() * 1 - touchstart;
      //   if (touchtime > 250) {
      //     console.log("longtouch", touchtime);
      //     return;
      //   }
      //   if (selectedImageDistance > 15) return;
      //   if (selectedImage && !selectedImage.id) return;
      //   if (selectedImage && !selectedImage.active) return;
      //   if (drag) return;

      //   console.log("touch zoom")

      //   // if (Math.abs(zoomedToImageScale - scale) < 0.1) {
      //   //   canvas.resetZoom();
      //   // } else {
      //   //   zoomToImage(selectedImage, 1400 / Math.sqrt(Math.sqrt(scale)));
      //   // }

      //   // zoomToImage(selectedImage, 1400 / Math.sqrt(Math.sqrt(scale)));
      // })
      .on("click", function () {

        if (d3.event.shiftKey) {
          utils.log("shift click", selectedImage);
          canvas.addBorderToImage(selectedImage);
          return
        }
        if (d3.event.ctrlKey || d3.event.metaKey) {
          utils.log("ctrl/cmd click");
          // if alt or cmd is pressed, startNew vector
          var startNew = d3.event.altKey;
          canvas.addVector(startNew);
          return
        }

        const clicktime = new Date() * 1 - lastClick;
        if (clicktime < 250) return;
        lastClick = new Date() * 1;

        utils.log("click");
        if (spriteClick) {
          spriteClick = false;
          return;
        }

        if (selectedImage && !selectedImage.id) return;
        if (drag) return;
        if (selectedImageDistance > cursorCutoff) return;
        if (selectedImage && !selectedImage.active) return;
        if (timelineHover) return;
        // console.log(selectedImage)
        userInteraction = true;

        if (Math.abs(zoomedToImageScale - scale) < 0.1) {
          canvas.resetZoom();
          // console.log("reset zoom")
        } else {
          // console.log("zoom to image", zoomedToImageScale, scale)
          zoomToImage(selectedImage, 2000 / Math.sqrt(Math.sqrt(scale)));
        }
      });

    // disable right click when in edit mode
    vizContainer.on("contextmenu", function () {
      if (window.top == window.self) d3.event.preventDefault();
    });


    //canvas.makeScales();
    //canvas.project();
    animate();

    // selectedImage = data.find(d => d.id == 88413)
    // showDetail(selectedImage)
    state.init = true;
  };

  let imageBorders = {};

  canvas.updateBorderPositions = function () {
    var graphics = d3.values(imageBorders);
    if (graphics.length == 0) return;
    graphics.forEach(function (graphic) {
      var d = graphic.source;
      graphic.position.x = d.sprite.position.x - d.sprite.width / 2;
      graphic.position.y = d.sprite.position.y - d.sprite.height / 2;
      // console.log(d.sprite.position.x, graphic.position);
    });
  }


  canvas.removeBorder = function (id) {
    if (imageBorders.hasOwnProperty(id)) {
      stage3.removeChild(imageBorders[id]);
      delete imageBorders[id];
      sleep = false;
    }
  }

  canvas.removeAllBorders = function () {
    d3.values(imageBorders).forEach(function (d) {
      stage3.removeChild(d);
    });
    imageBorders = {};
    sleep = false;
  }

  canvas.addBorder = function (d) {
    sleep = false;
    const sprite = d.sprite;
    const graphics = new PIXI.Graphics();
    const borderColorHash = config.style?.annotationBorderColor || "#ff0000";
    const borderColor = parseInt(borderColorHash.substring(1), 16);
    graphics.lineStyle(5, borderColor, 1);
    graphics.drawRect(
      0, 0,
      sprite.width,
      sprite.height
    );
    graphics.position.x = sprite.position.x - sprite.width / 2;
    graphics.position.y = sprite.position.y - sprite.height / 2;
    graphics.source = d
    stage3.addChild(graphics);
    imageBorders[d.id] = graphics;
    utils.log("added border", graphics);
  }


  canvas.addBorderToImage = function (d) {
    sleep = false;
    if (imageBorders.hasOwnProperty(d.id)) {
      stage3.removeChild(imageBorders[d.id]);
      delete imageBorders[d.id];
      updateHashBorders();
      return;
    }
    canvas.addBorder(d);
    updateHashBorders();
  }

  function updateImageBorders(borderIds) {
    const enter = borderIds.filter(function (d) { return !imageBorders.hasOwnProperty(d); });
    const exit = Object.keys(imageBorders).filter(function (d) { return !borderIds.includes(d); });

    enter.forEach(function (id) {
      var d = data.find(function (d) { return d.id == id; });
      canvas.addBorderToImage(d);
    });

    exit.forEach(function (id) {
      canvas.removeBorder(id);
    });
  }


  function updateHashBorders() {
    if (!d3.event) return;
    const borders = Object.keys(imageBorders);
    utils.updateHash("borders", borders);
  }

  canvas.addTsneData = function (name, d, scale) {
    tsneIndex[name] = {};
    tsneScale[name] = scale;
    const clean = d.map(function (d) {
      return {
        id: d.id,
        x: parseFloat(d.x),
        y: parseFloat(d.y),
      };
    });
    const xExtent = d3.extent(clean, function (d) {
      return d.x;
    });
    const yExtent = d3.extent(clean, function (d) {
      return d.y;
    });

    const x = d3.scale.linear().range([0, 1]).domain(xExtent);
    const y = d3.scale.linear().range([0, 1]).domain(yExtent);

    d.forEach(function (d) {
      tsneIndex[name][d.id] = [x(d.x), y(d.y)];
    });
  };

  function mousemove(d) {
    if (timelineHover) return;

    const mouse = d3.mouse(vizContainer.node());
    const p = toScreenPoint(mouse);

    const distance = 200;

    const best = utils.nearest(
      p[0] - imgPadding,
      p[1] - imgPadding,
      {
        d: distance,
        p: null,
      },
      quadtree
    );

    selectedImageDistance = best && best.d || 1000;
    // console.log(cursorCutoff, scale, scale1, selectedImageDistance)

    // if (best.p && selectedImageDistance > 7) {
    //   //selectedImage = null;
    //   //zoom.center(null);
    //   container.style("cursor", "default");
    // } else {
    if (best && best.p && !zoomedToImage) {
      const d = best.p;
      const center = [
        (d.x + imgPadding) * scale + translate[0],
        (height + d.y + imgPadding) * scale + translate[1],
      ];
      // console.log("center", width, center, d.x, d.y)
      zoom.center(center);
      selectedImage = d;
    }

    container.style("cursor", function () {
      return selectedImageDistance < cursorCutoff && selectedImage.active
        ? "pointer"
        : "default";
    });

    if (d3.event.shiftKey) {
      container.style("cursor", "copy")
    }
    if (d3.event.ctrlKey || d3.event.metaKey) {
      container.style("cursor", "crosshair")
      if(d3.event.altKey) {
        container.style("cursor", "cell")
      }
    }
    // }
  }

  function stackLayout(data, invert) {
    const groupKey = state.mode.groupKey
    const years = d3
      .nest()
      .key(function (d) {
        return d[groupKey];
      })
      .entries(data);

    years.forEach(function (year) {
      const startX = x(year.key);
      const total = year.values.length;
      year.values.sort(function (a, b) {
        return b.keywords.length - a.keywords.length;
      });

      year.values.forEach(function (d, i) {
        const row = Math.floor(i / columns) + 2;
        d.ii = i;

        d.x = startX + (i % columns) * (rangeBand / columns);
        d.y = (invert ? 1 : -1) * (row * (rangeBand / columns));

        d.x1 = d.x * scale1 + imageSize / 2;
        d.y1 = d.y * scale1 + imageSize / 2;

        if (d.sprite.position.x == 0) {
          d.sprite.position.x = d.x1;
          d.sprite.position.y = d.y1;
        }

        if (d.sprite2) {
          d.sprite2.position.x = d.x * scale2 + imageSize2 / 2;
          d.sprite2.position.y = d.y * scale2 + imageSize2 / 2;
        }

        d.order = (invert ? 1 : 1) * (total - i);
      });
    });

  }

  function stackYLayout(data, invert) {
    if (data.length == 0) return
    const groupKey = state.mode.groupKey
    const years = d3
      .nest()
      .key(function (d) {
        return d[groupKey];
      })
      .entries(data);

    // y scale for state.mode.y (e.g. "kaufpreis")
    const yExtent = d3.extent(data, function (d) { return +d[state.mode.y]; })
    const yRange = [2 * (rangeBand / columns), height * 0.7]

    yExtent[0] = 0;

    const yscale = d3.scale.linear()
      .domain(yExtent)
      .range(yRange);

    years.forEach(function (year) {
      const startX = x(year.key);

      year.values.sort(function (a, b) {
        return b[state.mode.y] - a[state.mode.y];
      });

      year.values.forEach(function (d, i) {
        d.ii = i;

        d.x = startX + (i % columns) * (rangeBand / columns);
        d.y = (invert ? 1 : -1) * yscale(d[state.mode.y]);
        //d.y = (invert ? 1 : -1) * (row * (rangeBand / columns));

        d.x1 = d.x * scale1 + imageSize / 2;
        d.y1 = d.y * scale1 + imageSize / 2;

        if (d.sprite.position.x == 0) {
          d.sprite.position.x = d.x1;
          d.sprite.position.y = d.y1;
        }

        if (d.sprite2) {
          d.sprite2.position.x = d.x * scale2 + imageSize2 / 2;
          d.sprite2.position.y = d.y * scale2 + imageSize2 / 2;
        }

        //d.order = (invert ? 1 : 1) * (total - i);
      });
    });

    // data.filter(d => !d[state.mode.y]).forEach(function (d, i) {
    //   d.x = 0;
    //   d.y = 0;
    //   d.active = false;
    //   // d.sprite.visible = false;
    //   // if (d.sprite2) d.sprite2.visible = false;
    // })

  }

  canvas.distance = function (a, b) {
    return Math.sqrt(
      (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])
    );
  };


  const speed = 0.06;

  function imageAnimation() {
    let sleep = true;
    let diff, d;


    for (var i = 0; i < data.length; i++) {
      d = data[i];
      diff = d.x1 - d.sprite.position.x;
      if (Math.abs(diff) > 0.1) {
        d.sprite.position.x += diff * speed;
        sleep = false;
      }

      diff = d.y1 - d.sprite.position.y;
      if (Math.abs(diff) > 0.1) {
        d.sprite.position.y += diff * speed;
        sleep = false;
      }

      diff = d.alpha - d.sprite.alpha;
      if (Math.abs(diff) > 0.01) {
        d.sprite.alpha += diff * 0.2;
        sleep = false;
      }

      d.sprite.visible = d.sprite.alpha > 0.1;

      if (d.sprite2) {
        diff = d.alpha2 - d.sprite2.alpha;
        if (Math.abs(diff) > 0.01) {
          d.sprite2.alpha += diff * 0.2;
          sleep = false;
        }

        d.sprite2.visible = d.sprite2.alpha > 0.1;
        //else d.sprite2.visible = d.visible;
      }
    };
    canvas.updateBorderPositions();
    return sleep;
  }

  canvas.wakeup = function () {
    sleep = false;
  };

  canvas.setMode = function (layout) {
    state.mode = layout;

    if (layout.type == "group") {
      canvas.initGroupLayout();
      if (layout.columns) {
        columns = layout.columns;
      } else {
        columns = config.projection.columns;
      }
    }
    // if (layout.timeline) {
    //   canvas.setCustomTimelineData()
    // }

    timeline.setDisabled(layout.type != "group" && !layout.timeline);
    canvas.makeScales();
    canvas.project();
    canvas.resetZoom();
  };

  canvas.getMode = function () {
    return state.mode;
  };

  function animate(time) {
    requestAnimationFrame(animate);
    loadImages();
    if (sleep) return;
    sleep = imageAnimation();
    renderer.render(stage);
  }

  function zoomToYear(d) {
    const xYear = x(d.year);
    const scale = 1 / ((rangeBand * 4) / width);
    const padding = rangeBand * 1.5;
    const translateNow = [-scale * (xYear - padding), -scale * (height + d.y)];

    vizContainer
      .call(zoom.translate(translate).event)
      .transition()
      .duration(2000)
      .call(zoom.scale(scale).translate(translateNow).event);
  }

  window.zoomToYear = zoomToYear;

  function zoomToImage(d, duration) {
    state.zoomingToImage = true;
    vizContainer.style("pointer-events", "none");
    zoom.center(null);
    loadMiddleImage(d);
    d3.select(".tagcloud").classed("hide", true);

    // var padding = (state.mode.type === "group" ? 0.1 : 0.8) * rangeBandImage;
    // var sidbar = width / 8;
    // // var scale = d.sprite.width / rangeBandImage * columns * 1.3;
    // var scale = scale1 * 4;
    // console.log(d, imgPadding, scale, scale1, padding, scale1, d.x, d.sprite.width);

    // var translateNow = [
    //   -scale * (d.x + margin.left / scale1 / 6 ),
    //   -scale * (height + d.y + (margin.top / scale1 / 2)),
    // ];

    const padding = rangeBandImage / 2;
    //var scale = 1 / (rangeBandImage / (width * 0.8));
    const max = Math.max(width, height);
    const scale = 1 / (rangeBandImage / (max * 0.6));
    const translateNow = [
      -scale * (d.x - padding) - (max * 0.3) / 2 + margin.left,
      -scale * (height + d.y + padding) - margin.top + height / 2,
    ];

    // console.log(translateNow)

    zoomedToImageScale = scale;

    // setTimeout(function () {
    //   hideTheRest(d);
    // }, duration / 2);

    vizContainer
      .call(zoom.translate(translate).event)
      .transition()
      .duration(duration)
      .call(zoom.scale(scale).translate(translateNow).event)
      .each("end", function () {
        zoomedToImage = true;
        selectedImage = d;
        hideTheRest(d);
        showDetail(d);
        loadBigImage(d, "click");
        state.zoomingToImage = false;
        utils.log("zoomedToImage", zoomedToImage);
        vizContainer.style("pointer-events", "auto");
        utils.updateHash("ids", d.id, ["translate", "scale"]);
      });
  }
  canvas.zoomToImage = zoomToImage;

  function showDetail(d) {
    detailContainer.select(".outer").node().scrollTop = 0;
    detailContainer.classed("hide", false).classed("sneak", utils.isMobile() || isInIframe);

    const detailData = {};
    // var activeFields = config.detail.structure
    //   .filter(function (field, index) {
    //     return selectedImage[field.source] && selectedImage[field.source] !== "";
    //   })
    // console.log("activeFields", activeFields)

    config.detail.structure.forEach(function (field) {
      var val = selectedImage[field.source];
      if (val && val !== "") detailData[field.source] = val;
      else detailData[field.source] = "";
      if (field.fields && field.fields.length) {
        field.fields.forEach(function (subfield) {
          var val = selectedImage[subfield];
          // console.log("subfield", subfield, val)
          if (val && val !== "") detailData[subfield] = val;
        })
      }
      // detailData[field.source] = selectedImage[field.source];
    })
    // console.log("showDetail", detailData)


    detailData["_id"] = selectedImage.id;
    detailData["_keywords"] = selectedImage.keywords || "None";
    detailData["_year"] = selectedImage.year;
    detailData["_imagenum"] = selectedImage.imagenum || 1;
    if (window.detailVue) {
      detailVue.id = d.id;
      detailVue.page = d.page;
      detailVue.item = detailData;
    } else {
      window.pendingDetailData = {
        id: d.id,
        page: d.page,
        item: detailData
      };
    }
  }

  canvas.showDetail = showDetail;

  canvas.changePage = function (id, page) {
    utils.log("changePage", id, page, selectedImage);
    selectedImage.page = page;
    if (window.detailVue) {
      detailVue.page = page;
    }
    clearBigImages();
    loadBigImage(selectedImage);
  };

  function hideTheRest(d) {
    data.forEach(function (d2) {
      if (d2.id !== d.id) {
        d2.alpha = 0;
        d2.alpha2 = 0;
      }
    });
  }

  function showAllImages() {
    data.forEach(function (d) {
      d.alpha = d.active ? 1 : 0.2;
      d.alpha2 = d.visible ? 1 : 0;
    });
  }

  let zoomBarrierState = false;
  let lastSourceEvent = null;
  const isInIframe = window.self !== window.top;

  function zoomed() {
    lastSourceEvent = d3.event.sourceEvent;
    translate = d3.event.translate;
    scale = d3.event.scale;
    if (!startTranslate) startTranslate = translate;
    drag = startTranslate && translate !== startTranslate;
    // check borders
    let x1 = (-1 * translate[0]) / scale;
    let x2 = x1 + widthOuter / scale;

    if (d3.event.sourceEvent != null) {
      if (x1 < 0) {
        translate[0] = 0;
      } else if (x2 > widthOuter) {
        translate[0] = (widthOuter * scale - widthOuter) * -1;
      }

      zoom.translate([translate[0], translate[1]]);

      x1 = (-1 * translate[0]) / scale;
      x2 = x1 + width / scale;
    }

    if (
      zoomedToImageScale != 0 &&
      scale > zoomedToImageScale * 0.9 &&
      !zoomedToImage &&
      selectedImage &&
      selectedImage.type == "image"
    ) {
      zoomedToImage = true;
      zoom.center(null);
      zoomedToImageScale = scale;
      hideTheRest(selectedImage);
      showDetail(selectedImage);
    }

    if (zoomedToImage && zoomedToImageScale * 0.8 > scale) {
      // console.log("clear")
      zoomedToImage = false;
      state.lastZoomed = 0;
      showAllImages();
      clearBigImages();
      detailContainer.classed("hide", true);
    }

    timeline.update(x1, x2, scale, translate, scale1);

    // toggle zoom overlays
    if (scale > zoomBarrier && !zoomBarrierState) {
      zoomBarrierState = true;
      d3.select(".tagcloud, .crossfilter").classed("hide", true);
      //d3.select(".filter").classed("hide", true);
      d3.select(".searchbar").classed("hide", true);
      d3.select(".infobar").classed("sneak", true);
      // d3.select(".filterReset").classed("hide", true);
      //d3.select(".filterReset").text("Zur Übersicht")
      // console.log("zoomBarrierState", zoomBarrierState)
    }
    if (scale < zoomBarrier && zoomBarrierState) {
      zoomBarrierState = false;
      d3.select(".tagcloud, .crossfilter").classed("hide", false);
      //d3.select(".filter").classed("hide", false);
      d3.select(".vorbesitzerinOuter").classed("hide", false);
      // d3.select(".infobar").classed("sneak", false);
      d3.select(".searchbar").classed("hide", false);
      //d3.select(".filterReset").text("Filter zurücksetzen")

      // d3.select(".filterReset").classed("hide", false);
      // console.log("zoomBarrierState", zoomBarrierState)

    }

    stage2.scale.x = d3.event.scale;
    stage2.scale.y = d3.event.scale;
    stage2.x = d3.event.translate[0];
    stage2.y = d3.event.translate[1];

    sleep = false;
  }

  function zoomstart(d) {
    zooming = true;
    startTranslate = false;
    drag = false;
    startScale = scale;
  }

  function createRect(x, y, width, height, color, alpha, targetStage) {
    const graphics = new PIXI.Graphics();

    // Set fill properties
    graphics.beginFill(color || 0xFFFFFF, alpha || 1);

    // Draw rectangle
    graphics.drawRect(x, y, width, height);

    // End fill
    graphics.endFill();

    // Add to target stage (defaulting to stage2 if none specified)
    (targetStage || stage2).addChild(graphics);

    // Wake up the renderer
    sleep = false;

    // Return the created graphics object
    return graphics;
  }


  function toScreenPoint(p) {
    const p2 = [0, 0]

    p2[0] = p[0] / scale - translate[0] / scale
    p2[1] = p[1] / scale - height - translate[1] / scale

    return p2
  }

  let debounceHash = null;
  const debounceHashTime = 400;
  let userInteraction = false;

  function zoomend() {
    if (!startTranslate) return
    
    drag = startTranslate && translate !== startTranslate;
    zooming = false;
    filterVisible();

    if (
      zoomedToImage &&
      selectedImage &&
      !selectedImage.big &&
      state.lastZoomed != selectedImage.id &&
      !state.zoomingToImage
    ) {
      loadBigImage(selectedImage, "zoom");
    }

    if (lastSourceEvent) {
      if (debounceHash) clearTimeout(debounceHash)
      debounceHash = setTimeout(function () {
        // console.log("debounceHash", userInteraction, zooming, lastSourceEvent);
        if (zooming || isInIframe) return
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);

        const idsInViewport = canvas.getView();
        // console.log("idsInViewport", idsInViewport);
        if (idsInViewport.length > 0) {
          params.set("ids", idsInViewport.join(","));
        } else if (zoomedToImage) {
          return;
        } else {
          params.delete("ids");
        }
        window.location.hash = params.toString().replaceAll("%2C", ",")
        userInteraction = true;

      }, debounceHashTime)
    }
  }


  canvas.onhashchange = function () {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);

    utils.log("onhashchange", params.toString());

    if (params.has("ids") && !userInteraction) {
      const ids = params.get("ids").split(",")
      utils.log("set setView", ids)
      // console.log("ids", ids)
      // if there is a mode in the hash and it is different from the current mode wait 300ms
      // before setting the view
      utils.log(tags.getSearchTerm(), params.get("search")+ "")
      const currentFilterWords = tags.getFilterWords ? tags.getFilterWords() : [];
      const filterStr = params.has("filter") ? params.get("filter") : "";
      // Crossfilter uses dim:value pairs separated by |, tags use comma
      const filterSep = filterStr.indexOf(":") > -1 ? "|" : ",";
      if (
        params.has("mode") && params.get("mode") !== state.mode.title ||
        params.has("filter") && filterStr !== currentFilterWords.join(filterSep) ||
        params.get("search") !== tags.getSearchTerm()
      ) {
        utils.log("delayed setView due to mode/filter/search change")
        // temp fix to avoid sticky image
        zoomedToImage = false;
        state.lastZoomed = 0;
        showAllImages();
        clearBigImages();
        // temp fix end
        setTimeout(function () {
          canvas.setView(ids)
        }, hashDelay)
      } else {
        utils.log("setView immediately")
        canvas.setView(ids)
      }
    }

    if (!params.has("ids") && scale > 1) {
      utils.log("reset zoom because no ids and scale > 1")
      canvas.resetZoom()
    }

    if (hash === "") {
      utils.log("reset")
      // reset
      canvas.removeAllCustomGraphics()
      canvas.resetZoom(function () {
        tags.reset();
        utils.setMode()
        search.reset();
        //canvas.split();
      })
      return
    }

    if (params.has("filter")) {
      const filterStr = params.get("filter");
      // Crossfilter uses dim:value pairs separated by |, tags use comma
      const filter = filterStr.indexOf(":") > -1 ? filterStr.split("|") : filterStr.split(",");
      // console.log("filter", filter)
      tags.setFilterWords(filter)
    } else {
      tags.setFilterWords([])
    }

    if (params.has("search")) {
      const searchTerm = params.get("search");
      utils.log("search term from hash", searchTerm);
      // Apply search if it's different from current search
      if (tags.getSearchTerm() !== searchTerm) {
        tags.search(searchTerm);
        // Also update the search input UI if search object exists
        if (typeof search !== 'undefined' && search.setSearchTerm) {
          search.setSearchTerm(searchTerm);
        }
      }
    } else {
      // Clear search if no search parameter in hash
      if (tags.getSearchTerm() && tags.getSearchTerm() !== "") {
        tags.search("");
        if (typeof search !== 'undefined' && search.reset) {
          search.reset();
        }
      }
    }

    if (params.has("mode")) {
      utils.setMode(params.get("mode"))
    } else {
      utils.setMode()
    }

    if (params.has("borders")) {
      setTimeout(function () {
        const borderIds = params.get("borders").split(",")
        utils.log("borders", borderIds)
        // check if borderIds are in imageBorders
        updateImageBorders(borderIds);
      }, params.has("filter") || params.has("mode") ? 2000 : 0)
    } else {
      canvas.removeAllBorders()
    }

    if (params.has("vector")) {
      const vectorVals = params.get("vector")
      utils.log("vector Hash", vectorVals)
      if (annotationVectors.toString() !== vectorVals.toString()) {
        annotationVectors = vectorVals
        canvas.drawVectors()
      }
    } else {
      canvas.removeAllVectors()
    }


    userInteraction = false;

  }

  canvas.highlight = function () {
    data.forEach(function (d, i) {
      d.alpha = d.highlight ? 1 : 0.2;
    });
    canvas.wakeup();
  };


  canvas.project = function () {
    ping();
    sleep = false;
    var scaleFactor = state.mode.type == "group" ? 0.9 : tsneScale[state.mode.title] || 0.5;
    data.forEach(function (d) {
      d.scaleFactor = scaleFactor;
      d.sprite.scale.x = d.scaleFactor;
      d.sprite.scale.y = d.scaleFactor;
      if (d.sprite2) {
        d.sprite2.scale.x = d.scaleFactor;
        d.sprite2.scale.y = d.scaleFactor;
      }
    });

    if (state.mode.type === "group") {
      canvas.split();
      cursorCutoff = (1 / scale1) * imageSize * 1;
    } else {
      canvas.projectTSNE();
      cursorCutoff = (1 / scale1) * imageSize * 1;
    }

    //canvas.resetZoom();

    zoomedToImageScale =
      (0.8 / (x.rangeBand() / columns / width)) *
      (state.mode.type === "group" ? 1 : 0.5);
  };

  canvas.projectTSNE = function () {
    var marginBottom = -height / 2.5;

    var inactive = data.filter(function (d) {
      return !d.active;
    });
    var inactiveSize = inactive.length;

    var active = data.filter(function (d) {
      return d.active;
    });

    var dimension = Math.min(width, height) * 0.8;

    inactive.forEach(function (d, i) {
      var r = dimension / 1.4 + Math.random() * 40;
      var a = -Math.PI / 2 + (i / inactiveSize) * 2 * Math.PI;

      d.x = r * Math.cos(a) + width / 2 + margin.left;
      d.y = r * Math.sin(a) + marginBottom;
    });

    active.forEach(function (d) {
      var factor = height / 2;
      var tsneEntry = tsneIndex[state.mode.title][d.id];
      if (tsneEntry) {
        d.x =
          tsneEntry[0] * dimension + width / 2 - dimension / 2 + margin.left;
        d.y = -1 * tsneEntry[1] * dimension;
      } else {
        // console.log("not found", d)
        d.alpha = 0;
        d.x = 0;
        d.y = 0;
        d.active = false;
      }
      // var tsneEntry = tsne.find(function (t) {
      //     return t.id == d.id
      // })
    });

    data.forEach(function (d) {
      d.x1 = d.x * scale1 + imageSize / 2;
      d.y1 = d.y * scale1 + imageSize / 2;

      if (d.sprite.position.x == 0) {
        d.sprite.position.x = d.x1;
        d.sprite.position.y = d.y1;
      }

      if (d.sprite2) {
        d.sprite2.position.x = d.x * scale2 + imageSize2 / 2;
        d.sprite2.position.y = d.y * scale2 + imageSize2 / 2;
      }
    });

    quadtree = Quadtree(data);
    //chart.resetZoom();
  };

  canvas.resetZoom = function (callback) {
    const duration = scale > 1 ? 1500 : 100;

    extent = d3.extent(data, function (d) {
      return d.y;
    });

    const y = -bottomPadding;

    utils.log("resetZoom", translate)

    vizContainer
      .call(zoom.translate(translate).event)
      .transition()
      .duration(duration)
      .call(zoom.translate([0, y]).scale(1).event)
      .each("end", function () {
        if (callback && scale < zoomBarrier) callback();
      })
  };

  canvas.split = function () {
    var layout = state.mode.y ? stackYLayout : stackLayout;
    var active = data.filter(function (d) {
      return d.active;
    });
    layout(active, false);
    var inactive = data.filter(function (d) {
      return !d.active;
    });
    layout(inactive, true);
    quadtree = Quadtree(data);
  };


  function filterVisible() {
    const zoomScale = scale;
    if (zoomedToImage) return;

    data.forEach(function (d, i) {
      var p = d.sprite.position;

      var x = p.x / scale1 + translate[0] / zoomScale;
      var y = p.y / scale1 + translate[1] / zoomScale;
      var padding = 2;

      if (
        x > -padding
        && x < width / zoomScale + padding
        && y + height < height / zoomScale + padding
        && y > height * -1 - padding
      ) {
        d.visible = true;
      } else {
        d.visible = false;
      }
    });

    var visible = data.filter(function (d) {
      return d.visible;
    });

    if (visible.length < 40) {
      data.forEach(function (d) {
        if (d.visible && d.loaded && d.active) d.alpha2 = 1;
        else if (d.visible && !d.loaded && d.active) loadImagesCue.push(d);
        else d.alpha2 = 0;
      });
    } else {
      data.forEach(function (d) {
        d.alpha2 = 0;
      });
    }
  }

  function loadMiddleImage(d) {
    if (d.loaded) {
      d.alpha2 = 1;
      return;
    }
    let url = "";
    if (config.loader.textures.detail.csv) {
      url = d[config.loader.textures.detail.csv];
    } else {
      url = config.loader.textures.detail.url + d.id + ".jpg";
    }

    const texture = new PIXI.Texture.from(url);
    const sprite = new PIXI.Sprite(texture);

    const update = function () {
      sleep = false;
    };

    sprite.on("added", update);
    texture.once("update", update);

    sprite.scale.x = d.scaleFactor;
    sprite.scale.y = d.scaleFactor;

    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    sprite.position.x = d.x * scale2 + imageSize2 / 2;
    sprite.position.y = d.y * scale2 + imageSize2 / 2;
    sprite._data = d;
    stage4.addChild(sprite);
    d.sprite2 = sprite;
    d.alpha2 = d.highlight;
    d.loaded = true;
    sleep = false;
  }

  function loadBigImage(d) {
    if (!config.loader.textures.big) {
      loadMiddleImage(d);
      return;
    }

    state.lastZoomed = d.id;
    const page = d.page ? "_" + d.page : "";
    let url = "";
    if (config.loader.textures.big.csv) {
      url = d[config.loader.textures.big.csv];
    } else {
      url = config.loader.textures.big.url + d.id + page + ".jpg";
    }

    const texture = new PIXI.Texture.from(url);
    const sprite = new PIXI.Sprite(texture);
    const res = config.loader.textures.big.size;

    const updateSize = function (t) {
      var size = Math.max(texture.width, texture.height);
      sprite.scale.x = sprite.scale.y = (imageSize3 / size) * d.scaleFactor;
      sleep = false;
      if (t.valid) {
        d.alpha = 0;
        d.alpha2 = 0;
      }
    };

    sprite.on("added", updateSize);
    texture.once("update", updateSize);

    if (d.imagenum) {
      sprite.on("mousemove", function (s) {
        var pos = s.data.getLocalPosition(s.currentTarget);
        s.currentTarget.cursor = pos.x > 0 ? "e-resize" : "w-resize";
      });
      sprite.on("click", function (s) {
        if (drag) return;

        s.stopPropagation();
        spriteClick = true;
        const pos = s.data.getLocalPosition(s.currentTarget);
        const dir = pos.x > 0 ? 1 : -1;
        const page = d.page + dir;
        let nextPage = page;
        if (page > d.imagenum - 1) nextPage = 0;
        if (page < 0) nextPage = d.imagenum - 1;

        canvas.changePage(d.id, nextPage);
      });
      sprite.interactive = true;
    }

    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    sprite.position.x = d.x * scale3 + imageSize3 / 2;
    sprite.position.y = d.y * scale3 + imageSize3 / 2;
    sprite._data = d;
    d.big = true;
    stage5.addChild(sprite);
    sleep = false;
  }

  function clearBigImages() {
    while (stage5.children[0]) {
      stage5.children[0]._data.big = false;
      stage5.removeChild(stage5.children[0]);
      sleep = false;
    }
  }

  function loadImages() {
    if (zooming) return;
    if (zoomedToImage) return;

    if (loadImagesCue.length) {
      const d = loadImagesCue.pop();
      if (!d.loaded) {
        loadMiddleImage(d);
      }
    }
  }



  return canvas;
}
