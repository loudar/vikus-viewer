//                            ,--.
//                ,---,   ,--/  /|               .--.--.
//        ,---.,`--.' |,---,': / '         ,--, /  /    '.
//       /__./||   :  ::   : '/ /        ,'_ /||  :  /`. /
//  ,---.;  ; |:   |  '|   '   ,    .--. |  | :;  |  |--`
// /___/ \  | ||   :  |'   |  /   ,'_ /| :  . ||  :  ;_
// \   ;  \ ' |'   '  ;|   ;  ;   |  ' | |  . . \  \    `.
//  \   \  \: ||   |  |:   '   \  |  | ' |  | |  `----.   \
//   ;   \  ' .'   :  ;|   |    ' :  | | :  ' ;  __ \  \  |
//    \   \   '|   |  ''   : |.  \|  ; ' |  | ' /  /`--'  /
//     \   `  ;'   :  ||   | '_\.':  | : ;  ; |'--'.     /
//      :   \ |;   |.' '   : |    '  :  `--'   \ `--'---'
//       '---" '---'   ;   |,'    :  ,      .-./
//                     '---'       `--`----'
//                ,---,    ,---,.           .---.    ,---,.,-.----.
//        ,---.,`--.' |  ,'  .' |          /. ./|  ,'  .' |\    /  \
//       /__./||   :  :,---.'   |      .--'.  ' ;,---.'   |;   :    \
//  ,---.;  ; |:   |  '|   |   .'     /__./ \ : ||   |   .'|   | .\ :
// /___/ \  | ||   :  |:   :  |-, .--'.  '   \' .:   :  |-,.   : |: |
// \   ;  \ ' |'   '  ;:   |  ;/|/___/ \ |    ' ':   |  ;/||   |  \ :
//  \   \  \: ||   |  ||   :   .';   \  \;      :|   :   .'|   : .  /
//   ;   \  ' .'   :  ;|   |  |-, \   ;  `      ||   |  |-,;   | |  \
//    \   \   '|   |  ''   :  ;/|  .   \    .\  ;'   :  ;/||   | ;\  \
//     \   `  ;'   :  ||   |    \   \   \   ' \ ||   |    \:   ' | \.'
//      :   \ |;   |.' |   :   .'    :   '  |--" |   :   .':   : :-'
//       '---" '---'   |   | ,'       \   \ ;    |   | ,'  |   |.'
//                     `----'          '---"     `----'    `---'

// christopher pietsch
// @chrispiecom
// 2015-2018

utils.welcome();

let data;
let tags;
let canvas;
let search;
let ping;
let timeline;
let config;

if (Modernizr.webgl && !utils.isMobile()) {
  init();
}


function init() {
  canvas = Canvas();
  search = Search();
  timeline = Timeline();
  ping = utils.ping();

  const baseUrl = utils.getDataBaseUrl();
  const makeUrl = utils.makeUrl;

  utils.log(baseUrl);

  d3.json(baseUrl.config || "data/config.json", function (config) {
    config.baseUrl = baseUrl;
    utils.initConfig(config);

    Loader(makeUrl(baseUrl.path, config.loader.timeline)).finished(function (timeline) {
      Loader(makeUrl(baseUrl.path, config.loader.items)).finished(function (data) {
        utils.log(data);

        utils.clean(data, config);
        
        if(config.filter && config.filter.type === "crossfilter") {
          tags = Crossfilter();
        } else if(config.filter && config.filter.type === "hierarchical") {
          tags = TagsHierarchical();
        } else {
          tags = Tags();
        }
        tags.init(data, config);
        search.init();
        canvas.init(data, timeline, config);

        if (config.loader.layouts) {
          initLayouts(config);
        } else {
          canvas.setMode({
            title: "Time",
            type: "group",
            groupKey: "year"
          })
        }

        const params = new URLSearchParams(window.location.hash.slice(1));
        if (params.get('ui') === '0') deactivateUI();      

        window.onhashchange = function () {
          const hash = window.location.hash.slice(1);
          const hashParams = new URLSearchParams(hash);
          if(hashParams.get('ui') === '0') deactivateUI();
          canvas.onhashchange();
        }
        
        if (params.has("filter")) {
          const filterStr = params.get("filter");
          // Crossfilter uses dim:value pairs separated by |, tags use comma
          const filter = filterStr.indexOf(":") > -1 ? filterStr.split("|") : filterStr.split(",");
          tags.setFilterWords(filter)
        }

        const idToItemsMap = new Map();
        data.forEach(d => {
          if (d.sprite) { // Ensure sprite exists
            if (!idToItemsMap.has(d.id)) {
              idToItemsMap.set(d.id, []);
            }
            idToItemsMap.get(d.id).push(d);
          }
        });

        LoaderSprites()
          .progress(function (textures) {      
            Object.keys(textures).forEach(id => {
              const items = idToItemsMap.get(id);
              if (items) {
                items.forEach(item => {
                  item.sprite.texture = textures[id];
                });
              }
            });
            canvas.wakeup();
          })
          .finished(function () {
            canvas.onhashchange();
          })
          .load(makeUrl(baseUrl.path, config.loader.textures.medium.url));
      });
    });
  });

  d3.select(window)
    .on("resize", function () {
      if (canvas !== undefined && tags !== undefined) {
        clearTimeout(window.resizedFinished);
        window.resizedFinished = setTimeout(function () {
          canvas.resize();
          tags.resize();
        }, 250);
      }
    })
    .on("keydown", function (e) {
      if (d3.event.keyCode != 27) return;
      search.reset();
      tags.reset();
      canvas.split();
      window.location.hash = "";
    });

  d3.select(".filterReset").on("click", function () {
    canvas.resetZoom(function () {
      tags.reset();
    })
  });
  d3.select(".filterReset").on("dblclick", function () {
    utils.log("dblclick");
  });

  d3.select(".slidebutton").on("click", function () {
    const s = !d3.select(".sidebar").classed("sneak");
    d3.select(".sidebar").classed("sneak", s);
  });

  d3.select(".infobutton").on("click", function () {
    const s = !d3.select(".infobar").classed("sneak");
    d3.select(".infobar").classed("sneak", s);
  });

  function deactivateUI() {
    d3.selectAll(".navi").style("display", "none");
    d3.selectAll(".searchbar").style("display", "none");
    d3.selectAll(".infobar").style("display", "none");
  }

  function initLayouts(config) {
    d3.select(".navi").classed("hide", false);

    config.loader.layouts.forEach((d, i) => {
      // legacy fix for time scales
      if (!d.type && !d.url) {
        d.type = "group"
        d.groupKey = "year"
      }
      if (d.type === "group" && i == 0) {
        canvas.setMode(d);
      } else if (d.url) {
        d3.csv(utils.makeUrl(baseUrl.path, d.url), function (tsne) {
          canvas.addTsneData(d.title, tsne, d.scale);
          if (i == 0) canvas.setMode(d);
        });
      }
    });

    if (config.loader.layouts.length == 1) {
      d3.select(".navi").classed("hide", true);
    }

    const s = d3.select(".navi").selectAll(".button").data(config.loader.layouts);
    s.enter()
      .append("div")
      .classed("button", true)
      .classed("space", (d) => d.space)
      .text((d) => d.title);

    s.on("click", function (d) { utils.setMode(d.title, interaction=true) });
    d3.selectAll(".navi .button").classed(
      "active",
      (d) => d.title == config.loader.layouts[0].title
    );
  }
}

utils.setMode = function(title, interaction = false) {
  utils.log("setMode", title);
  if(utils.config.loader.layouts === undefined) return;
  const currentMode = canvas.getMode().title;
  if(title === undefined){
    title = utils.config.loader.layouts[0].title;
  }
  if(currentMode === title) return;
  const layout = utils.config.loader.layouts.find((d) => d.title == title);
  canvas.setMode(layout);
  d3.selectAll(".navi .button").classed(
    "active",
    (d) => d.title == title
  );
  updateHash("mode", layout.title, interaction ? ["ids"] : undefined);
}

function updateHash(name, value, clear = undefined) {
  utils.log("updateHash", name, value);
  let hash = window.location.hash.slice(1);
  if(clear && clear.length === 0) hash = "";
  const params = new URLSearchParams(hash);
  if(clear && clear.length > 0) {
    clear.forEach((d) => params.delete(d));
  }

  params.set(name, value);
  // if value is an array and is empty, remove the filter
  if(typeof value === "object" && value.length === 0) params.delete(name);
  if(typeof value === "string" && value === "") params.delete(name);
  
  const newHash = params.toString().replaceAll("%2C", ",")

  if(newHash !== hash){
    window.location.hash = params.toString().replaceAll("%2C", ",")
  }
}

utils.updateHash = updateHash;

