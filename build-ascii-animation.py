#!/usr/bin/env python3
"""Extract COLORS + FRAMES from ascii-motion-animation.tsx and write ascii-animation.js"""
import re, sys

src = open("ascii-motion-animation.tsx", encoding="utf-8").read()

# Extract COLORS line
colors_match = re.search(r'const COLORS[^=]*=\s*(\[.*?\]);', src)
if not colors_match:
    sys.exit("Could not find COLORS")
colors_js = colors_match.group(1)

# Extract FRAMES line (huge single line)
frames_match = re.search(r'const FRAMES[^=]*=\s*(\[.*\]);', src)
if not frames_match:
    sys.exit("Could not find FRAMES")
frames_js = frames_match.group(1)

js = f"""(function () {{
  var COLORS = {colors_js};
  var FRAMES = {frames_js};
  var CELL_WIDTH = 10.8;
  var CELL_HEIGHT = 18;
  var FONT_SIZE = 18;
  var FONT_FAMILY = "SF Mono, Monaco, Cascadia Code, Consolas, JetBrains Mono, Fira Code, Courier New, monospace";
  var CANVAS_WIDTH = 1263.6;
  var CANVAS_HEIGHT = 1386;
  var BACKGROUND_COLOR = null; // transparent — page bg shows through

  function init(canvas) {{
    var dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = CANVAS_WIDTH + 'px';
    canvas.style.height = CANVAS_HEIGHT + 'px';

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = FONT_SIZE + 'px ' + FONT_FAMILY;
    ctx.imageSmoothingEnabled = false;

    var frameIndex = 0;
    var frameElapsed = 0;
    var lastTs = 0;
    var rafId = null;

    function drawFrame(index) {{
      var frame = FRAMES[index];
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      if (!frame) return;
      for (var i = 0; i < frame.cells.length; i++) {{
        var cell = frame.cells[i];
        var x = cell[0], y = cell[1], ch = cell[2];
        var color = COLORS[cell[3]];
        var bgColor = cell.length > 4 ? COLORS[cell[4]] : null;
        if (bgColor) {{
          ctx.fillStyle = bgColor;
          ctx.fillRect(x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
        }}
        ctx.fillStyle = color || '#ffffff';
        ctx.fillText(ch, x * CELL_WIDTH + CELL_WIDTH / 2, y * CELL_HEIGHT + CELL_HEIGHT / 2);
      }}
    }}

    drawFrame(0);

    function step(ts) {{
      if (lastTs === 0) lastTs = ts;
      var delta = ts - lastTs;
      lastTs = ts;
      frameElapsed += delta;

      var next = frameIndex;
      var dur = (FRAMES[next] && FRAMES[next].duration) || 33;
      while (frameElapsed >= dur && FRAMES.length > 0) {{
        frameElapsed -= dur;
        next = (next + 1) % FRAMES.length;
        dur = (FRAMES[next] && FRAMES[next].duration) || dur;
      }}
      frameIndex = next;
      drawFrame(frameIndex);
      rafId = requestAnimationFrame(step);
    }}

    rafId = requestAnimationFrame(step);

    // Pause when off-screen for perf
    var observer = new IntersectionObserver(function(entries) {{
      if (entries[0].isIntersecting) {{
        if (!rafId) rafId = requestAnimationFrame(step);
      }} else {{
        if (rafId) {{ cancelAnimationFrame(rafId); rafId = null; }}
      }}
    }}, {{ threshold: 0.1 }});
    observer.observe(canvas);
  }}

  document.addEventListener('DOMContentLoaded', function () {{
    var canvas = document.getElementById('ascii-animation-canvas');
    if (canvas) init(canvas);
  }});
}})();
"""

open("ascii-animation.js", "w", encoding="utf-8").write(js)
print("Written ascii-animation.js (" + str(len(js) // 1024) + " KB)")
