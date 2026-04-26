// todo: need to refactor & clean this

function Loader(url) {
  let progress = 0,
    loaded = 0,
    total = 0;

  let container, indicator;

  const loader = {};
  let finished = function () { };

  loader.finished = function (value) {
    if (!arguments.length) return finished;
    finished = value;
    return loader;
  };
  loader.progress = function () {
    total = d3.event.total == 0 ? 80333701 : d3.event.total;
    loaded = d3.event.loaded;
    progress = parseInt((loaded / total) * 100);
    indicator.style("height", progress + "%");
  };
  loader.load = function () {
    container = d3.select(".detailLoader");
    container.selectAll("div").remove();
    container.append("div").classed("label", true).text("loading");
    indicator = container.append("div").classed("indicator", true);

    d3.csv(url)
      .on("progress", loader.progress)
      .on("load", function (data) {
        finished(data);
        container.selectAll("div"); //.remove();
      })
      .on("error", function (err) {
        console.warn("error loading", url)
        finished([])
      })
      .get();
  };

  if (url) loader.load(url);
  else finished([]);

  return loader;
}

function LoaderSprites() {
  let container, indicator;

  container = d3.select(".detailLoader");
  container.selectAll("div").remove();

  container.append("div").classed("label", true).text("loading");

  indicator = container.append("div").classed("indicator", true);

  const loader = {};
  let finished = function () { };
  let progress = function () { };

  const pixiloader = new PIXI.Loader();
  pixiloader.use(pixiPackerParser(PIXI)).on("progress", function (p, r) {
    indicator.style("height", p.progress + "%");
    if (!r.textures) return;
    progress(r.textures);
  });

  loader.progress = function (value) {
    if (!arguments.length) return progress;
    progress = value;
    return loader;
  };

  loader.load = function (url) {
    pixiloader.add(url).load(function (r) {
      container.selectAll("div").remove();
    });
    pixiloader.on("complete", function (loader, resources) {
      utils.log("complete pixiloader", resources);
      finished(resources);
    });
  };

  loader.finished = function (value) {
    if (!arguments.length) return finished;
    finished = value;
    return loader;
  }

  return loader;
}

function LoaderSingleImage() {
  let container, indicator;

  container = d3.select(".detailLoader");
  container.selectAll("div").remove();

  container.append("div").classed("label", true).text("loading");

  indicator = container.append("div").classed("indicator", true);

  const loader = {};
  let finished = function () { };

  const pixiloader = new PIXI.loaders.Loader();
  pixiloader.on("progress", function (p, r) {
    indicator.style("height", p.progress + "%");
  });

  loader.load = function (url) {
    pixiloader.add(url).load(function (r, s) {
      container.selectAll("div").remove();
      finished(s[url].texture);
    });
    return loader;
  };

  loader.finished = function (value) {
    if (!arguments.length) return finished;
    finished = value;
    return loader;
  };

  return loader;
}

function LoaderBlob(url) {
  let progress = 0,
    loaded = 0,
    total = 0;

  let container, indicator;

  const loader = {};
  let finished = function () { };

  loader.finished = function (value) {
    if (!arguments.length) return finished;
    finished = value;
    return loader;
  };

  loader.progress = function () {
    total = d3.event.total == 0 ? 80333701 : d3.event.total;
    loaded = d3.event.loaded;
    progress = parseInt((loaded / total) * 100);
    indicator.style("height", progress + "%");
  };

  loader.load = function () {
    container = d3.select(".sideLoader");
    container.selectAll("div").remove();
    container.append("div").classed("label", true).text("loading hires");
    indicator = container.append("div").classed("indicator", true);

    d3.xhr(url)
      .responseType("blob")
      .on("progress", loader.progress)
      .on("load", function (req) {
        const blobUrl = window.URL.createObjectURL(req.response);
        finished(blobUrl);
        container.selectAll("div").remove();
      })
      .get();
  };

  loader.load(url);

  return loader;
}

function LoaderMultiple(url) {
  let progress = 0,
    loaded = 0,
    total = 0;

  const size = 9;
  const urls = d3.range(size + 1).map(function (d) {
    return url + d + ".gz.csv";
  });
  let index = 0;
  let itemsLoaded = 0;
  let totalProgress = 0;

  let container, indicator, label;

  const loader = {};
  let finished = function () { };

  loader.finished = function (value) {
    if (!arguments.length) return finished;
    finished = value;
    return loader;
  };

  loader.progress = function () {
    total = d3.event.total == 0 ? 8497147 : d3.event.total;
    loaded = d3.event.loaded;
    progress = parseInt((loaded / total) * 100);
    totalProgress = itemsLoaded + parseInt(progress * 1.2);
    label.text("loading " + totalProgress + " sketches");
    indicator.style("height", totalProgress / 15 + "%");
  };

  loader.load = function (url) {
    d3.csv(url)
      .on("progress", loader.progress)
      .on("load", function (data) {
        finished(data);
        itemsLoaded += data.length;
        if (index < size) {
          index++;
          loader.load(urls[index]);
        } else {
          container.remove();
        }
      })
      .get();
  };

  loader.init = function () {
    container = d3.select(".detailLoader");
    container.selectAll("div").remove();
    label = container.append("div").classed("label", true).text("loading");
    indicator = container.append("div").classed("indicator", true);
    loader.load(urls[index]);
  };

  loader.init();

  return loader;
}
